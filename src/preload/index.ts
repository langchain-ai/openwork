import { contextBridge, ipcRenderer } from 'electron'
import type { Thread, ModelConfig, Provider, StreamEvent, HITLDecision } from '../main/types'
import type {
  SavedProviderConfig,
  UserProvider,
  ProviderApiType,
  ProviderPresetType
} from '../shared/types'

type ProviderConfig = Record<string, string>

// Simple electron API - replaces @electron-toolkit/preload
const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => listener(...args))
      return () => ipcRenderer.removeListener(channel, listener)
    },
    once: (channel: string, listener: (...args: unknown[]) => void) => {
      ipcRenderer.once(channel, (_event, ...args) => listener(...args))
    },
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
  },
  process: {
    platform: process.platform,
    versions: process.versions
  }
}

// Custom APIs for renderer
const api = {
  agent: {
    // Send message and receive events via callback
    invoke: (
      threadId: string,
      message: string,
      modelId: string | undefined,
      onEvent: (event: StreamEvent) => void
    ): (() => void) => {
      const channel = `agent:stream:${threadId}`

      const handler = (_: unknown, data: StreamEvent): void => {
        onEvent(data)
        if (data.type === 'done' || data.type === 'error') {
          ipcRenderer.removeListener(channel, handler)
        }
      }

      ipcRenderer.on(channel, handler)
      ipcRenderer.send('agent:invoke', { threadId, message, modelId })

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    },
    // Stream agent events for useStream transport
    streamAgent: (
      threadId: string,
      message: string,
      command: unknown,
      modelId: string | undefined,
      onEvent: (event: StreamEvent) => void
    ): (() => void) => {
      const channel = `agent:stream:${threadId}`

      const handler = (_: unknown, data: StreamEvent): void => {
        onEvent(data)
        if (data.type === 'done' || data.type === 'error') {
          ipcRenderer.removeListener(channel, handler)
        }
      }

      ipcRenderer.on(channel, handler)

      // If we have a command, it might be a resume/retry
      if (command) {
        ipcRenderer.send('agent:resume', { threadId, command, modelId })
      } else {
        ipcRenderer.send('agent:invoke', { threadId, message, modelId })
      }

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    },
    interrupt: (
      threadId: string,
      decision: HITLDecision,
      modelId: string | undefined,
      onEvent?: (event: StreamEvent) => void
    ): (() => void) => {
      const channel = `agent:stream:${threadId}`

      const handler = (_: unknown, data: StreamEvent): void => {
        onEvent?.(data)
        if (data.type === 'done' || data.type === 'error') {
          ipcRenderer.removeListener(channel, handler)
        }
      }

      ipcRenderer.on(channel, handler)
      ipcRenderer.send('agent:interrupt', { threadId, decision, modelId })

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    },
    cancel: (threadId: string): Promise<void> => {
      return ipcRenderer.invoke('agent:cancel', { threadId })
    }
  },
  threads: {
    list: (): Promise<Thread[]> => {
      return ipcRenderer.invoke('threads:list')
    },
    get: (threadId: string): Promise<Thread | null> => {
      return ipcRenderer.invoke('threads:get', threadId)
    },
    create: (metadata?: Record<string, unknown>): Promise<Thread> => {
      return ipcRenderer.invoke('threads:create', metadata)
    },
    update: (threadId: string, updates: Partial<Thread>): Promise<Thread> => {
      return ipcRenderer.invoke('threads:update', { threadId, updates })
    },
    delete: (threadId: string): Promise<void> => {
      return ipcRenderer.invoke('threads:delete', threadId)
    },
    getHistory: (threadId: string): Promise<unknown[]> => {
      return ipcRenderer.invoke('threads:history', threadId)
    },
    generateTitle: (message: string): Promise<string> => {
      return ipcRenderer.invoke('threads:generateTitle', message)
    }
  },
  models: {
    list: (): Promise<ModelConfig[]> => {
      return ipcRenderer.invoke('models:list')
    },
    listProviders: (): Promise<Provider[]> => {
      return ipcRenderer.invoke('models:listProviders')
    },
    getDefault: (): Promise<string> => {
      return ipcRenderer.invoke('models:getDefault')
    },
    setDefault: (modelId: string): Promise<void> => {
      return ipcRenderer.invoke('models:setDefault', modelId)
    },
    getProviderConfig: (providerId: string): Promise<ProviderConfig | null> => {
      return ipcRenderer.invoke('models:getProviderConfig', providerId)
    },
    setProviderConfig: (providerId: string, config: ProviderConfig): Promise<void> => {
      return ipcRenderer.invoke('models:setProviderConfig', { providerId, config })
    },
    deleteProviderConfig: (providerId: string): Promise<void> => {
      return ipcRenderer.invoke('models:deleteProviderConfig', providerId)
    },
    // Multi-config methods
    listProviderConfigs: (providerId: string): Promise<SavedProviderConfig[]> => {
      return ipcRenderer.invoke('models:listProviderConfigs', providerId)
    },
    getActiveProviderConfigById: (providerId: string): Promise<SavedProviderConfig | null> => {
      return ipcRenderer.invoke('models:getActiveProviderConfig', providerId)
    },
    saveProviderConfigById: (providerId: string, config: SavedProviderConfig): Promise<void> => {
      return ipcRenderer.invoke('models:saveProviderConfig', { providerId, config })
    },
    deleteProviderConfigById: (providerId: string, configId: string): Promise<void> => {
      return ipcRenderer.invoke('models:deleteProviderConfigById', { providerId, configId })
    },
    setActiveProviderConfigId: (providerId: string, configId: string): Promise<void> => {
      return ipcRenderer.invoke('models:setActiveProviderConfigId', { providerId, configId })
    },
    // Model list methods
    listByProvider: (providerId: string): Promise<ModelConfig[]> => {
      return ipcRenderer.invoke('models:listByProvider', providerId)
    },
    // User model methods
    listUserModels: (): Promise<ModelConfig[]> => {
      return ipcRenderer.invoke('models:listUserModels')
    },
    addUserModel: (model: Omit<ModelConfig, 'available'>): Promise<ModelConfig> => {
      return ipcRenderer.invoke('models:addUserModel', model)
    },
    updateUserModel: (
      modelId: string,
      updates: Partial<ModelConfig>
    ): Promise<ModelConfig | null> => {
      return ipcRenderer.invoke('models:updateUserModel', { modelId, updates })
    },
    deleteUserModel: (modelId: string): Promise<boolean> => {
      return ipcRenderer.invoke('models:deleteUserModel', modelId)
    }
  },
  providers: {
    listUserProviders: (): Promise<UserProvider[]> => {
      return ipcRenderer.invoke('providers:listUserProviders')
    },
    addUserProvider: (
      name: string,
      apiType: ProviderApiType,
      presetType: ProviderPresetType
    ): Promise<UserProvider> => {
      return ipcRenderer.invoke('providers:addUserProvider', { name, apiType, presetType })
    },
    updateUserProvider: (
      providerId: string,
      updates: Partial<UserProvider>
    ): Promise<UserProvider | null> => {
      return ipcRenderer.invoke('providers:updateUserProvider', { providerId, updates })
    },
    deleteUserProvider: (providerId: string): Promise<boolean> => {
      return ipcRenderer.invoke('providers:deleteUserProvider', providerId)
    }
  },
  workspace: {
    get: (threadId?: string): Promise<string | null> => {
      return ipcRenderer.invoke('workspace:get', threadId)
    },
    set: (threadId: string | undefined, path: string | null): Promise<string | null> => {
      return ipcRenderer.invoke('workspace:set', { threadId, path })
    },
    select: (threadId?: string): Promise<string | null> => {
      return ipcRenderer.invoke('workspace:select', threadId)
    },
    loadFromDisk: (
      threadId: string
    ): Promise<{
      success: boolean
      files: Array<{
        path: string
        is_dir: boolean
        size?: number
        modified_at?: string
      }>
      workspacePath?: string
      error?: string
    }> => {
      return ipcRenderer.invoke('workspace:loadFromDisk', { threadId })
    },
    readFile: (
      threadId: string,
      filePath: string
    ): Promise<{
      success: boolean
      content?: string
      size?: number
      modified_at?: string
      error?: string
    }> => {
      return ipcRenderer.invoke('workspace:readFile', { threadId, filePath })
    },
    readBinaryFile: (
      threadId: string,
      filePath: string
    ): Promise<{
      success: boolean
      content?: string
      size?: number
      modified_at?: string
      error?: string
    }> => {
      return ipcRenderer.invoke('workspace:readBinaryFile', { threadId, filePath })
    },
    // Listen for file changes in the workspace
    onFilesChanged: (
      callback: (data: { threadId: string; workspacePath: string }) => void
    ): (() => void) => {
      const handler = (_: unknown, data: { threadId: string; workspacePath: string }): void => {
        callback(data)
      }
      ipcRenderer.on('workspace:files-changed', handler)
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('workspace:files-changed', handler)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
