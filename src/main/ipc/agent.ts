import { IpcMain, BrowserWindow } from 'electron'
import { HumanMessage, BaseMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages'
import { createAgentRuntime } from '../agent/runtime'
import type { HITLDecision } from '../types'

// Track active runs for cancellation
const activeRuns = new Map<string, AbortController>()

/**
 * Serialize a LangChain message to a plain object for IPC
 */
function serializeMessage(msg: BaseMessage): {
  id: string
  type: 'human' | 'ai' | 'tool' | 'system'
  content: string
  tool_calls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
} {
  // Extract content as string
  let content = ''
  if (typeof msg.content === 'string') {
    content = msg.content
  } else if (Array.isArray(msg.content)) {
    content = msg.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
  }

  // Map LangChain message types
  const type =
    msg.type === 'human'
      ? 'human'
      : msg.type === 'ai'
        ? 'ai'
        : msg.type === 'tool'
          ? 'tool'
          : 'system'

  // Extract tool calls from AI messages
  const toolCalls =
    msg instanceof AIMessage && msg.tool_calls?.length
      ? msg.tool_calls.map((tc) => ({
          id: tc.id || crypto.randomUUID(),
          name: tc.name,
          args: tc.args as Record<string, unknown>
        }))
      : undefined

  return {
    id: msg.id || crypto.randomUUID(),
    type,
    content,
    tool_calls: toolCalls
  }
}

export function registerAgentHandlers(ipcMain: IpcMain): void {
  console.log('[Agent] Registering agent handlers...')

  // Handle agent invocation with streaming
  ipcMain.on(
    'agent:invoke',
    async (event, { threadId, message }: { threadId: string; message: string }) => {
      const channel = `agent:stream:${threadId}`
      const window = BrowserWindow.fromWebContents(event.sender)

      console.log('[Agent] Received invoke request:', {
        threadId,
        message: message.substring(0, 50)
      })

      if (!window) {
        console.error('[Agent] No window found')
        return
      }

      const abortController = new AbortController()
      activeRuns.set(threadId, abortController)

      try {
        const agent = await createAgentRuntime()
        const humanMessage = new HumanMessage(message)

        // Track state for deduplication
        const seenMessageIds = new Set<string>()
        let currentMessageId: string | null = null

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

          if (mode === 'messages') {
            // Messages mode returns [message, metadata] tuples
            const [msgChunk, metadata] = data as [AIMessageChunk, { langgraph_node?: string }]
            console.log('[Agent] Message chunk:', {
              type: msgChunk?.constructor?.name,
              node: metadata?.langgraph_node
            })

            // Process AI message chunks (from any node that produces AI messages)
            if (msgChunk instanceof AIMessageChunk) {
              const content =
                typeof msgChunk.content === 'string'
                  ? msgChunk.content
                  : Array.isArray(msgChunk.content)
                    ? msgChunk.content
                        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
                        .map((b) => b.text)
                        .join('')
                    : ''

              if (content) {
                // Track message ID for grouping tokens
                const msgId = msgChunk.id || currentMessageId || crypto.randomUUID()
                currentMessageId = msgId

                console.log('[Agent] Sending token:', content.substring(0, 50))
                window.webContents.send(channel, {
                  type: 'token',
                  messageId: msgId,
                  token: content
                })
              }

              // Handle tool calls in the chunk
              if (msgChunk.tool_call_chunks?.length) {
                window.webContents.send(channel, {
                  type: 'tool_call',
                  messageId: currentMessageId,
                  tool_calls: msgChunk.tool_call_chunks
                })
              }
            }
          } else if (mode === 'values') {
            // Values mode returns the full state
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const state = data as any

            // Send complete messages (for final state)
            const messages = (state.messages as BaseMessage[] | undefined)
              ?.filter((msg) => {
                const id = msg.id || ''
                if (seenMessageIds.has(id)) return false
                if (msg.type === 'ai' && msg.content) {
                  seenMessageIds.add(id)
                  return true
                }
                return false
              })
              .map(serializeMessage)

            // Reset current message ID when we get a complete message
            if (messages?.length) {
              currentMessageId = null
            }

            window.webContents.send(channel, {
              type: 'values',
              data: {
                messages,
                todos: state.todos,
                files: state.files,
                workspacePath: state.workspacePath,
                subagents: state.subagents,
                interrupt: state.__interrupt__
              }
            })
          }
        }

        // Send done event
        window.webContents.send(channel, { type: 'done' })
      } catch (error) {
        console.error('[Agent] Error:', error)
        window.webContents.send(channel, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        activeRuns.delete(threadId)
      }
    }
  )

  // Handle HITL interrupt response
  ipcMain.handle(
    'agent:interrupt',
    async (_event, { threadId, decision }: { threadId: string; decision: HITLDecision }) => {
      const agent = await createAgentRuntime()
      const config = { configurable: { thread_id: threadId } }

      if (decision.type === 'approve') {
        await agent.invoke(null, config)
      }
      // reject and edit handled by Command in future
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
