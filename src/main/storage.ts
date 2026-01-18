import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { PROVIDER_REGISTRY, isBuiltInProvider } from '../shared/providers'
import type {
  ProviderId,
  SavedProviderConfig,
  ProviderConfigs,
  UserProvider,
  ProviderApiType,
  ProviderPresetType
} from '../shared/types'

const OPENWORK_DIR = join(homedir(), '.openwork')
const ENV_FILE = join(OPENWORK_DIR, '.env')
const CONFIGS_FILE = join(OPENWORK_DIR, 'provider-configs.json')
const USER_PROVIDERS_FILE = join(OPENWORK_DIR, 'user-providers.json')

// In-memory cache for provider configs
let configsCache: Record<string, ProviderConfigs> | null = null

// Force clear cache on module load to ensure fresh reads
console.log('[Storage] Module loaded, cache is null')

export function getOpenworkDir(): string {
  if (!existsSync(OPENWORK_DIR)) {
    mkdirSync(OPENWORK_DIR, { recursive: true })
  }
  return OPENWORK_DIR
}

export function getDbPath(): string {
  return join(getOpenworkDir(), 'openwork.sqlite')
}

export function getCheckpointDbPath(): string {
  return join(getOpenworkDir(), 'langgraph.sqlite')
}

export function getEnvFilePath(): string {
  return ENV_FILE
}

// Read .env file and parse into object
function parseEnvFile(): Record<string, string> {
  const envPath = getEnvFilePath()
  if (!existsSync(envPath)) return {}

  const content = readFileSync(envPath, 'utf-8')
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      result[key] = value
    }
  }
  return result
}

// =============================================================================
// JSON-based Multi-Config Storage
// =============================================================================

// Read all provider configs from JSON file
function readConfigsFile(): Record<string, ProviderConfigs> {
  if (configsCache) {
    console.log('[Storage] Using cached configs, providers:', Object.keys(configsCache))
    return configsCache
  }

  const configPath = CONFIGS_FILE
  console.log(`[Storage] Cache is null, reading from disk: ${configPath}`)

  if (!existsSync(configPath)) {
    console.log('[Storage] Config file does not exist, returning empty')
    configsCache = {}
    return configsCache
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    configsCache = JSON.parse(content)
    // Log details about what was loaded
    for (const [providerId, data] of Object.entries(configsCache!)) {
      console.log(
        `[Storage] Loaded ${providerId}: ${data.configs?.length || 0} configs, active: ${data.activeConfigId}`
      )
    }
    return configsCache!
  } catch (e) {
    console.error('[Storage] Failed to parse provider-configs.json:', e)
    configsCache = {}
    return configsCache
  }
}

// Write all provider configs to JSON file
function writeConfigsFile(configs: Record<string, ProviderConfigs>): void {
  getOpenworkDir() // ensure dir exists
  console.log(`[Storage] Writing configs to ${CONFIGS_FILE}`)
  writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2))
  configsCache = configs
  console.log('[Storage] Configs written and cached')
}

/**
 * Migrate existing .env configuration to JSON format.
 * Called on first load to preserve existing configs.
 */
export function migrateEnvToJsonConfigs(): void {
  // Only migrate if JSON file doesn't exist yet
  if (existsSync(CONFIGS_FILE)) return

  const env = parseEnvFile()
  if (Object.keys(env).length === 0) return

  const configs: Record<string, ProviderConfigs> = {}

  for (const [providerId, provider] of Object.entries(PROVIDER_REGISTRY)) {
    if (!provider.requiresConfig || provider.fields.length === 0) continue

    // Check if this provider has any env values
    const config: Record<string, string> = {}
    let hasValue = false

    for (const field of provider.fields) {
      const value = env[field.envVar] || ''
      if (value) {
        config[field.key] = value
        hasValue = true
      }
    }

    if (hasValue) {
      // Create a saved config from the .env values
      const savedConfig: SavedProviderConfig = {
        id: randomUUID(),
        name: getDefaultConfigName(providerId as ProviderId, config),
        config,
        createdAt: new Date().toISOString()
      }

      configs[providerId] = {
        activeConfigId: savedConfig.id,
        configs: [savedConfig]
      }
    }
  }

  if (Object.keys(configs).length > 0) {
    writeConfigsFile(configs)
    console.log('[Storage] Migrated .env configs to provider-configs.json')
  }
}

// Get a default name for a config based on provider type
function getDefaultConfigName(providerId: ProviderId, config: Record<string, string>): string {
  // Check built-in providers first
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    if (provider.nameField && config[provider.nameField]) {
      return config[provider.nameField]
    }
    return 'Default'
  }

  // For custom providers, use the deploymentName field
  if (config.deploymentName) {
    return config.deploymentName
  }

  return 'Default'
}

/**
 * Get all saved configs for a provider.
 */
export function getProviderConfigs(providerId: string): SavedProviderConfig[] {
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()
  const configs = allConfigs[providerId]?.configs || []
  console.log(`[Storage] getProviderConfigs(${providerId}):`, configs.length, 'configs')
  return configs
}

/**
 * Get the currently active config for a provider.
 */
export function getActiveProviderConfig(providerId: string): SavedProviderConfig | undefined {
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()
  const providerConfigs = allConfigs[providerId]

  if (!providerConfigs || providerConfigs.configs.length === 0) {
    return undefined
  }

  // Find the active config
  if (providerConfigs.activeConfigId) {
    const active = providerConfigs.configs.find((c) => c.id === providerConfigs.activeConfigId)
    if (active) return active
  }

  // Fallback to first config if no active set
  return providerConfigs.configs[0]
}

/**
 * Save a new config or update an existing one.
 */
export function saveProviderConfig(providerId: string, config: SavedProviderConfig): void {
  console.log(`[Storage] saveProviderConfig(${providerId}):`, config.id, config.name)
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()

  if (!allConfigs[providerId]) {
    allConfigs[providerId] = {
      activeConfigId: config.id,
      configs: []
    }
  }

  const existingIndex = allConfigs[providerId].configs.findIndex((c) => c.id === config.id)
  if (existingIndex >= 0) {
    allConfigs[providerId].configs[existingIndex] = config
  } else {
    allConfigs[providerId].configs.push(config)
  }

  // If this is the first config, make it active
  if (allConfigs[providerId].configs.length === 1) {
    allConfigs[providerId].activeConfigId = config.id
  }

  writeConfigsFile(allConfigs)

  // Also update process.env for current session with active config (only for built-in providers)
  const activeConfig = getActiveProviderConfig(providerId)
  if (activeConfig && isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    for (const field of provider.fields) {
      if (activeConfig.config[field.key] && field.envVar) {
        process.env[field.envVar] = activeConfig.config[field.key]
      }
    }
  }
  // Custom providers don't use process.env - their configs are accessed directly
}

/**
 * Delete a specific config by ID.
 */
export function deleteProviderConfigById(providerId: string, configId: string): void {
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()

  if (!allConfigs[providerId]) return

  allConfigs[providerId].configs = allConfigs[providerId].configs.filter((c) => c.id !== configId)

  // If we deleted the active config, set new active
  if (allConfigs[providerId].activeConfigId === configId) {
    allConfigs[providerId].activeConfigId =
      allConfigs[providerId].configs.length > 0 ? allConfigs[providerId].configs[0].id : null
  }

  // If no configs left, remove the provider entry
  if (allConfigs[providerId].configs.length === 0) {
    delete allConfigs[providerId]
  }

  writeConfigsFile(allConfigs)

  // Clear process.env for this provider (only for built-in providers)
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    for (const field of provider.fields) {
      if (field.envVar) {
        delete process.env[field.envVar]
      }
    }

    // Set new active config in process.env if there is one
    const activeConfig = getActiveProviderConfig(providerId)
    if (activeConfig) {
      for (const field of provider.fields) {
        if (activeConfig.config[field.key] && field.envVar) {
          process.env[field.envVar] = activeConfig.config[field.key]
        }
      }
    }
  }
  // Custom providers don't use process.env
}

/**
 * Set which config is active for a provider.
 */
export function setActiveProviderConfigId(providerId: string, configId: string): void {
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()

  if (!allConfigs[providerId]) return

  // Verify the config exists
  const config = allConfigs[providerId].configs.find((c) => c.id === configId)
  if (!config) return

  allConfigs[providerId].activeConfigId = configId
  writeConfigsFile(allConfigs)

  // Update process.env with the new active config (only for built-in providers)
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    for (const field of provider.fields) {
      if (config.config[field.key] && field.envVar) {
        process.env[field.envVar] = config.config[field.key]
      }
    }
  }
  // Custom providers don't use process.env
}

// =============================================================================
// Unified Provider Config API (uses active config from multi-config storage)
// =============================================================================

export type ProviderConfig = Record<string, string>

/**
 * Get configuration for a provider.
 * Returns the active config's values, or undefined if not configured.
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  // For built-in providers, check if they have fields
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    if (provider.fields.length === 0) return undefined
  }

  const activeConfig = getActiveProviderConfig(providerId)
  if (!activeConfig) return undefined

  return activeConfig.config
}

/**
 * Set configuration for a provider (legacy - creates/updates single config).
 * For multi-config support, use saveProviderConfig instead.
 */
export function setProviderConfig(providerId: string, config: ProviderConfig): void {
  // For built-in providers, verify it exists
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    if (!provider) return
  }
  // For custom providers, verify it exists in user providers
  else if (!isUserProvider(providerId)) {
    return
  }

  // Get existing active config or create new one
  const activeConfig = getActiveProviderConfig(providerId)

  if (activeConfig) {
    // Update existing config
    activeConfig.config = { ...activeConfig.config, ...config }
    saveProviderConfig(providerId, activeConfig)
  } else {
    // Create new config
    const newConfig: SavedProviderConfig = {
      id: randomUUID(),
      name: getDefaultConfigName(providerId, config),
      config,
      createdAt: new Date().toISOString()
    }
    saveProviderConfig(providerId, newConfig)
  }
}

/**
 * Delete all configurations for a provider.
 */
export function deleteProviderConfig(providerId: string): void {
  migrateEnvToJsonConfigs()
  const allConfigs = readConfigsFile()

  if (allConfigs[providerId]) {
    delete allConfigs[providerId]
    writeConfigsFile(allConfigs)
  }

  // Clear process.env for this provider (only for built-in providers)
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    for (const field of provider.fields) {
      if (field.envVar) {
        delete process.env[field.envVar]
      }
    }
  }
  // Custom providers don't use process.env
}

/**
 * Check if a provider has configuration.
 * For providers with multiple required fields, all must be present.
 */
export function hasProviderConfig(providerId: string): boolean {
  // Check built-in providers
  if (isBuiltInProvider(providerId)) {
    const provider = PROVIDER_REGISTRY[providerId]
    if (provider.fields.length === 0) return true // Ollama doesn't need config

    const activeConfig = getActiveProviderConfig(providerId)
    if (!activeConfig) return false

    // Check that all required fields have values
    return provider.fields.every((field) => !!activeConfig.config[field.key])
  }

  // For custom providers, check based on their preset type
  const activeConfig = getActiveProviderConfig(providerId)
  if (!activeConfig) return false

  // Get the user provider to check its preset type
  const userProvider = getUserProviders().find((p) => p.id === providerId)
  if (!userProvider) return false

  const presetType = userProvider.presetType || 'api'

  // Check required fields based on preset type
  switch (presetType) {
    case 'api':
      // API preset needs modelName, endpoint, and apiKey (apiVersion optional)
      return !!(
        activeConfig.config.modelName &&
        activeConfig.config.endpoint &&
        activeConfig.config.apiKey
      )
    case 'aws-iam':
      // AWS IAM preset needs modelName, accessKeyId, secretAccessKey, and region
      return !!(
        activeConfig.config.modelName &&
        activeConfig.config.accessKeyId &&
        activeConfig.config.secretAccessKey &&
        activeConfig.config.region
      )
    case 'google-cloud':
      // Google Cloud preset needs modelName, projectId, region, and serviceAccountJson
      return !!(
        activeConfig.config.modelName &&
        activeConfig.config.projectId &&
        activeConfig.config.region &&
        activeConfig.config.serviceAccountJson
      )
    default:
      return false
  }
}

// =============================================================================
// Legacy API (used by runtime - kept for compatibility)
// =============================================================================

/**
 * @deprecated Use getProviderConfig instead
 */
export function getApiKey(provider: string): string | undefined {
  const config = getProviderConfig(provider)
  return config?.apiKey
}

/**
 * @deprecated Use setProviderConfig instead
 */
export function setApiKey(provider: string, apiKey: string): void {
  setProviderConfig(provider, { apiKey })
}

/**
 * @deprecated Use deleteProviderConfig instead
 */
export function deleteApiKey(provider: string): void {
  deleteProviderConfig(provider)
}

/**
 * @deprecated Use hasProviderConfig instead
 */
export function hasApiKey(provider: string): boolean {
  return hasProviderConfig(provider)
}

// =============================================================================
// User-Editable Models Storage
// =============================================================================
// Users can add custom models to the AVAILABLE_MODELS list via the UI.
// These are stored in a separate JSON file and merged with default models.

import type { ModelConfig } from '../shared/types'

const USER_MODELS_FILE = join(OPENWORK_DIR, 'user-models.json')

// In-memory cache for user models
let userModelsCache: ModelConfig[] | null = null

/**
 * Read user-added models from JSON file.
 */
function readUserModelsFile(): ModelConfig[] {
  if (userModelsCache !== null) {
    return userModelsCache
  }

  getOpenworkDir() // Ensure directory exists

  if (!existsSync(USER_MODELS_FILE)) {
    userModelsCache = []
    return []
  }

  try {
    const content = readFileSync(USER_MODELS_FILE, 'utf-8')
    userModelsCache = JSON.parse(content) as ModelConfig[]
    return userModelsCache
  } catch (e) {
    console.error('Failed to read user models file:', e)
    userModelsCache = []
    return []
  }
}

/**
 * Write user-added models to JSON file.
 */
function writeUserModelsFile(models: ModelConfig[]): void {
  getOpenworkDir() // Ensure directory exists
  writeFileSync(USER_MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8')
  userModelsCache = models
}

/**
 * Get all user-added models.
 */
export function getUserModels(): ModelConfig[] {
  return readUserModelsFile()
}

/**
 * Add a new user model.
 * Returns the created model with a generated ID.
 */
export function addUserModel(model: Omit<ModelConfig, 'available'>): ModelConfig {
  const models = readUserModelsFile()

  const newModel: ModelConfig = {
    ...model,
    available: true // User-added models are always available
  }

  // Check if model with same ID already exists
  const existingIndex = models.findIndex((m) => m.id === newModel.id)
  if (existingIndex >= 0) {
    // Update existing
    models[existingIndex] = newModel
  } else {
    // Add new
    models.push(newModel)
  }

  writeUserModelsFile(models)
  return newModel
}

/**
 * Update an existing user model.
 */
export function updateUserModel(
  modelId: string,
  updates: Partial<ModelConfig>
): ModelConfig | null {
  const models = readUserModelsFile()
  const index = models.findIndex((m) => m.id === modelId)

  if (index < 0) return null

  models[index] = { ...models[index], ...updates }
  writeUserModelsFile(models)
  return models[index]
}

/**
 * Delete a user model by ID.
 */
export function deleteUserModel(modelId: string): boolean {
  const models = readUserModelsFile()
  const index = models.findIndex((m) => m.id === modelId)

  if (index < 0) return false

  models.splice(index, 1)
  writeUserModelsFile(models)
  return true
}

/**
 * Check if a model ID is a user-added model.
 */
export function isUserModel(modelId: string): boolean {
  const models = readUserModelsFile()
  return models.some((m) => m.id === modelId)
}

// =============================================================================
// User-Created Providers Storage
// =============================================================================
// Users can create custom providers (e.g., AWS Bedrock, Azure AI Foundry variants)
// that are stored separately from the built-in provider registry.

// In-memory cache for user providers
let userProvidersCache: UserProvider[] | null = null

/**
 * Read user-created providers from JSON file.
 */
function readUserProvidersFile(): UserProvider[] {
  if (userProvidersCache !== null) {
    return userProvidersCache
  }

  getOpenworkDir() // Ensure directory exists

  if (!existsSync(USER_PROVIDERS_FILE)) {
    userProvidersCache = []
    return []
  }

  try {
    const content = readFileSync(USER_PROVIDERS_FILE, 'utf-8')
    userProvidersCache = JSON.parse(content) as UserProvider[]
    return userProvidersCache
  } catch (e) {
    console.error('Failed to read user providers file:', e)
    userProvidersCache = []
    return []
  }
}

/**
 * Write user-created providers to JSON file.
 */
function writeUserProvidersFile(providers: UserProvider[]): void {
  getOpenworkDir() // Ensure directory exists
  writeFileSync(USER_PROVIDERS_FILE, JSON.stringify(providers, null, 2), 'utf-8')
  userProvidersCache = providers
}

/**
 * Get all user-created providers.
 */
export function getUserProviders(): UserProvider[] {
  return readUserProvidersFile()
}

/**
 * Add a new user provider.
 * Returns the created provider with a generated ID.
 */
export function addUserProvider(
  name: string,
  apiType: ProviderApiType,
  presetType: ProviderPresetType = 'api'
): UserProvider {
  const providers = readUserProvidersFile()

  const newProvider: UserProvider = {
    id: randomUUID(),
    name: name.trim(),
    apiType,
    presetType,
    createdAt: new Date().toISOString()
  }

  providers.push(newProvider)
  writeUserProvidersFile(providers)
  return newProvider
}

/**
 * Update an existing user provider.
 */
export function updateUserProvider(
  providerId: string,
  updates: Partial<UserProvider>
): UserProvider | null {
  const providers = readUserProvidersFile()
  const index = providers.findIndex((p) => p.id === providerId)

  if (index < 0) return null

  // Don't allow changing the ID - destructure to remove it from updates
  const { id: _, ...safeUpdates } = updates
  void _
  providers[index] = { ...providers[index], ...safeUpdates }
  writeUserProvidersFile(providers)
  return providers[index]
}

/**
 * Delete a user provider and all its configurations.
 */
export function deleteUserProvider(providerId: string): boolean {
  const providers = readUserProvidersFile()
  const index = providers.findIndex((p) => p.id === providerId)

  if (index < 0) return false

  // Remove the provider
  providers.splice(index, 1)
  writeUserProvidersFile(providers)

  // Also delete all configurations for this provider
  const allConfigs = readConfigsFile()
  if (allConfigs[providerId]) {
    delete allConfigs[providerId]
    writeConfigsFile(allConfigs)
  }

  return true
}

/**
 * Check if a provider ID is a user-created provider.
 */
export function isUserProvider(providerId: string): boolean {
  const providers = readUserProvidersFile()
  return providers.some((p) => p.id === providerId)
}
