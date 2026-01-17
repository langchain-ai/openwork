import { IpcMain, BrowserWindow } from 'electron'
import { HumanMessage } from '@langchain/core/messages'
import { Command } from '@langchain/langgraph'
import { createAgentRuntime } from '../agent/runtime'
import { getThread } from '../db'
import type { HITLDecision } from '../types'

// Track active runs for cancellation
const activeRuns = new Map<string, AbortController>()

export function registerAgentHandlers(ipcMain: IpcMain): void {
  console.log('[Agent] Registering agent handlers...')

  // Handle agent invocation with streaming
  ipcMain.on(
    'agent:invoke',
    async (event, { threadId, message, modelId }: { threadId: string; message: string; modelId?: string }) => {
      const channel = `agent:stream:${threadId}`
      const window = BrowserWindow.fromWebContents(event.sender)

      console.log('[Agent] Received invoke request:', {
        threadId,
        message: message.substring(0, 50),
        modelId
      })

      if (!window) {
        console.error('[Agent] No window found')
        return
      }

      // Abort any existing stream for this thread before starting a new one
      // This prevents concurrent streams which can cause checkpoint corruption
      const existingController = activeRuns.get(threadId)
      if (existingController) {
        console.log('[Agent] Aborting existing stream for thread:', threadId)
        existingController.abort()
        activeRuns.delete(threadId)
      }

      const abortController = new AbortController()
      activeRuns.set(threadId, abortController)

      // Abort the stream if the window is closed/destroyed
      const onWindowClosed = (): void => {
        console.log('[Agent] Window closed, aborting stream for thread:', threadId)
        abortController.abort()
      }
      window.once('closed', onWindowClosed)

      try {
        // Get workspace path from thread metadata - REQUIRED
        const thread = getThread(threadId)
        const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
        const workspacePath = metadata.workspacePath as string | undefined

        if (!workspacePath) {
          window.webContents.send(channel, {
            type: 'error',
            error: 'WORKSPACE_REQUIRED',
            message: 'Please select a workspace folder before sending messages.'
          })
          return
        }

        const agent = await createAgentRuntime({ threadId, workspacePath, modelId })
        const humanMessage = new HumanMessage(message)

        // Stream with both modes:
        // - 'messages' for real-time token streaming
        // - 'values' for full state (todos, files, etc.)
        const stream = await agent.stream(
          { messages: [humanMessage] },
          {
            configurable: { thread_id: threadId },
            signal: abortController.signal,
            streamMode: ['messages', 'values'],
            recursionLimit: 1000
          }
        )

        for await (const chunk of stream) {
          if (abortController.signal.aborted) break

          // With multiple stream modes, chunks are tuples: [mode, data]
          const [mode, data] = chunk as [string, unknown]

          // Forward raw stream events - transport layer handles parsing
          // Serialize to plain objects for IPC (class instances don't transfer)
          window.webContents.send(channel, {
            type: 'stream',
            mode,
            data: JSON.parse(JSON.stringify(data))
          })
        }

        // Send done event (only if not aborted)
        if (!abortController.signal.aborted) {
          window.webContents.send(channel, { type: 'done' })
        }
      } catch (error) {
        // Ignore abort-related errors (expected when stream is cancelled)
        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('aborted') ||
            error.message.includes('Controller is already closed'))

        if (!isAbortError) {
          console.error('[Agent] Error:', error)
          window.webContents.send(channel, {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } finally {
        window.removeListener('closed', onWindowClosed)
        activeRuns.delete(threadId)
      }
    }
  )

  // Handle agent resume (after interrupt approval/rejection via useStream)
  ipcMain.on(
    'agent:resume',
    async (
      event,
      {
        threadId,
        command,
        modelId
      }: { threadId: string; command: { resume?: { decision?: string } }; modelId?: string }
    ) => {
      const channel = `agent:stream:${threadId}`
      const window = BrowserWindow.fromWebContents(event.sender)

      console.log('[Agent] Received resume request:', { threadId, command, modelId })

      if (!window) {
        console.error('[Agent] No window found for resume')
        return
      }

      // Get workspace path from thread metadata
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | undefined

      if (!workspacePath) {
        window.webContents.send(channel, {
          type: 'error',
          error: 'Workspace path is required'
        })
        return
      }

      // Abort any existing stream before resuming
      const existingController = activeRuns.get(threadId)
      if (existingController) {
        existingController.abort()
        activeRuns.delete(threadId)
      }

      const abortController = new AbortController()
      activeRuns.set(threadId, abortController)

      try {
        const agent = await createAgentRuntime({ threadId, workspacePath, modelId })
        const config = {
          configurable: { thread_id: threadId },
          signal: abortController.signal,
          streamMode: ['messages', 'values'] as const,
          recursionLimit: 1000
        }

        // Resume from checkpoint by streaming with Command containing the decision
        // The HITL middleware expects { decisions: [{ type: 'approve' | 'reject' | 'edit' }] }
        const decisionType = command?.resume?.decision || 'approve'
        const resumeValue = { decisions: [{ type: decisionType }] }
        const stream = await agent.stream(new Command({ resume: resumeValue }), config)

        for await (const chunk of stream) {
          if (abortController.signal.aborted) break

          const [mode, data] = chunk as unknown as [string, unknown]
          window.webContents.send(channel, {
            type: 'stream',
            mode,
            data: JSON.parse(JSON.stringify(data))
          })
        }

        if (!abortController.signal.aborted) {
          window.webContents.send(channel, { type: 'done' })
        }
      } catch (error) {
        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('aborted') ||
            error.message.includes('Controller is already closed'))

        if (!isAbortError) {
          console.error('[Agent] Resume error:', error)
          window.webContents.send(channel, {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } finally {
        activeRuns.delete(threadId)
      }
    }
  )

  // Handle HITL interrupt response
  ipcMain.on(
    'agent:interrupt',
    async (event, { threadId, decision }: { threadId: string; decision: HITLDecision }) => {
      const channel = `agent:stream:${threadId}`
      const window = BrowserWindow.fromWebContents(event.sender)

      if (!window) {
        console.error('[Agent] No window found for interrupt response')
        return
      }

      // Get workspace path from thread metadata - REQUIRED
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | undefined

      if (!workspacePath) {
        window.webContents.send(channel, {
          type: 'error',
          error: 'Workspace path is required'
        })
        return
      }

      // Abort any existing stream before continuing
      const existingController = activeRuns.get(threadId)
      if (existingController) {
        existingController.abort()
        activeRuns.delete(threadId)
      }

      const abortController = new AbortController()
      activeRuns.set(threadId, abortController)

      try {
        const agent = await createAgentRuntime({ threadId, workspacePath })
        const config = {
          configurable: { thread_id: threadId },
          signal: abortController.signal,
          streamMode: ['messages', 'values'] as const,
          recursionLimit: 1000
        }

        if (decision.type === 'approve') {
          // Resume execution by invoking with null (continues from checkpoint)
          const stream = await agent.stream(null, config)

          for await (const chunk of stream) {
            if (abortController.signal.aborted) break

            const [mode, data] = chunk as unknown as [string, unknown]
            window.webContents.send(channel, {
              type: 'stream',
              mode,
              data: JSON.parse(JSON.stringify(data))
            })
          }

          if (!abortController.signal.aborted) {
            window.webContents.send(channel, { type: 'done' })
          }
        } else if (decision.type === 'reject') {
          // For reject, we need to send a Command with reject decision
          // For now, just send done - the agent will see no resumption happened
          window.webContents.send(channel, { type: 'done' })
        }
        // edit case handled similarly to approve with modified args
      } catch (error) {
        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('aborted') ||
            error.message.includes('Controller is already closed'))

        if (!isAbortError) {
          console.error('[Agent] Interrupt error:', error)
          window.webContents.send(channel, {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } finally {
        activeRuns.delete(threadId)
      }
    }
  )

  // Handle cancellation
  ipcMain.handle('agent:cancel', async (_event, { threadId }: { threadId: string }) => {
    const controller = activeRuns.get(threadId)
    if (controller) {
      controller.abort()
      activeRuns.delete(threadId)
    }
  })
}
