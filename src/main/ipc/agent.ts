import { IpcMain, BrowserWindow } from 'electron'
import { HumanMessage } from '@langchain/core/messages'
import { createAgentRuntime } from '../agent/runtime'
import type { HITLDecision, StreamEvent } from '../types'

// Track active runs for cancellation
const activeRuns = new Map<string, AbortController>()

export function registerAgentHandlers(ipcMain: IpcMain) {
  console.log('[Agent] Registering agent handlers...')
  
  // Handle agent invocation with streaming
  ipcMain.on('agent:invoke', async (event, { threadId, message }: { threadId: string; message: string }) => {
    const channel = `agent:stream:${threadId}`
    const window = BrowserWindow.fromWebContents(event.sender)
    
    console.log('[Agent] Received invoke request:', { threadId, message: message.substring(0, 50) })
    
    if (!window) {
      console.error('[Agent] No window found')
      return
    }

    const abortController = new AbortController()
    activeRuns.set(threadId, abortController)

    try {
      console.log('[Agent] Creating runtime...')
      const agent = await createAgentRuntime()
      console.log('[Agent] Runtime created, starting stream...')
      
      // Create proper HumanMessage
      const humanMessage = new HumanMessage(message)
      
      // Track seen message IDs to avoid duplicates
      const seenMessageIds = new Set<string>()
      
      // Stream with values mode to get full state after each step
      // Note: 'messages' mode was causing tool call corruption, so we stick with 'values'
      const stream = await agent.stream(
        { messages: [humanMessage] },
        { 
          configurable: { thread_id: threadId },
          signal: abortController.signal,
          streamMode: 'values'
        }
      )
      console.log('[Agent] Stream started with streamMode: values')

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = chunk as any
        console.log('[Agent] Chunk keys:', Object.keys(state || {}))
        
        // Process messages from state
        if (state.messages && Array.isArray(state.messages)) {
          for (const msg of state.messages) {
            const msgId = msg.id || crypto.randomUUID()
            
            // Skip if we've already sent this message
            if (seenMessageIds.has(msgId)) continue
            
            // Determine the role from the message type
            let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant'
            if (typeof msg._getType === 'function') {
              const msgType = msg._getType()
              if (msgType === 'human') role = 'user'
              else if (msgType === 'ai') role = 'assistant'
              else if (msgType === 'system') role = 'system'
              else if (msgType === 'tool') role = 'tool'
            }
            
            // Extract content
            let content: string = ''
            if (typeof msg.content === 'string') {
              content = msg.content
            } else if (Array.isArray(msg.content)) {
              content = msg.content
                .filter((block: { type?: string }) => block.type === 'text')
                .map((block: { text?: string }) => block.text || '')
                .join('')
            }
            
            // Only send assistant messages with content
            if (role === 'assistant' && content) {
              seenMessageIds.add(msgId)
              
              const streamEvent: StreamEvent = {
                type: 'message',
                message: {
                  id: msgId,
                  role,
                  content,
                  tool_calls: msg.tool_calls,
                  created_at: new Date()
                }
              }
              window.webContents.send(channel, streamEvent)
              console.log('[Agent] Sent message:', msgId.substring(0, 20))
            }
          }
        }
        
        // Check for todos in agent state
        if (state.todos && Array.isArray(state.todos)) {
          const todosEvent: StreamEvent = {
            type: 'todos',
            todos: (state.todos as Array<{ id?: string; content?: string; status?: string }>).map((t) => ({
              id: t.id || crypto.randomUUID(),
              content: t.content || '',
              status: (t.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'cancelled'
            }))
          }
          window.webContents.send(channel, todosEvent)
        }

        // Check for workspace/file state
        // deepagents stores files as Record<string, FileData> (object keyed by path)
        const filesObj = state.files as Record<string, { content?: string; lastModified?: number }> | undefined
        const workspacePath = (state.workspacePath as string) || process.cwd()
        
        if (filesObj && typeof filesObj === 'object' && !Array.isArray(filesObj)) {
          // Convert object format to array format
          const files = Object.entries(filesObj).map(([filePath, data]) => ({
            path: filePath,
            is_dir: false,
            size: typeof data?.content === 'string' ? data.content.length : undefined
          }))
          
          if (files.length > 0) {
            console.log('[Agent] Sending workspace event with', files.length, 'files')
            const workspaceEvent: StreamEvent = {
              type: 'workspace',
              files,
              path: workspacePath
            }
            window.webContents.send(channel, workspaceEvent)
          }
        } else if (Array.isArray(filesObj)) {
          // Handle legacy array format if present
          const files = (filesObj as Array<{ path: string; is_dir?: boolean; size?: number }>)
          if (files.length > 0) {
            const workspaceEvent: StreamEvent = {
              type: 'workspace',
              files: files.map((f) => ({
                path: f.path,
                is_dir: f.is_dir,
                size: f.size
              })),
              path: workspacePath
            }
            window.webContents.send(channel, workspaceEvent)
          }
        }

        // Check for subagents in agent state
        const subagentsRaw = state.subagents as Array<{
          id?: string
          name?: string
          type?: string
          description?: string
          status?: string
          startedAt?: Date | string
          completedAt?: Date | string
        }> | undefined
        
        if (subagentsRaw && Array.isArray(subagentsRaw) && subagentsRaw.length > 0) {
          console.log('[Agent] Sending subagents event with', subagentsRaw.length, 'subagents')
          const subagentsEvent: StreamEvent = {
            type: 'subagents',
            subagents: subagentsRaw.map((s) => ({
              id: s.id || crypto.randomUUID(),
              name: s.name || s.type || 'Subagent',
              description: s.description || '',
              status: (s.status || 'pending') as 'pending' | 'running' | 'completed' | 'failed',
              startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
              completedAt: s.completedAt ? new Date(s.completedAt) : undefined
            }))
          }
          window.webContents.send(channel, subagentsEvent)
        }

        // Check for interrupts (HITL)
        const interrupt = state.__interrupt__ as { id?: string; tool_call?: unknown } | undefined
        if (interrupt) {
          const streamEvent: StreamEvent = {
            type: 'interrupt',
            request: {
              id: interrupt.id || crypto.randomUUID(),
              tool_call: interrupt.tool_call as { id: string; name: string; args: Record<string, unknown> },
              allowed_decisions: ['approve', 'reject', 'edit']
            }
          }
          window.webContents.send(channel, streamEvent)
        }
      }

      // Send done event
      console.log('[Agent] Stream complete, sending done event')
      const doneEvent: StreamEvent = { type: 'done', result: null }
      window.webContents.send(channel, doneEvent)

    } catch (error) {
      console.error('[Agent] Error:', error)
      const errorEvent: StreamEvent = { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
      window.webContents.send(channel, errorEvent)
    } finally {
      activeRuns.delete(threadId)
    }
  })

  // Handle HITL interrupt response
  ipcMain.handle('agent:interrupt', async (_event, { threadId, decision }: { threadId: string; decision: HITLDecision }) => {
    const agent = await createAgentRuntime()
    
    // Get the current state
    const config = { configurable: { thread_id: threadId } }
    
    // Resume with the decision
    if (decision.type === 'approve') {
      // Continue execution
      await agent.invoke(null, config)
    } else if (decision.type === 'reject') {
      // Cancel the tool call
      // The agent will handle this via Command
    } else if (decision.type === 'edit') {
      // Update the tool call args and continue
      // This requires updating state before resuming
    }
  })

  // Handle cancellation
  ipcMain.handle('agent:cancel', async (_event, { threadId }: { threadId: string }) => {
    const controller = activeRuns.get(threadId)
    if (controller) {
      controller.abort()
      activeRuns.delete(threadId)
    }
  })
}
