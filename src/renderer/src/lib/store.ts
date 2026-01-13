import { create } from 'zustand'
import type { Thread, Message, Todo, ModelConfig, HITLRequest, FileInfo, Subagent } from '@/types'

interface AppState {
  // Threads
  threads: Thread[]
  currentThreadId: string | null
  
  // Messages for current thread
  messages: Message[]
  
  // Streaming state - per-thread to allow concurrent runs
  streamingThreads: Set<string>
  streamingContent: Record<string, string>  // threadId -> content
  
  // HITL state
  pendingApproval: HITLRequest | null
  
  // Todos (from agent)
  todos: Todo[]
  
  // Workspace files (from agent)
  workspaceFiles: FileInfo[]
  workspacePath: string | null
  
  // Subagents (from agent)
  subagents: Subagent[]
  
  // Models
  models: ModelConfig[]
  currentModel: string
  
  // Right panel state
  rightPanelTab: 'todos' | 'files' | 'subagents'
  
  // Settings dialog state
  settingsOpen: boolean
  
  // Sidebar state
  sidebarCollapsed: boolean
  
  // Actions
  loadThreads: () => Promise<void>
  createThread: (metadata?: Record<string, unknown>) => Promise<Thread>
  selectThread: (threadId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  updateThread: (threadId: string, updates: Partial<Thread>) => Promise<void>
  
  // Message actions
  sendMessage: (content: string) => Promise<void>
  appendMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  
  // Streaming actions
  isThreadStreaming: (threadId: string) => boolean
  getStreamingContent: (threadId: string) => string
  setThreadStreaming: (threadId: string, streaming: boolean) => void
  appendStreamingContent: (threadId: string, content: string) => void
  clearStreamingContent: (threadId: string) => void
  
  // HITL actions
  setPendingApproval: (request: HITLRequest | null) => void
  respondToApproval: (decision: 'approve' | 'reject' | 'edit', editedArgs?: Record<string, unknown>) => Promise<void>
  
  // Todo actions
  setTodos: (todos: Todo[]) => void
  
  // Workspace actions
  setWorkspaceFiles: (files: FileInfo[]) => void
  setWorkspacePath: (path: string | null) => void
  
  // Subagent actions
  setSubagents: (subagents: Subagent[]) => void
  
  // Model actions
  loadModels: () => Promise<void>
  setCurrentModel: (modelId: string) => Promise<void>
  
  // Panel actions
  setRightPanelTab: (tab: 'todos' | 'files' | 'subagents') => void
  
  // Settings actions
  setSettingsOpen: (open: boolean) => void
  
  // Sidebar actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  threads: [],
  currentThreadId: null,
  messages: [],
  streamingThreads: new Set<string>(),
  streamingContent: {},
  pendingApproval: null,
  todos: [],
  workspaceFiles: [],
  workspacePath: null,
  subagents: [],
  models: [],
  currentModel: 'claude-sonnet-4-20250514',
  rightPanelTab: 'todos',
  settingsOpen: false,
  sidebarCollapsed: false,

  // Thread actions
  loadThreads: async () => {
    const threads = await window.api.threads.list()
    set({ threads })
    
    // Select first thread if none selected
    if (!get().currentThreadId && threads.length > 0) {
      await get().selectThread(threads[0].thread_id)
    }
  },

  createThread: async (metadata?: Record<string, unknown>) => {
    const thread = await window.api.threads.create(metadata)
    set(state => ({ 
      threads: [thread, ...state.threads],
      currentThreadId: thread.thread_id,
      messages: []
    }))
    return thread
  },

  selectThread: async (threadId: string) => {
    set({ currentThreadId: threadId, messages: [], todos: [], workspaceFiles: [], workspacePath: null, subagents: [] })
    
    // Load thread history from checkpoints
    try {
      const history = await window.api.threads.getHistory(threadId)
      
      // Get the most recent checkpoint (first in the list since it's ordered DESC)
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
              }>
              todos?: Array<{
                id?: string
                content?: string
                status?: string
              }>
            }
          }
        }
        
        const channelValues = latestCheckpoint.checkpoint?.channel_values
        
        // Extract messages
        if (channelValues?.messages && Array.isArray(channelValues.messages)) {
          const messages: Message[] = channelValues.messages.map((msg, index) => {
            // Determine role from message type
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
            
            // Handle content - could be string or array of content blocks
            let content: Message['content'] = ''
            if (typeof msg.content === 'string') {
              content = msg.content
            } else if (Array.isArray(msg.content)) {
              content = msg.content as Message['content']
            }
            
            return {
              id: msg.id || `msg-${index}`,
              role,
              content,
              tool_calls: msg.tool_calls as Message['tool_calls'],
              created_at: new Date()
            }
          })
          
          set({ messages })
        }
        
        // Extract todos if present
        if (channelValues?.todos && Array.isArray(channelValues.todos)) {
          const todos: Todo[] = channelValues.todos.map((todo, index) => ({
            id: todo.id || `todo-${index}`,
            content: todo.content || '',
            status: (todo.status as Todo['status']) || 'pending'
          }))
          
          set({ todos })
        }
      }
    } catch (error) {
      console.error('Failed to load thread history:', error)
    }
  },

  deleteThread: async (threadId: string) => {
    console.log('[Store] Deleting thread:', threadId)
    try {
      await window.api.threads.delete(threadId)
      console.log('[Store] Thread deleted from backend')
      
      set(state => {
        const threads = state.threads.filter(t => t.thread_id !== threadId)
        const wasCurrentThread = state.currentThreadId === threadId
        const newCurrentId = wasCurrentThread 
          ? threads[0]?.thread_id || null 
          : state.currentThreadId
        
        console.log('[Store] Updating state:', { 
          remainingThreads: threads.length, 
          wasCurrentThread, 
          newCurrentId 
        })
        
        return { 
          threads,
          currentThreadId: newCurrentId,
          // Clear messages if we deleted the current thread
          messages: wasCurrentThread ? [] : state.messages,
          // Clear other state if we deleted the current thread
          todos: wasCurrentThread ? [] : state.todos,
          workspaceFiles: wasCurrentThread ? [] : state.workspaceFiles,
          workspacePath: wasCurrentThread ? null : state.workspacePath,
          subagents: wasCurrentThread ? [] : state.subagents
        }
      })
    } catch (error) {
      console.error('[Store] Failed to delete thread:', error)
    }
  },

  updateThread: async (threadId: string, updates: Partial<Thread>) => {
    const updated = await window.api.threads.update(threadId, updates)
    set(state => ({
      threads: state.threads.map(t => t.thread_id === threadId ? updated : t)
    }))
  },

  // Message actions
  sendMessage: async (content: string) => {
    const { currentThreadId } = get()
    console.log('[Store] sendMessage called', { currentThreadId, content: content.substring(0, 50) })
    
    if (!currentThreadId) {
      console.error('[Store] No currentThreadId!')
      return
    }

    const threadId = currentThreadId

    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date()
    }
    
    const isFirstMessage = get().messages.length === 0
    
    set(state => ({ 
      messages: [...state.messages, userMessage]
    }))
    
    // Auto-generate title on first message
    if (isFirstMessage) {
      try {
        const generatedTitle = await window.api.threads.generateTitle(content)
        await get().updateThread(threadId, { title: generatedTitle })
      } catch (error) {
        console.error('[Store] Failed to generate title:', error)
      }
    }
    
    // Set this thread as streaming
    get().setThreadStreaming(threadId, true)
    get().clearStreamingContent(threadId)

    // Stream agent response using callback pattern
    try {
      console.log('[Store] Checking window.api:', !!window.api, !!window.api?.agent)
      console.log('[Store] About to call window.api.agent.invoke')
      
      // The cleanup function is returned but auto-removes on done/error events
      window.api.agent.invoke(threadId, content, (event) => {
        console.log('[Store] Received event:', event.type)
        switch (event.type) {
          case 'message':
            // Only update if this is still the current thread
            if (get().currentThreadId === threadId) {
              get().appendMessage(event.message)
            }
            break
          case 'token':
            get().appendStreamingContent(threadId, event.token)
            break
          case 'interrupt':
            set({ pendingApproval: event.request })
            break
          case 'tool_call':
            // Could show tool call in progress
            break
          case 'todos':
            // Only update if this is still the current thread
            if (get().currentThreadId === threadId) {
              get().setTodos(event.todos)
            }
            break
          case 'workspace':
            console.log('[Store] Received workspace event:', { 
              files: event.files.length, 
              path: event.path,
              isCurrentThread: get().currentThreadId === threadId
            })
            // Only update if this is still the current thread
            if (get().currentThreadId === threadId) {
              get().setWorkspaceFiles(event.files)
              get().setWorkspacePath(event.path)
            }
            break
          case 'subagents':
            console.log('[Store] Received subagents event:', { 
              count: event.subagents.length,
              isCurrentThread: get().currentThreadId === threadId
            })
            // Only update if this is still the current thread
            if (get().currentThreadId === threadId) {
              get().setSubagents(event.subagents)
            }
            break
          case 'done':
            get().setThreadStreaming(threadId, false)
            get().clearStreamingContent(threadId)
            break
          case 'error':
            console.error('[Store] Stream error:', event.error)
            get().setThreadStreaming(threadId, false)
            get().clearStreamingContent(threadId)
            break
        }
      })
      console.log('[Store] invoke() called')
    } catch (error) {
      console.error('[Store] Failed to send message:', error)
      get().setThreadStreaming(threadId, false)
    }
  },

  appendMessage: (message: Message) => {
    set(state => {
      // Check if message already exists (by id)
      const exists = state.messages.some(m => m.id === message.id)
      if (exists) {
        return { messages: state.messages.map(m => m.id === message.id ? message : m) }
      }
      return { messages: [...state.messages, message] }
    })
  },

  setMessages: (messages: Message[]) => {
    set({ messages })
  },

  // Streaming actions
  isThreadStreaming: (threadId: string) => {
    return get().streamingThreads.has(threadId)
  },
  
  getStreamingContent: (threadId: string) => {
    return get().streamingContent[threadId] || ''
  },
  
  setThreadStreaming: (threadId: string, streaming: boolean) => {
    set(state => {
      const newSet = new Set(state.streamingThreads)
      if (streaming) {
        newSet.add(threadId)
      } else {
        newSet.delete(threadId)
      }
      return { streamingThreads: newSet }
    })
  },

  appendStreamingContent: (threadId: string, content: string) => {
    set(state => ({
      streamingContent: {
        ...state.streamingContent,
        [threadId]: (state.streamingContent[threadId] || '') + content
      }
    }))
  },

  clearStreamingContent: (threadId: string) => {
    set(state => {
      const newContent = { ...state.streamingContent }
      delete newContent[threadId]
      return { streamingContent: newContent }
    })
  },

  // HITL actions
  setPendingApproval: (request: HITLRequest | null) => {
    set({ pendingApproval: request })
  },

  respondToApproval: async (decision: 'approve' | 'reject' | 'edit', editedArgs?: Record<string, unknown>) => {
    const { currentThreadId, pendingApproval } = get()
    if (!currentThreadId || !pendingApproval) return

    await window.api.agent.interrupt(currentThreadId, {
      type: decision,
      tool_call_id: pendingApproval.tool_call.id,
      edited_args: editedArgs
    })

    set({ pendingApproval: null })
  },

  // Todo actions
  setTodos: (todos: Todo[]) => {
    set({ todos })
  },

  // Workspace actions
  setWorkspaceFiles: (files: FileInfo[]) => {
    set({ workspaceFiles: files })
  },

  setWorkspacePath: (path: string | null) => {
    set({ workspacePath: path })
  },

  // Subagent actions
  setSubagents: (subagents: Subagent[]) => {
    set({ subagents })
  },

  // Model actions
  loadModels: async () => {
    const models = await window.api.models.list()
    const currentModel = await window.api.models.getDefault()
    set({ models, currentModel })
  },

  setCurrentModel: async (modelId: string) => {
    await window.api.models.setDefault(modelId)
    set({ currentModel: modelId })
  },

  // Panel actions
  setRightPanelTab: (tab: 'todos' | 'files' | 'subagents') => {
    set({ rightPanelTab: tab })
  },

  // Settings actions
  setSettingsOpen: (open: boolean) => {
    set({ settingsOpen: open })
  },

  // Sidebar actions
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed })
  }
}))
