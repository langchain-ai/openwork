import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Send, Square, Loader2, AlertCircle, X } from 'lucide-react'
import { useStream } from '@langchain/langgraph-sdk/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { MessageBubble } from './MessageBubble'
import { ModelSwitcher } from './ModelSwitcher'
import { Folder } from 'lucide-react'
import { WorkspacePicker, selectWorkspaceFolder } from './WorkspacePicker'
import { ChatTodos } from './ChatTodos'
import { ElectronIPCTransport } from '@/lib/electron-transport'
import type { Message } from '@/types'
import type { DeepAgent } from '../../../../main/agent/types'

// Type for stream values with todos
interface AgentStreamValues {
  todos?: Array<{ id?: string; content?: string; status?: string }>
}

interface ChatContainerProps {
  threadId: string
}

// Define custom event data types
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
  tool_call_id?: string
  name?: string
  created_at?: Date
}

interface CustomEventData {
  type?: string
  message?: MessageEventData
  files?: FileEventData[]
  path?: string
  subagents?: SubagentEventData[]
  request?: unknown
}

export function ChatContainer({ threadId }: ChatContainerProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const {
    messages: storeMessages,
    pendingApproval,
    todos,
    errorByThread,
    workspacePath,
    models,
    providers,
    currentModel,
    setTodos,
    setWorkspaceFiles,
    setWorkspacePath,
    setSubagents,
    setPendingApproval,
    appendMessage,
    loadThreads,
    generateTitleForFirstMessage,
    setLoadingThreadId,
    setThreadError,
    clearThreadError
  } = useAppStore()

  // Check if we have a valid, usable model configured
  // Use models.length === 0 as a proxy for "still loading" to avoid subscribing to modelsLoading
  const isInitialLoad = models.length === 0 && providers.length === 0

  // Check for custom provider deployment format: {providerId}:deployment
  const isCustomDeployment = currentModel?.endsWith(':deployment')
  const customProviderId = isCustomDeployment ? currentModel.replace(':deployment', '') : null
  const customProvider = customProviderId ? providers.find((p) => p.id === customProviderId) : null

  const selectedModel = models.find((m) => m.id === currentModel)
  const currentModelProvider = selectedModel
    ? providers.find((p) => p.id === selectedModel.provider)
    : customProvider

  // While loading, assume we might have a valid model (prevents flash)
  // Valid if: regular model with API key OR custom deployment with API key
  const hasValidModel =
    isInitialLoad ||
    !!(selectedModel && currentModelProvider?.hasApiKey) ||
    !!(customProvider && customProvider.hasApiKey)

  // Get error for current thread
  const threadError = errorByThread[threadId] || null

  // Debug: log pendingApproval state (moved detailed log after displayMessages)

  // Create transport instance (memoized to avoid recreating)
  const transport = useMemo(() => new ElectronIPCTransport(), [])

  // Handle custom events from the stream
  const handleCustomEvent = useCallback(
    (data: CustomEventData): void => {
      switch (data.type) {
        case 'message':
          if (data.message) {
            const msg = data.message
            const isTool = msg.role === 'tool' || msg.type === 'tool'
            const storeMsg: Message = {
              id: msg.id || crypto.randomUUID(),
              role:
                msg.role === 'user' || msg.type === 'human'
                  ? 'user'
                  : msg.role === 'assistant' || msg.type === 'ai'
                    ? 'assistant'
                    : isTool
                      ? 'tool'
                      : 'system',
              content: msg.content || '',
              tool_calls: msg.tool_calls as Message['tool_calls'],
              // Include tool_call_id and name for tool messages
              ...(isTool && msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
              ...(isTool && msg.name && { name: msg.name }),
              created_at: msg.created_at ? new Date(msg.created_at) : new Date()
            }
            appendMessage(storeMsg)
          }
          break
        case 'workspace':
          if (Array.isArray(data.files)) {
            // Merge incoming files with existing files (keyed by path)
            setWorkspaceFiles((prevFiles) => {
              const fileMap = new Map(prevFiles.map((f) => [f.path, f]))
              for (const f of data.files!) {
                fileMap.set(f.path, {
                  path: f.path,
                  is_dir: f.is_dir,
                  size: f.size
                })
              }
              return Array.from(fileMap.values())
            })
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
    [setWorkspaceFiles, setWorkspacePath, setSubagents, setPendingApproval, appendMessage]
  )

  // Use the useStream hook with our custom transport
  const stream = useStream<DeepAgent>({
    transport,
    threadId,
    messagesKey: 'messages',
    onCustomEvent: (data): void => {
      handleCustomEvent(data as CustomEventData)
    },
    onError: (error): void => {
      console.error('[ChatContainer] Stream error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setThreadError(threadId, errorMessage)
    }
  })

  // Handle approval decision - use stream.submit with resume command
  const handleApprovalDecision = useCallback(
    async (decision: 'approve' | 'reject' | 'edit') => {
      if (!pendingApproval) return

      // Clear pending approval first
      setPendingApproval(null)

      // Submit with a resume command - the transport will send to agent:resume
      try {
        await stream.submit(
          null, // No message needed for resume
          { command: { resume: { decision } } }
        )
      } catch (err) {
        console.error('[ChatContainer] Resume command failed:', err)
      }
    },
    [pendingApproval, setPendingApproval, stream]
  )

  // Sync todos from stream state
  const agentValues = stream.values as AgentStreamValues | undefined
  const streamTodos = agentValues?.todos
  useEffect(() => {
    if (Array.isArray(streamTodos)) {
      setTodos(
        streamTodos.map((t) => ({
          id: t.id || crypto.randomUUID(),
          content: t.content || '',
          status: (t.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'cancelled'
        }))
      )
    }
  }, [streamTodos, setTodos])

  // Sync loading state to store for sidebar indicator
  useEffect(() => {
    setLoadingThreadId(stream.isLoading ? threadId : null)
    return () => {
      // Clean up on unmount
      setLoadingThreadId(null)
    }
  }, [stream.isLoading, threadId, setLoadingThreadId])

  // Track the last seen error to detect when a NEW error occurs
  // This prevents stale errors from being synced when switching threads
  const lastErrorRef = useRef<unknown>(null)

  // Sync stream error state to store (in case useStream exposes error directly)
  useEffect(() => {
    // Only sync if this is a genuinely new error (not a stale one from thread switch)
    const isNewError = stream.error && stream.error !== lastErrorRef.current

    if (isNewError) {
      // This is a new error - record it and sync to the current thread
      lastErrorRef.current = stream.error
      const errorMessage =
        stream.error instanceof Error ? stream.error.message : String(stream.error)
      setThreadError(threadId, errorMessage)
    } else if (!stream.error) {
      // Error cleared - reset tracking
      lastErrorRef.current = null
    }
    // Note: If stream.error exists but equals lastErrorRef (stale error after thread switch),
    // we intentionally don't sync it to the new thread
  }, [stream.error, threadId, setThreadError])

  // Persist messages and refresh threads when stream completes
  const prevLoadingRef = useRef(false)
  useEffect(() => {
    if (prevLoadingRef.current && !stream.isLoading) {
      // Stream just completed - persist streaming messages to store
      const streamMsgs = stream.messages || []
      for (const msg of streamMsgs) {
        if (msg.id) {
          const streamMsg = msg as {
            id: string
            type?: string
            content?: string | unknown[]
            tool_calls?: Message['tool_calls']
            tool_call_id?: string
            name?: string
          }

          let role: Message['role'] = 'assistant'
          if (streamMsg.type === 'human') role = 'user'
          else if (streamMsg.type === 'tool') role = 'tool'
          else if (streamMsg.type === 'ai') role = 'assistant'

          const storeMsg: Message = {
            id: streamMsg.id,
            role,
            content: typeof streamMsg.content === 'string' ? streamMsg.content : '',
            tool_calls: streamMsg.tool_calls,
            // Include tool_call_id and name for tool messages
            ...(role === 'tool' &&
              streamMsg.tool_call_id && { tool_call_id: streamMsg.tool_call_id }),
            ...(role === 'tool' && streamMsg.name && { name: streamMsg.name }),
            created_at: new Date()
          }
          appendMessage(storeMsg)
        }
      }
      loadThreads()
    }
    prevLoadingRef.current = stream.isLoading
  }, [stream.isLoading, stream.messages, loadThreads, appendMessage])

  // Combine store messages with streaming messages
  const displayMessages = useMemo(() => {
    // Get IDs of messages already in the store
    const storeMessageIds = new Set(storeMessages.map((m) => m.id))

    // Get streaming messages that aren't in the store yet
    const streamingMsgs: Message[] = (stream.messages || [])
      .filter((m): m is typeof m & { id: string } => !!m.id && !storeMessageIds.has(m.id))
      .map((m) => {
        // Determine role from message type
        const streamMsg = m as {
          id: string
          type?: string
          content?: string | unknown[]
          tool_calls?: Message['tool_calls']
          tool_call_id?: string
          name?: string
        }

        let role: Message['role'] = 'assistant'
        if (streamMsg.type === 'human') role = 'user'
        else if (streamMsg.type === 'tool') role = 'tool'
        else if (streamMsg.type === 'ai') role = 'assistant'

        return {
          id: streamMsg.id,
          role,
          content: typeof streamMsg.content === 'string' ? streamMsg.content : '',
          tool_calls: streamMsg.tool_calls,
          // Include tool_call_id and name for tool messages
          ...(role === 'tool' &&
            streamMsg.tool_call_id && { tool_call_id: streamMsg.tool_call_id }),
          ...(role === 'tool' && streamMsg.name && { name: streamMsg.name }),
          created_at: new Date()
        }
      })

    return [...storeMessages, ...streamingMsgs]
  }, [storeMessages, stream.messages])

  // Build tool results map from tool messages
  const toolResults = useMemo(() => {
    const results = new Map<string, { content: string | unknown; is_error?: boolean }>()
    for (const msg of displayMessages) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        results.set(msg.tool_call_id, {
          content: msg.content,
          is_error: false // Could be enhanced to track errors
        })
      }
    }
    return results
  }, [displayMessages])

  // Get the actual scrollable viewport element from Radix ScrollArea
  const getViewport = useCallback(() => {
    return scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null
  }, [])

  // Track scroll position to determine if user is at bottom
  const handleScroll = useCallback(() => {
    const viewport = getViewport()
    if (!viewport) return

    const { scrollTop, scrollHeight, clientHeight } = viewport
    // Consider "at bottom" if within 50px of the bottom
    const threshold = 50
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold
  }, [getViewport])

  // Attach scroll listener to viewport
  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return

    viewport.addEventListener('scroll', handleScroll)
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [getViewport, handleScroll])

  // Auto-scroll on new messages only if already at bottom
  useEffect(() => {
    const viewport = getViewport()
    if (viewport && isAtBottomRef.current) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [displayMessages, stream.isLoading, getViewport])

  // Always scroll to bottom when switching threads
  useEffect(() => {
    const viewport = getViewport()
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
      isAtBottomRef.current = true
    }
  }, [threadId, getViewport])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [threadId])

  const handleDismissError = (): void => {
    clearThreadError(threadId)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!input.trim() || stream.isLoading || !hasValidModel) return

    // Check if workspace is selected
    if (!workspacePath) {
      setThreadError(threadId, 'Please select a workspace folder before sending messages.')
      return
    }

    // Clear any previous error when submitting a new message
    if (threadError) {
      clearThreadError(threadId)
    }

    // Clear any pending approval from previous turns
    if (pendingApproval) {
      setPendingApproval(null)
    }

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

  const handleSelectWorkspaceFromEmptyState = async (): Promise<void> => {
    await selectWorkspaceFolder(threadId, setWorkspacePath, setWorkspaceFiles, () => {}, undefined)
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
                {workspacePath ? (
                  <div className="text-sm">Start a conversation with the agent</div>
                ) : (
                  <div className="text-sm text-center space-y-3">
                    <div>
                      <span className="text-amber-500">Select a workspace folder</span>
                      <span className="block text-xs mt-1 opacity-75">
                        The agent needs a workspace to create and modify files
                      </span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 h-7 text-xs gap-1.5 text-amber-500 hover:bg-accent/50 transition-color duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSelectWorkspaceFromEmptyState}
                    >
                      <Folder className="size-3.5" />
                      <span className="max-w-[120px] truncate">Select workspace</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                toolResults={toolResults}
                pendingApproval={pendingApproval}
                onApprovalDecision={handleApprovalDecision}
              />
            ))}

            {/* Streaming indicator and inline TODOs */}
            {stream.isLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Agent is thinking...
                </div>
                {todos.length > 0 && <ChatTodos todos={todos} />}
              </div>
            )}

            {/* Error state */}
            {threadError && !stream.isLoading && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-destructive text-sm">Agent Error</div>
                  <div className="text-sm text-muted-foreground mt-1 break-words">
                    {threadError}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    You can try sending a new message to continue the conversation.
                  </div>
                </div>
                <button
                  onClick={handleDismissError}
                  className="shrink-0 rounded p-1 hover:bg-destructive/20 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasValidModel ? 'Message...' : 'Configure a model to start...'}
                disabled={stream.isLoading || !hasValidModel}
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
                  <Button
                    type="submit"
                    variant="default"
                    size="icon"
                    disabled={!input.trim() || !hasValidModel}
                    className="rounded-md"
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModelSwitcher />
              <div className="w-px h-4 bg-border" />
              <WorkspacePicker />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
