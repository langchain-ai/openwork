import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useSyncExternalStore,
  type ReactNode
} from 'react'

/* eslint-disable react-refresh/only-export-components */
import { useStream } from '@langchain/langgraph-sdk/react'
import { ElectronIPCTransport } from './electron-transport'
import type { Message, Todo, FileInfo, Subagent, HITLRequest } from '@/types'
import type { DeepAgent } from '../../../main/agent/types'

// Open file tab type
export interface OpenFile {
  path: string
  name: string
}

// Token usage tracking for context window monitoring
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
  lastUpdated: Date
}

// Per-thread state (persisted/restored from checkpoints)
export interface ThreadState {
  messages: Message[]
  todos: Todo[]
  workspaceFiles: FileInfo[]
  workspacePath: string | null
  subagents: Subagent[]
  pendingApproval: HITLRequest | null
  error: string | null
  currentModel: string
  openFiles: OpenFile[]
  activeTab: 'agent' | string
  fileContents: Record<string, string>
  tokenUsage: TokenUsage | null
}

// Stream instance type
type StreamInstance = ReturnType<typeof useStream<DeepAgent>>

// Stream data that we want to be reactive
interface StreamData {
  messages: StreamInstance['messages']
  isLoading: boolean
  stream: StreamInstance | null
}

// Actions available on a thread
export interface ThreadActions {
  appendMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setTodos: (todos: Todo[]) => void
  setWorkspaceFiles: (files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => void
  setWorkspacePath: (path: string | null) => void
  setSubagents: (subagents: Subagent[]) => void
  setPendingApproval: (request: HITLRequest | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCurrentModel: (modelId: string) => void
  openFile: (path: string, name: string) => void
  closeFile: (path: string) => void
  setActiveTab: (tab: 'agent' | string) => void
  setFileContents: (path: string, content: string) => void
}

// Context value
interface ThreadContextValue {
  getThreadState: (threadId: string) => ThreadState
  getThreadActions: (threadId: string) => ThreadActions
  initializeThread: (threadId: string) => void
  cleanupThread: (threadId: string) => void
  // Stream subscription
  subscribeToStream: (threadId: string, callback: () => void) => () => void
  getStreamData: (threadId: string) => StreamData
}

// Default thread state
const createDefaultThreadState = (): ThreadState => ({
  messages: [],
  todos: [],
  workspaceFiles: [],
  workspacePath: null,
  subagents: [],
  pendingApproval: null,
  error: null,
  currentModel: 'claude-sonnet-4-5-20250929',
  openFiles: [],
  activeTab: 'agent',
  fileContents: {},
  tokenUsage: null
})

const defaultStreamData: StreamData = {
  messages: [],
  isLoading: false,
  stream: null
}

const ThreadContext = createContext<ThreadContextValue | null>(null)

// Custom event types from the stream
interface CustomEventData {
  type?: string
  request?: HITLRequest
  files?: Array<{ path: string; is_dir?: boolean; size?: number }>
  path?: string
  subagents?: Array<{
    id?: string
    name?: string
    description?: string
    status?: string
    startedAt?: Date
    completedAt?: Date
  }>
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
  }
}

// Component that holds a stream and notifies subscribers
function ThreadStreamHolder({
  threadId,
  onStreamUpdate,
  onCustomEvent,
  onError
}: {
  threadId: string
  onStreamUpdate: (data: StreamData) => void
  onCustomEvent: (data: CustomEventData) => void
  onError: (error: Error) => void
}): null {
  const transport = useMemo(() => new ElectronIPCTransport(), [])

  // Use refs to avoid stale closures
  const onCustomEventRef = useRef(onCustomEvent)
  useEffect(() => {
    onCustomEventRef.current = onCustomEvent
  })

  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  const stream = useStream<DeepAgent>({
    transport,
    threadId,
    messagesKey: 'messages',
    onCustomEvent: (data) => {
      onCustomEventRef.current(data as CustomEventData)
    },
    onError: (error: unknown) => {
      onErrorRef.current(error instanceof Error ? error : new Error(String(error)))
    }
  })

  // Notify parent whenever stream data changes
  // Use refs to avoid stale closures and ensure we always have latest callback
  const onStreamUpdateRef = useRef(onStreamUpdate)
  useEffect(() => {
    onStreamUpdateRef.current = onStreamUpdate
  })

  // Track previous values to detect actual changes
  const prevMessagesRef = useRef(stream.messages)
  const prevIsLoadingRef = useRef(stream.isLoading)

  // Always sync on mount and when values actually change
  useEffect(() => {
    const messagesChanged = prevMessagesRef.current !== stream.messages
    const loadingChanged = prevIsLoadingRef.current !== stream.isLoading

    if (messagesChanged || loadingChanged || !prevMessagesRef.current) {
      prevMessagesRef.current = stream.messages
      prevIsLoadingRef.current = stream.isLoading

      onStreamUpdateRef.current({
        messages: stream.messages,
        isLoading: stream.isLoading,
        stream
      })
    }
  })

  // Also sync immediately when stream instance changes
  useEffect(() => {
    onStreamUpdateRef.current({
      messages: stream.messages,
      isLoading: stream.isLoading,
      stream
    })
  }, [stream])

  return null
}

export function ThreadProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [threadStates, setThreadStates] = useState<Record<string, ThreadState>>({})
  const [activeThreadIds, setActiveThreadIds] = useState<Set<string>>(new Set())
  const initializedThreadsRef = useRef<Set<string>>(new Set())
  const actionsCache = useRef<Record<string, ThreadActions>>({})

  // Stream data store (not React state - we use subscriptions)
  const streamDataRef = useRef<Record<string, StreamData>>({})
  const streamSubscribersRef = useRef<Record<string, Set<() => void>>>({})

  // Notify subscribers for a thread
  const notifyStreamSubscribers = useCallback((threadId: string) => {
    const subscribers = streamSubscribersRef.current[threadId]
    if (subscribers) {
      subscribers.forEach((callback) => callback())
    }
  }, [])

  // Handle stream updates from ThreadStreamHolder
  const handleStreamUpdate = useCallback(
    (threadId: string, data: StreamData) => {
      streamDataRef.current[threadId] = data
      notifyStreamSubscribers(threadId)
    },
    [notifyStreamSubscribers]
  )

  // Subscribe to stream updates for a thread
  const subscribeToStream = useCallback((threadId: string, callback: () => void) => {
    if (!streamSubscribersRef.current[threadId]) {
      streamSubscribersRef.current[threadId] = new Set()
    }
    streamSubscribersRef.current[threadId].add(callback)

    return () => {
      streamSubscribersRef.current[threadId]?.delete(callback)
    }
  }, [])

  // Get current stream data for a thread
  const getStreamData = useCallback((threadId: string): StreamData => {
    return streamDataRef.current[threadId] || defaultStreamData
  }, [])

  const getThreadState = useCallback(
    (threadId: string): ThreadState => {
      const state = threadStates[threadId] || createDefaultThreadState()
      if (state.pendingApproval) {
        console.log('[ThreadContext] getThreadState returning pendingApproval for:', threadId, state.pendingApproval)
      }
      return state
    },
    [threadStates]
  )

  const updateThreadState = useCallback(
    (threadId: string, updater: (prev: ThreadState) => Partial<ThreadState>) => {
      setThreadStates((prev) => {
        const currentState = prev[threadId] || createDefaultThreadState()
        const updates = updater(currentState)
        return {
          ...prev,
          [threadId]: { ...currentState, ...updates }
        }
      })
    },
    []
  )

  // Parse error messages into user-friendly format
  const parseErrorMessage = useCallback((error: Error | string): string => {
    const errorMessage = typeof error === 'string' ? error : error.message

    // Check for context window exceeded errors
    const contextWindowMatch = errorMessage.match(/prompt is too long: (\d+) tokens > (\d+) maximum/i)
    if (contextWindowMatch) {
      const [, usedTokens, maxTokens] = contextWindowMatch
      const usedK = Math.round(parseInt(usedTokens) / 1000)
      const maxK = Math.round(parseInt(maxTokens) / 1000)
      return `Context window exceeded (${usedK}K / ${maxK}K tokens). The conversation history is too long. Please start a new thread to continue.`
    }

    // Check for rate limit errors
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return 'Rate limit exceeded. Please wait a moment before sending another message.'
    }

    // Check for authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key') || errorMessage.includes('authentication')) {
      return 'Authentication failed. Please check your API key in settings.'
    }

    // Return the original message for other errors
    return errorMessage
  }, [])

  // Handle errors from ThreadStreamHolder
  const handleError = useCallback(
    (threadId: string, error: Error) => {
      console.error('[ThreadContext] Stream error:', { threadId, error })
      const userFriendlyMessage = parseErrorMessage(error)
      updateThreadState(threadId, () => ({ error: userFriendlyMessage }))
    },
    [parseErrorMessage, updateThreadState]
  )

  // Handle custom events from ThreadStreamHolder (interrupts, workspace updates, etc.)
  const handleCustomEvent = useCallback(
    (threadId: string, data: CustomEventData) => {
      console.log('[ThreadContext] Custom event received:', { threadId, type: data.type, data })
      switch (data.type) {
        case 'interrupt':
          if (data.request) {
            console.log('[ThreadContext] Setting pendingApproval for thread:', threadId, data.request)
            updateThreadState(threadId, () => ({ pendingApproval: data.request }))
          }
          break
        case 'workspace':
          if (Array.isArray(data.files)) {
            updateThreadState(threadId, (state) => {
              const fileMap = new Map(state.workspaceFiles.map((f) => [f.path, f]))
              for (const f of data.files!) {
                fileMap.set(f.path, { path: f.path, is_dir: f.is_dir, size: f.size })
              }
              return { workspaceFiles: Array.from(fileMap.values()) }
            })
          }
          if (data.path) {
            updateThreadState(threadId, () => ({ workspacePath: data.path }))
          }
          break
        case 'subagents':
          if (Array.isArray(data.subagents)) {
            updateThreadState(threadId, () => ({
              subagents: data.subagents!.map((s) => ({
                id: s.id || crypto.randomUUID(),
                name: s.name || 'Subagent',
                description: s.description || '',
                status: (s.status || 'pending') as 'pending' | 'running' | 'completed' | 'failed',
                startedAt: s.startedAt,
                completedAt: s.completedAt
              }))
            }))
          }
          break
        case 'token_usage':
          // Only update if we have meaningful token values (> 0)
          // This prevents resetting the usage when streaming ends
          if (data.usage && data.usage.inputTokens !== undefined && data.usage.inputTokens > 0) {
            console.log('[ThreadContext] Token usage update:', {
              threadId,
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              totalTokens: data.usage.totalTokens
            })
            updateThreadState(threadId, (prev) => {
              // Keep the higher of previous or new input tokens
              // This ensures we don't lose accumulated context during tool calls
              const newInputTokens = data.usage!.inputTokens || 0
              const prevInputTokens = prev.tokenUsage?.inputTokens || 0

              // Always update if new value is higher, or if this is first update
              if (newInputTokens >= prevInputTokens || !prev.tokenUsage) {
                return {
                  tokenUsage: {
                    inputTokens: newInputTokens,
                    outputTokens: data.usage!.outputTokens || 0,
                    totalTokens: data.usage!.totalTokens || 0,
                    cacheReadTokens: data.usage!.cacheReadTokens,
                    cacheCreationTokens: data.usage!.cacheCreationTokens,
                    lastUpdated: new Date()
                  }
                }
              }
              // Keep existing token usage if new value is lower
              return {}
            })
          }
          break
      }
    },
    [updateThreadState]
  )

  const getThreadActions = useCallback(
    (threadId: string): ThreadActions => {
      if (actionsCache.current[threadId]) {
        return actionsCache.current[threadId]
      }

      const actions: ThreadActions = {
        appendMessage: (message: Message) => {
          updateThreadState(threadId, (state) => {
            const exists = state.messages.some((m) => m.id === message.id)
            if (exists) {
              return { messages: state.messages.map((m) => (m.id === message.id ? message : m)) }
            }
            return { messages: [...state.messages, message] }
          })
        },
        setMessages: (messages: Message[]) => {
          updateThreadState(threadId, () => ({ messages }))
        },
        setTodos: (todos: Todo[]) => {
          updateThreadState(threadId, () => ({ todos }))
        },
        setWorkspaceFiles: (files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => {
          updateThreadState(threadId, (state) => ({
            workspaceFiles: typeof files === 'function' ? files(state.workspaceFiles) : files
          }))
        },
        setWorkspacePath: (path: string | null) => {
          updateThreadState(threadId, () => ({ workspacePath: path }))
        },
        setSubagents: (subagents: Subagent[]) => {
          updateThreadState(threadId, () => ({ subagents }))
        },
        setPendingApproval: (request: HITLRequest | null) => {
          updateThreadState(threadId, () => ({ pendingApproval: request }))
        },
        setError: (error: string | null) => {
          updateThreadState(threadId, () => ({ error }))
        },
        clearError: () => {
          updateThreadState(threadId, () => ({ error: null }))
        },
        setCurrentModel: (modelId: string) => {
          updateThreadState(threadId, () => ({ currentModel: modelId }))
        },
        openFile: (path: string, name: string) => {
          updateThreadState(threadId, (state) => {
            if (state.openFiles.some((f) => f.path === path)) {
              return { activeTab: path }
            }
            return { openFiles: [...state.openFiles, { path, name }], activeTab: path }
          })
        },
        closeFile: (path: string) => {
          updateThreadState(threadId, (state) => {
            const newOpenFiles = state.openFiles.filter((f) => f.path !== path)
            const newFileContents = { ...state.fileContents }
            delete newFileContents[path]
            let newActiveTab = state.activeTab
            if (state.activeTab === path) {
              const closedIndex = state.openFiles.findIndex((f) => f.path === path)
              if (newOpenFiles.length === 0) newActiveTab = 'agent'
              else if (closedIndex > 0) newActiveTab = newOpenFiles[closedIndex - 1].path
              else newActiveTab = newOpenFiles[0].path
            }
            return { openFiles: newOpenFiles, activeTab: newActiveTab, fileContents: newFileContents }
          })
        },
        setActiveTab: (tab: 'agent' | string) => {
          updateThreadState(threadId, () => ({ activeTab: tab }))
        },
        setFileContents: (path: string, content: string) => {
          updateThreadState(threadId, (state) => ({
            fileContents: { ...state.fileContents, [path]: content }
          }))
        }
      }

      actionsCache.current[threadId] = actions
      return actions
    },
    [updateThreadState]
  )

  const loadThreadHistory = useCallback(
    async (threadId: string) => {
      const actions = getThreadActions(threadId)

      // Load workspace path
      try {
        const path = await window.api.workspace.get(threadId)
        if (path) {
          actions.setWorkspacePath(path)
          const diskResult = await window.api.workspace.loadFromDisk(threadId)
          if (diskResult.success) {
            actions.setWorkspaceFiles(diskResult.files)
          }
        }
      } catch (error) {
        console.error('[ThreadContext] Failed to load workspace path:', error)
      }

      // Load thread history from checkpoints
      try {
        const history = await window.api.threads.getHistory(threadId)
        if (history.length > 0) {
          const latestCheckpoint = history[0] as {
            checkpoint?: {
              channel_values?: {
                messages?: Array<{
                  id?: string
                  _getType?: () => string
                  type?: string
                  content?: string | unknown[]
                  tool_calls?: unknown[]
                  tool_call_id?: string
                  name?: string
                }>
                todos?: Array<{ id?: string; content?: string; status?: string }>
                __interrupt__?: Array<{
                  value?: {
                    actionRequests?: Array<{
                      action: string
                      args: Record<string, unknown>
                    }>
                    reviewConfigs?: Array<{
                      toolName: string
                      toolArgs: Record<string, unknown>
                    }>
                  }
                }>
              }
            }
            pending_sends?: Array<unknown>
          }

          const channelValues = latestCheckpoint.checkpoint?.channel_values

          if (channelValues?.messages && Array.isArray(channelValues.messages)) {
            const messages: Message[] = channelValues.messages.map((msg, index) => {
              let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant'
              if (typeof msg._getType === 'function') {
                const type = msg._getType()
                if (type === 'human') role = 'user'
                else if (type === 'ai') role = 'assistant'
                else if (type === 'system') role = 'system'
                else if (type === 'tool') role = 'tool'
              } else if (msg.type) {
                if (msg.type === 'human') role = 'user'
                else if (msg.type === 'ai') role = 'assistant'
                else if (msg.type === 'system') role = 'system'
                else if (msg.type === 'tool') role = 'tool'
              }

              let content: Message['content'] = ''
              if (typeof msg.content === 'string') content = msg.content
              else if (Array.isArray(msg.content)) content = msg.content as Message['content']

              return {
                id: msg.id || `msg-${index}`,
                role,
                content,
                tool_calls: msg.tool_calls as Message['tool_calls'],
                ...(role === 'tool' && msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
                ...(role === 'tool' && msg.name && { name: msg.name }),
                created_at: new Date()
              }
            })
            actions.setMessages(messages)
          }

          if (channelValues?.todos && Array.isArray(channelValues.todos)) {
            const todos: Todo[] = channelValues.todos.map((todo, index) => ({
              id: todo.id || `todo-${index}`,
              content: todo.content || '',
              status: (todo.status as Todo['status']) || 'pending'
            }))
            actions.setTodos(todos)
          }

          // Restore interrupt state if present
          const interruptData = channelValues?.__interrupt__
          if (interruptData && Array.isArray(interruptData) && interruptData.length > 0) {
            const interruptValue = interruptData[0]?.value
            const actionRequests = interruptValue?.actionRequests
            const reviewConfigs = interruptValue?.reviewConfigs

            if (actionRequests && actionRequests.length > 0) {
              // New langchain HITL format
              const req = actionRequests[0]
              const hitlRequest: HITLRequest = {
                id: crypto.randomUUID(),
                tool_call: {
                  id: crypto.randomUUID(),
                  name: req.action,
                  args: req.args
                },
                allowed_decisions: ['approve', 'reject', 'edit']
              }
              actions.setPendingApproval(hitlRequest)
            } else if (reviewConfigs && reviewConfigs.length > 0) {
              // Alternative format
              const config = reviewConfigs[0]
              const hitlRequest: HITLRequest = {
                id: crypto.randomUUID(),
                tool_call: {
                  id: crypto.randomUUID(),
                  name: config.toolName,
                  args: config.toolArgs
                },
                allowed_decisions: ['approve', 'reject', 'edit']
              }
              actions.setPendingApproval(hitlRequest)
            }
          }
        }
      } catch (error) {
        console.error('[ThreadContext] Failed to load thread history:', error)
      }
    },
    [getThreadActions]
  )

  const loadDefaultModel = useCallback(
    async (threadId: string) => {
      const actions = getThreadActions(threadId)
      try {
        const modelId = await window.api.models.getDefault()
        if (modelId) {
          actions.setCurrentModel(modelId)
        }
      } catch (error) {
        console.error('[ThreadContext] Failed to load default model:', error)
      }
    },
    [getThreadActions]
  )

  const initializeThread = useCallback(
    (threadId: string) => {
      if (initializedThreadsRef.current.has(threadId)) return
      initializedThreadsRef.current.add(threadId)

      // Add to active threads (this will render a ThreadStreamHolder)
      setActiveThreadIds((prev) => new Set([...prev, threadId]))

      setThreadStates((prev) => {
        if (prev[threadId]) return prev
        return { ...prev, [threadId]: createDefaultThreadState() }
      })

      loadThreadHistory(threadId)
      loadDefaultModel(threadId)
    },
    [loadThreadHistory, loadDefaultModel]
  )

  const cleanupThread = useCallback((threadId: string) => {
    initializedThreadsRef.current.delete(threadId)
    delete actionsCache.current[threadId]
    delete streamDataRef.current[threadId]
    delete streamSubscribersRef.current[threadId]
    setActiveThreadIds((prev) => {
      const next = new Set(prev)
      next.delete(threadId)
      return next
    })
    setThreadStates((prev) => {
      const { [threadId]: _, ...rest } = prev
      return rest
    })
  }, [])

  const contextValue = useMemo<ThreadContextValue>(
    () => ({
      getThreadState,
      getThreadActions,
      initializeThread,
      cleanupThread,
      subscribeToStream,
      getStreamData
    }),
    [getThreadState, getThreadActions, initializeThread, cleanupThread, subscribeToStream, getStreamData]
  )

  return (
    <ThreadContext.Provider value={contextValue}>
      {/* Render stream holders for all active threads */}
      {Array.from(activeThreadIds).map((threadId) => (
        <ThreadStreamHolder
          key={threadId}
          threadId={threadId}
          onStreamUpdate={(data) => handleStreamUpdate(threadId, data)}
          onCustomEvent={(data) => handleCustomEvent(threadId, data)}
          onError={(error) => handleError(threadId, error)}
        />
      ))}
      {children}
    </ThreadContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThreadContext(): ThreadContextValue {
  const context = useContext(ThreadContext)
  if (!context) throw new Error('useThreadContext must be used within a ThreadProvider')
  return context
}

// Hook to subscribe to stream data for a thread using useSyncExternalStore
export function useThreadStream(threadId: string): StreamData {
  const context = useThreadContext()

  const subscribe = useCallback(
    (callback: () => void) => context.subscribeToStream(threadId, callback),
    [context, threadId]
  )

  const getSnapshot = useCallback(() => context.getStreamData(threadId), [context, threadId])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Hook to access current thread's state and actions
export function useCurrentThread(threadId: string): ThreadState & ThreadActions {
  const context = useThreadContext()

  useEffect(() => {
    context.initializeThread(threadId)
  }, [threadId, context])

  const state = context.getThreadState(threadId)
  const actions = context.getThreadActions(threadId)

  return { ...state, ...actions }
}

// Hook for nullable threadId
export function useThreadState(threadId: string | null): (ThreadState & ThreadActions) | null {
  const context = useThreadContext()

  useEffect(() => {
    if (threadId) context.initializeThread(threadId)
  }, [threadId, context])

  if (!threadId) return null

  const state = context.getThreadState(threadId)
  const actions = context.getThreadActions(threadId)

  return { ...state, ...actions }
}
