import { create } from 'zustand'
import type {
  Thread,
  Message,
  Todo,
  ModelConfig,
  Provider,
  HITLRequest,
  FileInfo,
  Subagent
} from '@/types'

// Open file tab type
export interface OpenFile {
  path: string
  name: string
}

// Tab state per thread
export interface TabState {
  openFiles: OpenFile[]
  activeTab: 'agent' | string
  fileContents: Record<string, string>
}

interface AppState {
  // Threads
  threads: Thread[]
  currentThreadId: string | null

  // Messages for current thread
  messages: Message[]

  // HITL state
  pendingApproval: HITLRequest | null

  // Todos (from agent)
  todos: Todo[]

  // Workspace files (from agent)
  workspaceFiles: FileInfo[]
  workspacePath: string | null

  // Subagents (from agent)
  subagents: Subagent[]

  // Loading state - which thread is currently streaming an AI response.
  // Set by ChatContainer based on useStream's isLoading state.
  // Used to block model switching during active agent runs.
  // See ModelSwitcher.tsx for detailed documentation on what this covers.
  loadingThreadId: string | null

  // Error state - errors by thread ID
  errorByThread: Record<string, string>

  // Models and Providers
  models: ModelConfig[]
  providers: Provider[]
  currentModel: string
  modelsLoading: boolean // True while initially loading models
  providersLoading: boolean // True while initially loading providers

  // Right panel state
  rightPanelTab: 'todos' | 'files' | 'subagents'

  // Settings dialog state
  settingsOpen: boolean

  // Sidebar state
  sidebarCollapsed: boolean

  // File viewer tabs state
  openFiles: OpenFile[]
  activeTab: 'agent' | string // 'agent' or file path
  fileContents: Record<string, string> // path -> content cache

  // Per-thread tab state persistence
  tabStateByThread: Record<string, TabState>

  // Actions
  loadThreads: () => Promise<void>
  createThread: (metadata?: Record<string, unknown>) => Promise<Thread>
  selectThread: (threadId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  updateThread: (threadId: string, updates: Partial<Thread>) => Promise<void>

  // Message actions
  appendMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  generateTitleForFirstMessage: (threadId: string, content: string) => Promise<void>

  // HITL actions
  setPendingApproval: (request: HITLRequest | null) => void
  respondToApproval: (
    decision: 'approve' | 'reject' | 'edit',
    editedArgs?: Record<string, unknown>
  ) => Promise<void>

  // Todo actions
  setTodos: (todos: Todo[]) => void

  // Workspace actions
  setWorkspaceFiles: (files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => void
  setWorkspacePath: (path: string | null) => void

  // Subagent actions
  setSubagents: (subagents: Subagent[]) => void

  // Loading state actions
  setLoadingThreadId: (threadId: string | null) => void

  // Error state actions
  setThreadError: (threadId: string, error: string) => void
  clearThreadError: (threadId: string) => void

  // Model actions
  loadModels: () => Promise<void>
  loadProviders: () => Promise<void>
  setCurrentModel: (modelId: string) => Promise<void>

  // Panel actions
  setRightPanelTab: (tab: 'todos' | 'files' | 'subagents') => void

  // Settings actions
  setSettingsOpen: (open: boolean) => void

  // Sidebar actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // File viewer tab actions
  openFile: (path: string, name: string) => void
  closeFile: (path: string) => void
  setActiveTab: (tab: 'agent' | string) => void
  setFileContents: (path: string, content: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  threads: [],
  currentThreadId: null,
  messages: [],
  pendingApproval: null,
  todos: [],
  workspaceFiles: [],
  workspacePath: null,
  subagents: [],
  loadingThreadId: null,
  errorByThread: {},
  models: [],
  providers: [],
  currentModel: 'claude-sonnet-4-5-20250929',
  modelsLoading: true, // Start as loading until first fetch completes
  providersLoading: true, // Start as loading until first fetch completes
  rightPanelTab: 'todos',
  settingsOpen: false,
  sidebarCollapsed: false,
  openFiles: [],
  activeTab: 'agent',
  fileContents: {},
  tabStateByThread: {},

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
    const currentState = get()

    // Save current thread's tab state before switching
    let newTabStateByThread = currentState.tabStateByThread
    if (currentState.currentThreadId) {
      const currentTabState: TabState = {
        openFiles: currentState.openFiles,
        activeTab: currentState.activeTab,
        fileContents: currentState.fileContents
      }
      newTabStateByThread = {
        ...newTabStateByThread,
        [currentState.currentThreadId]: currentTabState
      }
    }

    const thread = await window.api.threads.create(metadata)
    set((state) => ({
      threads: [thread, ...state.threads],
      currentThreadId: thread.thread_id,
      messages: [],
      todos: [],
      workspaceFiles: [],
      workspacePath: null,
      subagents: [],
      // Reset tabs for new thread
      openFiles: [],
      activeTab: 'agent',
      fileContents: {},
      tabStateByThread: newTabStateByThread
    }))
    return thread
  },

  selectThread: async (threadId: string) => {
    // Do all state updates in a single set() to avoid race conditions
    set((state) => {
      // Build updated tabStateByThread - save current thread's tab state
      let updatedTabStateByThread = state.tabStateByThread
      if (state.currentThreadId && state.currentThreadId !== threadId) {
        updatedTabStateByThread = {
          ...updatedTabStateByThread,
          [state.currentThreadId]: {
            openFiles: state.openFiles,
            activeTab: state.activeTab,
            fileContents: state.fileContents
          }
        }
      }

      // Restore the new thread's tab state (or default to empty)
      const savedTabState = updatedTabStateByThread[threadId]
      const newTabState = savedTabState || {
        openFiles: [],
        activeTab: 'agent',
        fileContents: {}
      }

      return {
        currentThreadId: threadId,
        messages: [],
        todos: [],
        workspaceFiles: [],
        workspacePath: null,
        subagents: [],
        // Update tabStateByThread with current thread's state saved
        tabStateByThread: updatedTabStateByThread,
        // Restore tab state for this thread
        openFiles: newTabState.openFiles,
        activeTab: newTabState.activeTab,
        fileContents: newTabState.fileContents
      }
    })

    // Load workspace path from thread metadata
    try {
      const path = await window.api.workspace.get(threadId)
      if (path) {
        set({ workspacePath: path })

        // Load files from disk when workspace is linked
        const diskResult = await window.api.workspace.loadFromDisk(threadId)
        if (diskResult.success) {
          set({ workspaceFiles: diskResult.files })
        }
      }
    } catch (error) {
      console.error('Failed to load workspace path:', error)
    }

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
                tool_call_id?: string
                name?: string
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
              // Include tool_call_id and name for tool messages
              ...(role === 'tool' && msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
              ...(role === 'tool' && msg.name && { name: msg.name }),
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

      set((state) => {
        const threads = state.threads.filter((t) => t.thread_id !== threadId)
        const wasCurrentThread = state.currentThreadId === threadId
        const newCurrentId = wasCurrentThread
          ? threads[0]?.thread_id || null
          : state.currentThreadId

        console.log('[Store] Updating state:', {
          remainingThreads: threads.length,
          wasCurrentThread,
          newCurrentId
        })

        // Remove tab state for deleted thread
        const { [threadId]: _, ...remainingTabState } = state.tabStateByThread
        void _

        // If we're switching to a new thread, restore its tab state
        const newThreadTabState = newCurrentId ? remainingTabState[newCurrentId] : null

        return {
          threads,
          currentThreadId: newCurrentId,
          // Clear messages if we deleted the current thread
          messages: wasCurrentThread ? [] : state.messages,
          // Clear other state if we deleted the current thread
          todos: wasCurrentThread ? [] : state.todos,
          workspaceFiles: wasCurrentThread ? [] : state.workspaceFiles,
          workspacePath: wasCurrentThread ? null : state.workspacePath,
          subagents: wasCurrentThread ? [] : state.subagents,
          // Clean up tab state for deleted thread and restore new thread's tab state if switching
          tabStateByThread: remainingTabState,
          openFiles: wasCurrentThread ? newThreadTabState?.openFiles || [] : state.openFiles,
          activeTab: wasCurrentThread ? newThreadTabState?.activeTab || 'agent' : state.activeTab,
          fileContents: wasCurrentThread
            ? newThreadTabState?.fileContents || {}
            : state.fileContents
        }
      })
    } catch (error) {
      console.error('[Store] Failed to delete thread:', error)
    }
  },

  updateThread: async (threadId: string, updates: Partial<Thread>) => {
    const updated = await window.api.threads.update(threadId, updates)
    set((state) => ({
      threads: state.threads.map((t) => (t.thread_id === threadId ? updated : t))
    }))
  },

  // Message actions
  appendMessage: (message: Message) => {
    set((state) => {
      // Check if message already exists (by id)
      const exists = state.messages.some((m) => m.id === message.id)
      if (exists) {
        return { messages: state.messages.map((m) => (m.id === message.id ? message : m)) }
      }
      return { messages: [...state.messages, message] }
    })
  },

  setMessages: (messages: Message[]) => {
    set({ messages })
  },

  // Auto-generate title for first message in a thread
  generateTitleForFirstMessage: async (threadId: string, content: string) => {
    try {
      const generatedTitle = await window.api.threads.generateTitle(content)
      await get().updateThread(threadId, { title: generatedTitle })
    } catch (error) {
      console.error('[Store] Failed to generate title:', error)
    }
  },

  // HITL actions
  setPendingApproval: (request: HITLRequest | null) => {
    set({ pendingApproval: request })
  },

  respondToApproval: async (
    decision: 'approve' | 'reject' | 'edit',
    editedArgs?: Record<string, unknown>
  ) => {
    const { currentThreadId, pendingApproval, currentModel } = get()
    if (!currentThreadId || !pendingApproval) return

    // Clear pending approval immediately so UI updates
    set({ pendingApproval: null })

    // Send interrupt decision - streaming response handled by useStream hook
    window.api.agent.interrupt(
      currentThreadId,
      {
        type: decision,
        tool_call_id: pendingApproval.tool_call.id,
        edited_args: editedArgs
      },
      currentModel
      // Note: We don't pass onEvent here - the useStream hook in ChatContainer
      // will pick up the stream events on the same channel
    )
  },

  // Todo actions
  setTodos: (todos: Todo[]) => {
    set({ todos })
  },

  // Workspace actions
  setWorkspaceFiles: (files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => {
    if (typeof files === 'function') {
      set((state) => ({ workspaceFiles: files(state.workspaceFiles) }))
    } else {
      set({ workspaceFiles: files })
    }
  },

  setWorkspacePath: (path: string | null) => {
    set({ workspacePath: path })
  },

  // Subagent actions
  setSubagents: (subagents: Subagent[]) => {
    set({ subagents })
  },

  // Loading state actions
  setLoadingThreadId: (threadId: string | null) => {
    set({ loadingThreadId: threadId })
  },

  // Error state actions
  setThreadError: (threadId: string, error: string) => {
    set((state) => ({
      errorByThread: { ...state.errorByThread, [threadId]: error }
    }))
  },

  clearThreadError: (threadId: string) => {
    set((state) => {
      const { [threadId]: _removed, ...rest } = state.errorByThread
      void _removed
      return { errorByThread: rest }
    })
  },

  // Model actions
  loadModels: async () => {
    console.log('[Store] Loading models...')
    try {
      const models = await window.api.models.list()
      const currentModel = await window.api.models.getDefault()
      console.log('[Store] Loaded models:', models.length, 'current:', currentModel)
      set({ models, currentModel, modelsLoading: false })
    } catch (e) {
      console.error('[Store] Failed to load models:', e)
      set({ modelsLoading: false })
    }
  },

  loadProviders: async () => {
    console.log('[Store] Loading providers...')
    try {
      const providers = await window.api.models.listProviders()
      const configured = providers.filter((p) => p.hasApiKey)
      console.log(
        '[Store] Loaded providers:',
        providers.length,
        'configured:',
        configured.map((p) => p.id)
      )
      set({ providers, providersLoading: false })
    } catch (e) {
      console.error('[Store] Failed to load providers:', e)
      set({ providersLoading: false })
    }
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
  },

  // File viewer tab actions
  openFile: (path: string, name: string) => {
    set((state) => {
      // Check if file is already open
      const alreadyOpen = state.openFiles.some((f) => f.path === path)
      if (alreadyOpen) {
        // Just switch to it
        return { activeTab: path }
      }
      // Add to open files and switch to it
      return {
        openFiles: [...state.openFiles, { path, name }],
        activeTab: path
      }
    })
  },

  closeFile: (path: string) => {
    set((state) => {
      const newOpenFiles = state.openFiles.filter((f) => f.path !== path)
      // Remove from content cache
      const { [path]: _removed, ...newFileContents } = state.fileContents
      void _removed

      // If closing the active tab, switch to agent or the previous file
      let newActiveTab = state.activeTab
      if (state.activeTab === path) {
        const closedIndex = state.openFiles.findIndex((f) => f.path === path)
        if (newOpenFiles.length === 0) {
          newActiveTab = 'agent'
        } else if (closedIndex > 0) {
          newActiveTab = newOpenFiles[closedIndex - 1].path
        } else {
          newActiveTab = newOpenFiles[0].path
        }
      }

      return {
        openFiles: newOpenFiles,
        activeTab: newActiveTab,
        fileContents: newFileContents
      }
    })
  },

  setActiveTab: (tab: 'agent' | string) => {
    set({ activeTab: tab })
  },

  setFileContents: (path: string, content: string) => {
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: content }
    }))
  }
}))
