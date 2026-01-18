import type { Thread, ModelConfig, Provider, StreamEvent, HITLDecision } from '../main/types'
import type {
  SavedProviderConfig,
  UserProvider,
  ProviderApiType,
  ProviderPresetType
} from '../shared/types'

type ProviderConfig = Record<string, string>

interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void
    on: (channel: string, listener: (...args: unknown[]) => void) => () => void
    once: (channel: string, listener: (...args: unknown[]) => void) => void
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
  process: {
    platform: NodeJS.Platform
    versions: NodeJS.ProcessVersions
  }
}

interface CustomAPI {
  agent: {
    invoke: (
      threadId: string,
      message: string,
      modelId: string | undefined,
      onEvent: (event: StreamEvent) => void
    ) => () => void
    streamAgent: (
      threadId: string,
      message: string,
      command: unknown,
      modelId: string | undefined,
      onEvent: (event: StreamEvent) => void
    ) => () => void
    interrupt: (
      threadId: string,
      decision: HITLDecision,
      modelId: string | undefined,
      onEvent?: (event: StreamEvent) => void
    ) => () => void
    cancel: (threadId: string) => Promise<void>
  }
  threads: {
    list: () => Promise<Thread[]>
    get: (threadId: string) => Promise<Thread | null>
    create: (metadata?: Record<string, unknown>) => Promise<Thread>
    update: (threadId: string, updates: Partial<Thread>) => Promise<Thread>
    delete: (threadId: string) => Promise<void>
    getHistory: (threadId: string) => Promise<unknown[]>
    generateTitle: (message: string) => Promise<string>
  }
  models: {
    list: () => Promise<ModelConfig[]>
    listProviders: () => Promise<Provider[]>
    getDefault: () => Promise<string>
    setDefault: (modelId: string) => Promise<void>
    getProviderConfig: (providerId: string) => Promise<ProviderConfig | null>
    setProviderConfig: (providerId: string, config: ProviderConfig) => Promise<void>
    deleteProviderConfig: (providerId: string) => Promise<void>
    // Multi-config methods
    listProviderConfigs: (providerId: string) => Promise<SavedProviderConfig[]>
    getActiveProviderConfigById: (providerId: string) => Promise<SavedProviderConfig | null>
    saveProviderConfigById: (providerId: string, config: SavedProviderConfig) => Promise<void>
    deleteProviderConfigById: (providerId: string, configId: string) => Promise<void>
    setActiveProviderConfigId: (providerId: string, configId: string) => Promise<void>
    // Model list methods
    listByProvider: (providerId: string) => Promise<ModelConfig[]>
    // User model methods
    listUserModels: () => Promise<ModelConfig[]>
    addUserModel: (model: Omit<ModelConfig, 'available'>) => Promise<ModelConfig>
    updateUserModel: (modelId: string, updates: Partial<ModelConfig>) => Promise<ModelConfig | null>
    deleteUserModel: (modelId: string) => Promise<boolean>
  }
  providers: {
    listUserProviders: () => Promise<UserProvider[]>
    addUserProvider: (
      name: string,
      apiType: ProviderApiType,
      presetType: ProviderPresetType
    ) => Promise<UserProvider>
    updateUserProvider: (
      providerId: string,
      updates: Partial<UserProvider>
    ) => Promise<UserProvider | null>
    deleteUserProvider: (providerId: string) => Promise<boolean>
  }
  workspace: {
    get: (threadId?: string) => Promise<string | null>
    set: (threadId: string | undefined, path: string | null) => Promise<string | null>
    select: (threadId?: string) => Promise<string | null>
    loadFromDisk: (threadId: string) => Promise<{
      success: boolean
      files: Array<{
        path: string
        is_dir: boolean
        size?: number
        modified_at?: string
      }>
      workspacePath?: string
      error?: string
    }>
    readFile: (
      threadId: string,
      filePath: string
    ) => Promise<{
      success: boolean
      content?: string
      size?: number
      modified_at?: string
      error?: string
    }>
    readBinaryFile: (
      threadId: string,
      filePath: string
    ) => Promise<{
      success: boolean
      content?: string
      size?: number
      modified_at?: string
      error?: string
    }>
    onFilesChanged: (
      callback: (data: { threadId: string; workspacePath: string }) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
