// Shared types used across main, renderer, and preload processes

// Provider configuration
// Built-in providers have known IDs, custom providers use UUID strings
export type BuiltInProviderId = 'anthropic' | 'openai' | 'google' | 'ollama'
export type ProviderId = BuiltInProviderId | string

/**
 * Model selection type for providers:
 * - 'multi': One API key accesses multiple models (Anthropic, OpenAI, Google)
 *   User selects model from dropdown, can add custom models
 * - 'deployment': One config = one model (Azure)
 *   Each config IS a model, deployment name is the model identifier
 */
export type ModelSelectionType = 'multi' | 'deployment'

export interface Provider {
  id: ProviderId
  name: string
  hasApiKey: boolean
  modelSelection: ModelSelectionType
  isCustom?: boolean // True for user-created providers
}

// API type determines which SDK/API format to use for the provider
export type ProviderApiType = 'openai' | 'anthropic' | 'google' | 'azure'

/**
 * Provider preset type determines the authentication/configuration pattern:
 * - 'api': Standard API with Target URI + API Key + optional Version (Azure-style)
 * - 'aws-iam': AWS IAM credentials (Access Key ID, Secret Access Key, Region)
 * - 'google-cloud': Google Cloud Service Account (Project ID, Region, Service Account JSON)
 */
export type ProviderPresetType = 'api' | 'aws-iam' | 'google-cloud'

// User-created custom provider
export interface UserProvider {
  id: string // UUID
  name: string // Display name (e.g., "AWS Bedrock")
  apiType: ProviderApiType // Which API format to use (determines runtime behavior)
  presetType: ProviderPresetType // Which field configuration to use
  createdAt: string // ISO date
}

// Saved configuration for a provider (supports multiple configs per provider)
export interface SavedProviderConfig {
  id: string // Unique identifier (UUID)
  name: string // Display name (e.g., "Work Account", "Personal")
  config: Record<string, string> // Field values (apiKey, endpoint, etc.)
  createdAt: string // ISO date
}

// Storage structure for all configs of a provider
export interface ProviderConfigs {
  activeConfigId: string | null
  configs: SavedProviderConfig[]
}

// Model configuration
export interface ModelConfig {
  id: string
  name: string
  provider: ProviderId
  model: string
  description?: string
  available: boolean
}

// Azure OpenAI configuration
export interface AzureConfig {
  apiKey: string
  endpoint: string
  deploymentName: string
  apiVersion: string
}
