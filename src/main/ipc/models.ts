import { IpcMain, dialog, app } from 'electron'
import Store from 'electron-store'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { ModelConfig, Provider } from '../types'
import { startWatching, stopWatching } from '../services/workspace-watcher'
import {
  getOpenworkDir,
  getProviderConfig,
  setProviderConfig,
  deleteProviderConfig,
  hasProviderConfig,
  getProviderConfigs,
  getActiveProviderConfig,
  saveProviderConfig,
  deleteProviderConfigById,
  setActiveProviderConfigId,
  getUserModels,
  addUserModel,
  updateUserModel,
  deleteUserModel,
  getUserProviders,
  addUserProvider,
  updateUserProvider,
  deleteUserProvider,
  type ProviderConfig
} from '../storage'
import type {
  SavedProviderConfig,
  UserProvider,
  ProviderApiType,
  ProviderPresetType
} from '../../shared/types'
import { PROVIDER_REGISTRY, isBuiltInProvider } from '../../shared/providers'

// Store for non-sensitive settings only (no encryption needed)
const store = new Store({
  name: 'settings',
  cwd: getOpenworkDir()
})

// Provider configurations
// Note: modelSelection is added dynamically from PROVIDER_REGISTRY in listProviders handler
const PROVIDERS: Omit<Provider, 'hasApiKey' | 'modelSelection'>[] = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'google', name: 'Google' }
]

// Available models configuration (updated Jan 2026)
const AVAILABLE_MODELS: ModelConfig[] = [
  // Anthropic Claude 4.5 series (latest as of Jan 2026)
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
    description: 'Premium model with maximum intelligence',
    available: true
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    description: 'Best balance of intelligence, speed, and cost for agents',
    available: true
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    description: 'Fastest model with near-frontier intelligence',
    available: true
  },
  // Anthropic Claude legacy models
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    model: 'claude-opus-4-1-20250805',
    description: 'Previous generation premium model with extended thinking',
    available: true
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    description: 'Fast and capable previous generation model',
    available: true
  },
  // OpenAI GPT-5 series (latest as of Jan 2026)
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    model: 'gpt-5.2',
    description: 'Latest flagship with enhanced coding and agentic capabilities',
    available: true
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    model: 'gpt-5.1',
    description: 'Advanced reasoning and robust performance',
    available: true
  },
  // OpenAI o-series reasoning models
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    model: 'o3',
    description: 'Advanced reasoning for complex problem-solving',
    available: true
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    model: 'o3-mini',
    description: 'Cost-effective reasoning with faster response times',
    available: true
  },
  {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    model: 'o4-mini',
    description: 'Fast, efficient reasoning model succeeding o3',
    available: true
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    model: 'o1',
    description: 'Premium reasoning for research, coding, math and science',
    available: true
  },
  // OpenAI GPT-4 series
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    model: 'gpt-4.1',
    description: 'Strong instruction-following with 1M context window',
    available: true
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    description: 'Faster, smaller version balancing performance and efficiency',
    available: true
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    model: 'gpt-4.1-nano',
    description: 'Most cost-efficient for lighter tasks',
    available: true
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    description: 'Versatile model for text generation and comprehension',
    available: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    description: 'Cost-efficient variant with faster response times',
    available: true
  },
  // Google Gemini models
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'google',
    model: 'gemini-3-pro-preview',
    description: 'State-of-the-art reasoning and multimodal understanding',
    available: true
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    description: 'High-capability model for complex reasoning and coding',
    available: true
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    model: 'gemini-2.5-flash',
    description: 'Lightning-fast with balance of intelligence and latency',
    available: true
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    model: 'gemini-2.5-flash-lite',
    description: 'Fast, low-cost, high-performance model',
    available: true
  }
]

/**
 * Get all models (default + user-added) merged together.
 * User models override default models with the same ID.
 */
function getAllModels(): ModelConfig[] {
  const defaultModels = [...AVAILABLE_MODELS]
  const userModels = getUserModels()

  // Create a map for efficient lookup
  const modelMap = new Map<string, ModelConfig>()

  // Add default models first
  for (const model of defaultModels) {
    modelMap.set(model.id, model)
  }

  // User models override defaults with same ID, or add new ones
  for (const model of userModels) {
    modelMap.set(model.id, model)
  }

  return Array.from(modelMap.values())
}

/**
 * Get models for a specific provider.
 * For 'multi' providers: returns models from AVAILABLE_MODELS + user models
 * For 'deployment' providers: returns nothing (configs ARE the models)
 */
function getModelsForProvider(providerId: string): ModelConfig[] {
  // Check if it's a built-in provider
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    // For deployment-based providers, configs are the models - no dropdown needed
    if (provider.modelSelection === 'deployment') {
      return []
    }
    // For multi-model providers, return all models for this provider
    return getAllModels().filter((m) => m.provider === providerId)
  }

  // Custom providers are always deployment-based, so return empty
  return []
}

export function registerModelHandlers(ipcMain: IpcMain): void {
  console.log('[IPC] Registering model handlers')

  // List all available models (default + user-added)
  ipcMain.handle('models:list', async () => {
    const allModels = getAllModels()
    console.log('[IPC] models:list called, returning', allModels.length, 'models')
    // Merge default and user models, check availability
    return allModels.map((model) => ({
      ...model,
      available: hasProviderConfig(model.provider)
    }))
  })

  // List models for a specific provider (for dropdown)
  ipcMain.handle('models:listByProvider', async (_event, providerId: string) => {
    const models = getModelsForProvider(providerId).map((model) => ({
      ...model,
      available: hasProviderConfig(model.provider)
    }))
    console.log(`[IPC] models:listByProvider(${providerId}):`, models.length, 'models')
    return models
  })

  // Get default model
  ipcMain.handle('models:getDefault', async () => {
    return store.get('defaultModel', 'claude-sonnet-4-5-20250929') as string
  })

  // Set default model
  ipcMain.handle('models:setDefault', async (_event, modelId: string) => {
    store.set('defaultModel', modelId)
  })

  // List providers with their configuration status and model selection type
  ipcMain.handle('models:listProviders', async () => {
    // Get built-in providers
    const builtInProviders = PROVIDERS.map((provider) => {
      const registry = PROVIDER_REGISTRY[provider.id as keyof typeof PROVIDER_REGISTRY]
      const hasKey = hasProviderConfig(provider.id)
      return {
        ...provider,
        hasApiKey: hasKey,
        modelSelection: registry?.modelSelection || 'multi',
        isCustom: false
      }
    })

    // Get custom providers
    const customProviders = getUserProviders().map((userProvider) => ({
      id: userProvider.id,
      name: userProvider.name,
      hasApiKey: hasProviderConfig(userProvider.id),
      modelSelection: 'deployment' as const, // Custom providers are always deployment-based
      isCustom: true,
      apiType: userProvider.apiType,
      presetType: userProvider.presetType || 'api'
    }))

    const result = [...builtInProviders, ...customProviders]
    console.log(
      '[IPC] models:listProviders:',
      result.map((p) => ({ id: p.id, hasApiKey: p.hasApiKey, isCustom: p.isCustom }))
    )
    return result
  })

  // Unified provider config handlers
  ipcMain.handle('models:getProviderConfig', async (_event, providerId: string) => {
    return getProviderConfig(providerId) ?? null
  })

  ipcMain.handle(
    'models:setProviderConfig',
    async (_event, { providerId, config }: { providerId: string; config: ProviderConfig }) => {
      setProviderConfig(providerId, config)
    }
  )

  ipcMain.handle('models:deleteProviderConfig', async (_event, providerId: string) => {
    deleteProviderConfig(providerId)
  })

  // ==========================================================================
  // Multi-config handlers
  // ==========================================================================

  // List all saved configs for a provider
  ipcMain.handle('models:listProviderConfigs', async (_event, providerId: string) => {
    console.log(`[IPC] models:listProviderConfigs called with providerId: ${providerId}`)
    const configs = getProviderConfigs(providerId)
    console.log(
      `[IPC] models:listProviderConfigs(${providerId}): returning ${configs.length} configs:`,
      configs.map((c) => ({ id: c.id, name: c.name }))
    )
    return configs
  })

  // Get active config for a provider
  ipcMain.handle('models:getActiveProviderConfig', async (_event, providerId: string) => {
    return getActiveProviderConfig(providerId) ?? null
  })

  // Save a config (create new or update existing)
  ipcMain.handle(
    'models:saveProviderConfig',
    async (_event, { providerId, config }: { providerId: string; config: SavedProviderConfig }) => {
      saveProviderConfig(providerId, config)
    }
  )

  // Delete a specific config by ID
  ipcMain.handle(
    'models:deleteProviderConfigById',
    async (_event, { providerId, configId }: { providerId: string; configId: string }) => {
      deleteProviderConfigById(providerId, configId)
    }
  )

  // Set active config
  ipcMain.handle(
    'models:setActiveProviderConfigId',
    async (_event, { providerId, configId }: { providerId: string; configId: string }) => {
      setActiveProviderConfigId(providerId, configId)
    }
  )

  // ==========================================================================
  // User Model handlers (for adding custom models to the dropdown)
  // ==========================================================================

  // List user-added models
  ipcMain.handle('models:listUserModels', async () => {
    return getUserModels()
  })

  // Add a new user model
  ipcMain.handle('models:addUserModel', async (_event, model: Omit<ModelConfig, 'available'>) => {
    return addUserModel(model)
  })

  // Update an existing user model
  ipcMain.handle(
    'models:updateUserModel',
    async (_event, { modelId, updates }: { modelId: string; updates: Partial<ModelConfig> }) => {
      return updateUserModel(modelId, updates)
    }
  )

  // Delete a user model
  ipcMain.handle('models:deleteUserModel', async (_event, modelId: string) => {
    return deleteUserModel(modelId)
  })

  // ==========================================================================
  // User Provider handlers (for custom providers)
  // ==========================================================================

  // List all user-created providers
  ipcMain.handle('providers:listUserProviders', async () => {
    return getUserProviders()
  })

  // Add a new user provider
  ipcMain.handle(
    'providers:addUserProvider',
    async (
      _event,
      {
        name,
        apiType,
        presetType
      }: { name: string; apiType: ProviderApiType; presetType: ProviderPresetType }
    ) => {
      console.log('[IPC] providers:addUserProvider called with:', { name, apiType, presetType })
      const result = addUserProvider(name, apiType, presetType)
      console.log('[IPC] providers:addUserProvider result:', result)
      return result
    }
  )

  // Update an existing user provider
  ipcMain.handle(
    'providers:updateUserProvider',
    async (
      _event,
      { providerId, updates }: { providerId: string; updates: Partial<UserProvider> }
    ) => {
      return updateUserProvider(providerId, updates)
    }
  )

  // Delete a user provider
  ipcMain.handle('providers:deleteUserProvider', async (_event, providerId: string) => {
    return deleteUserProvider(providerId)
  })

  // Sync version info
  ipcMain.on('app:version', (event) => {
    event.returnValue = app.getVersion()
  })

  // Get workspace path for a thread (from thread metadata)
  ipcMain.handle('workspace:get', async (_event, threadId?: string) => {
    if (!threadId) {
      // Fallback to global setting for backwards compatibility
      return store.get('workspacePath', null) as string | null
    }

    // Get from thread metadata via threads:get
    const { getThread } = await import('../db')
    const thread = getThread(threadId)
    if (!thread?.metadata) return null

    const metadata = JSON.parse(thread.metadata)
    return metadata.workspacePath || null
  })

  // Set workspace path for a thread (stores in thread metadata)
  ipcMain.handle(
    'workspace:set',
    async (_event, { threadId, path: newPath }: { threadId?: string; path: string | null }) => {
      if (!threadId) {
        // Fallback to global setting
        if (newPath) {
          store.set('workspacePath', newPath)
        } else {
          store.delete('workspacePath')
        }
        return newPath
      }

      const { getThread, updateThread } = await import('../db')
      const thread = getThread(threadId)
      if (!thread) return null

      const metadata = thread.metadata ? JSON.parse(thread.metadata) : {}
      metadata.workspacePath = newPath
      updateThread(threadId, { metadata: JSON.stringify(metadata) })

      // Update file watcher
      if (newPath) {
        startWatching(threadId, newPath)
      } else {
        stopWatching(threadId)
      }

      return newPath
    }
  )

  // Select workspace folder via dialog (for a specific thread)
  ipcMain.handle('workspace:select', async (_event, threadId?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Workspace Folder',
      message: 'Choose a folder for the agent to work in'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    if (threadId) {
      const { getThread, updateThread } = await import('../db')
      const thread = getThread(threadId)
      if (thread) {
        const metadata = thread.metadata ? JSON.parse(thread.metadata) : {}
        metadata.workspacePath = selectedPath
        updateThread(threadId, { metadata: JSON.stringify(metadata) })

        // Start watching the new workspace
        startWatching(threadId, selectedPath)
      }
    } else {
      // Fallback to global
      store.set('workspacePath', selectedPath)
    }

    return selectedPath
  })

  // Load files from disk into the workspace view
  ipcMain.handle('workspace:loadFromDisk', async (_event, { threadId }: { threadId: string }) => {
    const { getThread } = await import('../db')

    // Get workspace path from thread metadata
    const thread = getThread(threadId)
    const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
    const workspacePath = metadata.workspacePath as string | null

    if (!workspacePath) {
      return { success: false, error: 'No workspace folder linked', files: [] }
    }

    try {
      const files: Array<{
        path: string
        is_dir: boolean
        size?: number
        modified_at?: string
      }> = []

      // Recursively read directory
      async function readDir(dirPath: string, relativePath: string = ''): Promise<void> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          // Skip hidden files and common non-project files
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue
          }

          const fullPath = path.join(dirPath, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            files.push({
              path: '/' + relPath,
              is_dir: true
            })
            await readDir(fullPath, relPath)
          } else {
            const stat = await fs.stat(fullPath)
            files.push({
              path: '/' + relPath,
              is_dir: false,
              size: stat.size,
              modified_at: stat.mtime.toISOString()
            })
          }
        }
      }

      await readDir(workspacePath)

      // Start watching for file changes
      startWatching(threadId, workspacePath)

      return {
        success: true,
        files,
        workspacePath
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        files: []
      }
    }
  })

  // Read a single file's contents from disk
  ipcMain.handle(
    'workspace:readFile',
    async (_event, { threadId, filePath }: { threadId: string; filePath: string }) => {
      const { getThread } = await import('../db')

      // Get workspace path from thread metadata
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | null

      if (!workspacePath) {
        return {
          success: false,
          error: 'No workspace folder linked'
        }
      }

      try {
        // Convert virtual path to full disk path
        const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
        const fullPath = path.join(workspacePath, relativePath)

        // Security check: ensure the resolved path is within the workspace
        const resolvedPath = path.resolve(fullPath)
        const resolvedWorkspace = path.resolve(workspacePath)
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
          return { success: false, error: 'Access denied: path outside workspace' }
        }

        // Check if file exists
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          return { success: false, error: 'Cannot read directory as file' }
        }

        // Read file contents
        const content = await fs.readFile(fullPath, 'utf-8')

        return {
          success: true,
          content,
          size: stat.size,
          modified_at: stat.mtime.toISOString()
        }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        }
      }
    }
  )

  // Read a binary file (images, PDFs, etc.) and return as base64
  ipcMain.handle(
    'workspace:readBinaryFile',
    async (_event, { threadId, filePath }: { threadId: string; filePath: string }) => {
      const { getThread } = await import('../db')

      // Get workspace path from thread metadata
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | null

      if (!workspacePath) {
        return {
          success: false,
          error: 'No workspace folder linked'
        }
      }

      try {
        // Convert virtual path to full disk path
        const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
        const fullPath = path.join(workspacePath, relativePath)

        // Security check: ensure the resolved path is within the workspace
        const resolvedPath = path.resolve(fullPath)
        const resolvedWorkspace = path.resolve(workspacePath)
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
          return { success: false, error: 'Access denied: path outside workspace' }
        }

        // Check if file exists
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          return { success: false, error: 'Cannot read directory as file' }
        }

        // Read file as binary and convert to base64
        const buffer = await fs.readFile(fullPath)
        const base64 = buffer.toString('base64')

        return {
          success: true,
          content: base64,
          size: stat.size,
          modified_at: stat.mtime.toISOString()
        }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        }
      }
    }
  )
}

// Re-export getApiKey from storage for use in agent runtime
export { getApiKey } from '../storage'

export function getDefaultModel(): string {
  return store.get('defaultModel', 'claude-sonnet-4-5-20250929') as string
}

/**
 * Look up a ModelConfig by its ID.
 * Searches both default models and user-added models.
 *
 * This should be used by the runtime to get the actual API model name
 * from ModelConfig.model, rather than using the ID directly.
 */
export function getModelConfigById(modelId: string): ModelConfig | null {
  return getAllModels().find((m) => m.id === modelId) || null
}

/**
 * Get the list of all available models (default + user-added).
 * Used by the runtime to validate and look up model configurations.
 */
export function getAvailableModels(): ModelConfig[] {
  return getAllModels()
}
