import { create } from 'zustand'
import type { Thread, ModelConfig, Provider } from '@/types'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'openwork-theme'

// Helper to get the resolved theme (light or dark) from the theme setting
export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

// Helper to apply theme to the document
export function applyTheme(theme: Theme): void {
  const resolved = getResolvedTheme(theme)
  const root = document.documentElement
  
  // Remove both classes first
  root.classList.remove('light', 'dark')
  
  // Add the resolved theme class
  root.classList.add(resolved)
}

// Helper to load theme from localStorage
function loadStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage might not be available
  }
  return 'system' // Default to system preference
}

// Helper to save theme to localStorage
function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage might not be available
  }
}

interface AppState {
  // Threads
  threads: Thread[]
  currentThreadId: string | null

  // Models and Providers (global, not per-thread)
  models: ModelConfig[]
  providers: Provider[]

  // Theme
  theme: Theme

  // Right panel state (UI state, not thread data)
  rightPanelTab: 'todos' | 'files' | 'subagents'

  // Settings dialog state
  settingsOpen: boolean

  // Sidebar state
  sidebarCollapsed: boolean

  // Thread actions
  loadThreads: () => Promise<void>
  createThread: (metadata?: Record<string, unknown>) => Promise<Thread>
  selectThread: (threadId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  updateThread: (threadId: string, updates: Partial<Thread>) => Promise<void>
  generateTitleForFirstMessage: (threadId: string, content: string) => Promise<void>

  // Model actions
  loadModels: () => Promise<void>
  loadProviders: () => Promise<void>
  setApiKey: (providerId: string, apiKey: string) => Promise<void>
  deleteApiKey: (providerId: string) => Promise<void>

  // Panel actions
  setRightPanelTab: (tab: 'todos' | 'files' | 'subagents') => void

  // Settings actions
  setSettingsOpen: (open: boolean) => void

  // Sidebar actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Theme actions
  setTheme: (theme: Theme) => void
  initializeTheme: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  threads: [],
  currentThreadId: null,
  models: [],
  providers: [],
  theme: loadStoredTheme(),
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
    set((state) => ({
      threads: [thread, ...state.threads],
      currentThreadId: thread.thread_id
    }))
    return thread
  },

  selectThread: async (threadId: string) => {
    // Just update currentThreadId - ThreadContext handles per-thread state
    set({ currentThreadId: threadId })
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

        return {
          threads,
          currentThreadId: newCurrentId
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

  generateTitleForFirstMessage: async (threadId: string, content: string) => {
    try {
      const generatedTitle = await window.api.threads.generateTitle(content)
      await get().updateThread(threadId, { title: generatedTitle })
    } catch (error) {
      console.error('[Store] Failed to generate title:', error)
    }
  },

  // Model actions
  loadModels: async () => {
    const models = await window.api.models.list()
    set({ models })
  },

  loadProviders: async () => {
    const providers = await window.api.models.listProviders()
    set({ providers })
  },

  setApiKey: async (providerId: string, apiKey: string) => {
    console.log('[Store] setApiKey called:', { providerId, keyLength: apiKey.length })
    try {
      await window.api.models.setApiKey(providerId, apiKey)
      console.log('[Store] API key saved via IPC')
      // Reload providers and models to update availability
      await get().loadProviders()
      await get().loadModels()
      console.log('[Store] Providers and models reloaded')
    } catch (e) {
      console.error('[Store] Failed to set API key:', e)
      throw e
    }
  },

  deleteApiKey: async (providerId: string) => {
    await window.api.models.deleteApiKey(providerId)
    // Reload providers and models to update availability
    await get().loadProviders()
    await get().loadModels()
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

  // Theme actions
  setTheme: (theme: Theme) => {
    saveTheme(theme)
    applyTheme(theme)
    set({ theme })
  },

  initializeTheme: () => {
    const theme = get().theme
    applyTheme(theme)
  }
}))
