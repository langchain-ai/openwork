import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Send, Square, Loader2 } from 'lucide-react'
import { useStream } from '@langchain/langgraph-sdk/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { MessageBubble } from './MessageBubble'
import { ApprovalDialog } from '@/components/hitl/ApprovalDialog'
import { ElectronIPCTransport } from '@/lib/electron-transport'
import type { Message } from '@/types'

interface ChatContainerProps {
  threadId: string
}

// Define custom event data types
interface TodoEventData {
  id?: string
  content?: string
  status?: string
}

interface FileEventData {
  path: string
  is_dir?: boolean
  size?: number
}

interface SubagentEventData {
  id?: string
  name?: string
  description?: string
  status?: string
  startedAt?: Date
  completedAt?: Date
}

interface MessageEventData {
  id?: string
  type?: string
  role?: string
  content?: string
  tool_calls?: unknown[]
  created_at?: Date
}

interface CustomEventData {
  type?: string
  message?: MessageEventData
  todos?: TodoEventData[]
  files?: FileEventData[]
  path?: string
  subagents?: SubagentEventData[]
  request?: unknown
}

export function ChatContainer({ threadId }: ChatContainerProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages: storeMessages,
    pendingApproval,
    setTodos,
    setWorkspaceFiles,
    setWorkspacePath,
    setSubagents,
    setPendingApproval,
    appendMessage,
    loadThreads,
    generateTitleForFirstMessage
  } = useAppStore()

  // Create transport instance (memoized to avoid recreating)
  const transport = useMemo(() => new ElectronIPCTransport(), [])

  // Handle custom events from the stream
  const handleCustomEvent = useCallback(
    (data: CustomEventData): void => {
      console.log('[ChatContainer] Custom event:', data)
      switch (data.type) {
        case 'message':
          if (data.message) {
            const msg = data.message
            const storeMsg: Message = {
              id: msg.id || crypto.randomUUID(),
              role:
                msg.role === 'user' || msg.type === 'human'
                  ? 'user'
                  : msg.role === 'assistant' || msg.type === 'ai'
                    ? 'assistant'
                    : msg.role === 'tool' || msg.type === 'tool'
                      ? 'tool'
                      : 'system',
              content: msg.content || '',
              tool_calls: msg.tool_calls as Message['tool_calls'],
              created_at: msg.created_at ? new Date(msg.created_at) : new Date()
            }
            console.log('[ChatContainer] Adding message:', storeMsg)
            appendMessage(storeMsg)
          }
          break
        case 'todos':
          if (Array.isArray(data.todos)) {
            setTodos(
              data.todos.map((t) => ({
                id: t.id || crypto.randomUUID(),
                content: t.content || '',
                status: (t.status || 'pending') as
                  | 'pending'
                  | 'in_progress'
                  | 'completed'
                  | 'cancelled'
              }))
            )
          }
          break
        case 'workspace':
          if (Array.isArray(data.files)) {
            setWorkspaceFiles(
              data.files.map((f) => ({
                path: f.path,
                is_dir: f.is_dir,
                size: f.size
              }))
            )
          }
          if (data.path) {
            setWorkspacePath(data.path)
          }
          break
        case 'subagents':
          if (Array.isArray(data.subagents)) {
            setSubagents(
              data.subagents.map((s) => ({
                id: s.id || crypto.randomUUID(),
                name: s.name || 'Subagent',
                description: s.description || '',
                status: (s.status || 'pending') as 'pending' | 'running' | 'completed' | 'failed',
                startedAt: s.startedAt,
                completedAt: s.completedAt
              }))
            )
          }
          break
        case 'interrupt':
          if (data.request) {
            setPendingApproval(data.request as Parameters<typeof setPendingApproval>[0])
          }
          break
      }
    },
    [setTodos, setWorkspaceFiles, setWorkspacePath, setSubagents, setPendingApproval, appendMessage]
  )

  // Use the useStream hook with our custom transport
  const stream = useStream({
    transport,
    threadId,
    messagesKey: 'messages',
    onCustomEvent: (data): void => {
      handleCustomEvent(data as CustomEventData)
    },
    onError: (error): void => {
      console.error('[ChatContainer] Stream error:', error)
    }
  })
  console.log('[ChatContainer] Stream:', stream.messages)

  // Refresh threads when loading state changes from true to false (stream completed)
  const prevLoadingRef = useRef(false)
  useEffect(() => {
    if (prevLoadingRef.current && !stream.isLoading) {
      // Stream just completed
      loadThreads()
    }
    prevLoadingRef.current = stream.isLoading
  }, [stream.isLoading, loadThreads])

  // Combine store messages with streaming messages
  const displayMessages = useMemo(() => {
    // Get IDs of messages already in the store
    const storeMessageIds = new Set(storeMessages.map((m) => m.id))

    // Get streaming messages that aren't in the store yet
    const streamingMsgs: Message[] = (stream.messages || [])
      .filter((m): m is typeof m & { id: string } => !!m.id && !storeMessageIds.has(m.id))
      .map((m) => ({
        id: m.id,
        role: (m.type === 'human' ? 'user' : 'assistant') as Message['role'],
        content: typeof m.content === 'string' ? m.content : '',
        created_at: new Date()
      }))

    return [...storeMessages, ...streamingMsgs]
  }, [storeMessages, stream.messages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayMessages, stream.isLoading, threadId])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [threadId])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!input.trim() || stream.isLoading) return

    const message = input.trim()
    setInput('')

    // Check if this is the first message (for title generation)
    const isFirstMessage = storeMessages.length === 0

    // Add user message to store immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      created_at: new Date()
    }
    appendMessage(userMessage)

    // Generate title for first message
    if (isFirstMessage) {
      generateTitleForFirstMessage(threadId, message)
    }

    // Submit via useStream
    await stream.submit(
      {
        messages: [{ type: 'human', content: message }]
      },
      {
        config: {
          configurable: { thread_id: threadId }
        }
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea based on content
  const adjustTextareaHeight = (): void => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  const handleCancel = async (): Promise<void> => {
    await stream.stop()
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {displayMessages.length === 0 && !stream.isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="text-section-header mb-2">NEW THREAD</div>
                <div className="text-sm">Start a conversation with the agent</div>
              </div>
            )}

            {displayMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Streaming indicator - only show if no streaming messages yet */}
            {stream.isLoading && stream.messages.length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Agent is thinking...
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={stream.isLoading}
              className="flex-1 min-w-0 resize-none rounded-sm border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <div className="flex items-center justify-center shrink-0 h-12">
              {stream.isLoading ? (
                <Button type="button" variant="ghost" size="icon" onClick={handleCancel}>
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button type="submit" variant="default" size="icon" disabled={!input.trim()}>
                  <Send className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* HITL Approval Dialog */}
      {pendingApproval && <ApprovalDialog request={pendingApproval} />}
    </div>
  )
}
