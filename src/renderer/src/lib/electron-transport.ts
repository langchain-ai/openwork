import type { UseStreamTransport } from '@langchain/langgraph-sdk/react'
import type { StreamPayload, StreamEvent, IPCEvent } from '../../../types'

/**
 * Custom transport for useStream that uses Electron IPC instead of HTTP.
 * This allows useStream to work seamlessly in an Electron app where the
 * LangGraph agent runs in the main process.
 */
export class ElectronIPCTransport implements UseStreamTransport {
  async stream(payload: StreamPayload): Promise<AsyncGenerator<StreamEvent>> {
    // Extract thread ID from config
    const threadId = payload.config?.configurable?.thread_id
    if (!threadId) {
      return this.createErrorGenerator('MISSING_THREAD_ID', 'Thread ID is required')
    }

    // Extract the message content from input
    const input = payload.input as
      | { messages?: Array<{ content: string; type: string }> }
      | null
      | undefined
    const messages = input?.messages ?? []
    const lastHumanMessage = messages.find((m) => m.type === 'human')
    const messageContent = lastHumanMessage?.content ?? ''

    if (!messageContent) {
      return this.createErrorGenerator('MISSING_MESSAGE', 'Message content is required')
    }

    // Create an async generator that bridges IPC events
    return this.createStreamGenerator(threadId, messageContent, payload.command, payload.signal)
  }

  private async *createErrorGenerator(code: string, message: string): AsyncGenerator<StreamEvent> {
    yield {
      event: 'error',
      data: { error: code, message }
    }
  }

  private async *createStreamGenerator(
    threadId: string,
    message: string,
    command: unknown,
    signal: AbortSignal
  ): AsyncGenerator<StreamEvent> {
    // Create a queue to buffer events from IPC
    const eventQueue: StreamEvent[] = []
    let resolveNext: ((value: StreamEvent | null) => void) | null = null
    let isDone = false
    let hasError = false

    // Generate a run ID for this stream
    const runId = crypto.randomUUID()

    // Emit metadata event first to establish run context
    yield {
      event: 'metadata',
      data: {
        run_id: runId,
        thread_id: threadId
      }
    }

    // Start the stream via IPC
    const cleanup = window.api.agent.streamAgent(threadId, message, command, (ipcEvent) => {
      // Convert IPC events to SDK format
      const sdkEvents = this.convertToSDKEvents(ipcEvent as IPCEvent, threadId)

      for (const sdkEvent of sdkEvents) {
        console.log('[Transport] Converted event:', sdkEvent)

        if (sdkEvent.event === 'done' || sdkEvent.event === 'error') {
          isDone = true
          hasError = sdkEvent.event === 'error'
        }

        // If someone is waiting for the next event, resolve immediately
        if (resolveNext) {
          const resolve = resolveNext
          resolveNext = null
          resolve(sdkEvent)
        } else {
          // Otherwise queue the event
          eventQueue.push(sdkEvent)
        }
      }
    })

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup()
        isDone = true
        if (resolveNext) {
          const resolve = resolveNext
          resolveNext = null
          resolve(null)
        }
      })
    }

    // Yield events as they come in
    while (!isDone || eventQueue.length > 0) {
      // Check for queued events first
      if (eventQueue.length > 0) {
        const event = eventQueue.shift()!
        if (event.event === 'done') {
          break
        }
        if (event.event !== 'error' || hasError) {
          yield event
        }
        if (hasError) {
          break
        }
        continue
      }

      // Wait for the next event
      const event = await new Promise<StreamEvent | null>((resolve) => {
        resolveNext = resolve
      })

      if (event === null) {
        break
      }

      if (event.event === 'done') {
        break
      }

      yield event

      if (event.event === 'error') {
        break
      }
    }
  }

  /**
   * Convert IPC events to LangGraph SDK format
   * Returns an array since a single IPC event may produce multiple SDK events
   */
  private convertToSDKEvents(event: IPCEvent, threadId: string): StreamEvent[] {
    const events: StreamEvent[] = []

    switch (event.type) {
      // Token streaming for real-time typing effect
      case 'token':
        events.push({
          event: 'messages',
          data: [
            { id: event.messageId, type: 'ai', content: event.token },
            { langgraph_node: 'agent' }
          ]
        })
        break

      // Tool call chunks
      case 'tool_call':
        events.push({
          event: 'custom',
          data: {
            type: 'tool_call',
            messageId: event.messageId,
            tool_calls: event.tool_calls
          }
        })
        break

      // Full state values
      case 'values': {
        const { messages, todos, files, workspacePath, subagents, interrupt } = event.data

        // Emit complete messages
        if (messages?.length) {
          for (const msg of messages) {
            if (msg.type === 'ai' && msg.content) {
              events.push({
                event: 'custom',
                data: {
                  type: 'message',
                  message: {
                    id: msg.id,
                    type: msg.type,
                    content: msg.content,
                    tool_calls: msg.tool_calls
                  }
                }
              })
            }
          }
        }

        // Emit todos
        if (todos?.length) {
          events.push({
            event: 'custom',
            data: { type: 'todos', todos }
          })
        }

        // Emit files/workspace
        if (files) {
          const filesList = Array.isArray(files)
            ? files
            : Object.entries(files).map(([path, data]) => ({
                path,
                is_dir: false,
                size:
                  typeof (data as { content?: string })?.content === 'string'
                    ? (data as { content: string }).content.length
                    : undefined
              }))

          if (filesList.length) {
            events.push({
              event: 'custom',
              data: { type: 'workspace', files: filesList, path: workspacePath || '/' }
            })
          }
        }

        // Emit subagents
        if (subagents?.length) {
          events.push({
            event: 'custom',
            data: { type: 'subagents', subagents }
          })
        }

        // Emit interrupt
        if (interrupt) {
          events.push({
            event: 'custom',
            data: {
              type: 'interrupt',
              request: {
                id: interrupt.id || crypto.randomUUID(),
                tool_call: interrupt.tool_call,
                allowed_decisions: ['approve', 'reject', 'edit']
              }
            }
          })
        }
        break
      }

      case 'error':
        events.push({
          event: 'error',
          data: { error: 'STREAM_ERROR', message: event.error }
        })
        break

      case 'done':
        events.push({
          event: 'done',
          data: { thread_id: threadId }
        })
        break
    }

    return events
  }
}
