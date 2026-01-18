import type {
  ProviderId,
  BuiltInProviderId,
  UserProvider,
  ProviderApiType,
  ModelSelectionType,
  ProviderPresetType
} from './types'

// Field configuration for provider config dialogs
export interface FieldConfig {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'password' | 'url'
  envVar: string // Environment variable name for this field
  helpText?: string
  generatable?: boolean // Show refresh button to generate random name
}

// Note: ModelSelectionType is imported from ./types
// 'multi' - One API key accesses multiple models (Anthropic, OpenAI, Google, etc.)
// 'deployment' - One config = one model (Azure, custom deployment-based providers)

// Provider metadata configuration
export interface ProviderMeta {
  id: ProviderId
  name: string
  fields: FieldConfig[] // All providers now have fields config
  requiresConfig: boolean // Whether provider needs configuration
  nameField: string // Which field to use as the config display name
  modelSelection: ModelSelectionType // How models are selected for this provider
  isCustom?: boolean // True for user-created providers
}

export const PROVIDER_REGISTRY: Record<BuiltInProviderId, ProviderMeta> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    requiresConfig: true,
    nameField: 'configName',
    modelSelection: 'multi', // One API key accesses all Claude models
    fields: [
      {
        key: 'configName',
        label: 'Configuration Name',
        placeholder: 'swift-falcon',
        type: 'text',
        envVar: '', // Not stored in env
        generatable: true,
        helpText: 'A friendly name to identify this configuration'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'sk-ant-...',
        type: 'password',
        envVar: 'ANTHROPIC_API_KEY'
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    requiresConfig: true,
    nameField: 'configName',
    modelSelection: 'multi', // One API key accesses GPT-4, GPT-3.5, o1, etc.
    fields: [
      {
        key: 'configName',
        label: 'Configuration Name',
        placeholder: 'brave-tiger',
        type: 'text',
        envVar: '', // Not stored in env
        generatable: true,
        helpText: 'A friendly name to identify this configuration'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'sk-...',
        type: 'password',
        envVar: 'OPENAI_API_KEY'
      }
    ]
  },
  google: {
    id: 'google',
    name: 'Google',
    requiresConfig: true,
    nameField: 'configName',
    modelSelection: 'multi', // One API key accesses all Gemini models
    fields: [
      {
        key: 'configName',
        label: 'Configuration Name',
        placeholder: 'quick-sparrow',
        type: 'text',
        envVar: '', // Not stored in env
        generatable: true,
        helpText: 'A friendly name to identify this configuration'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'AIza...',
        type: 'password',
        envVar: 'GOOGLE_API_KEY'
      }
    ]
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    requiresConfig: false,
    nameField: '',
    modelSelection: 'multi', // Local models, multiple available
    fields: [] // Ollama runs locally, no config needed
  }
}

// =============================================================================
// Custom Provider Field Configurations (Preset-based)
// =============================================================================
// Three preset patterns based on authentication type:
// - API: Standard API with Target URI + API Key + optional Version
// - AWS IAM: AWS credentials (Access Key ID, Secret Access Key, Region)
// - Google Cloud: Service Account (Project ID, Region, Service Account JSON)

/**
 * Fields for API preset (standard REST API)
 * Used for: Azure AI Foundry, Mistral, Together.ai, custom deployments, etc.
 * Similar to Azure Foundry pattern with Target URI, API Key, and optional version
 */
export const API_PRESET_FIELDS: FieldConfig[] = [
  {
    key: 'modelName',
    label: 'Model Name',
    placeholder: 'gpt-4-turbo',
    type: 'text',
    envVar: '',
    helpText: 'The model identifier (also used as configuration display name)'
  },
  {
    key: 'endpoint',
    label: 'Target URI',
    placeholder: 'https://your-endpoint.example.com/v1/chat/completions',
    type: 'url',
    envVar: '',
    helpText:
      'The full API endpoint URL. If it contains api-version parameter, it will be extracted automatically.'
  },
  {
    key: 'apiKey',
    label: 'API Key',
    placeholder: 'Enter your API key',
    type: 'password',
    envVar: ''
  },
  {
    key: 'apiVersion',
    label: 'API Version (optional)',
    placeholder: '2024-05-01-preview',
    type: 'text',
    envVar: '',
    helpText: 'Auto-filled if present in Target URI, or enter manually if required'
  }
]

/**
 * Fields for AWS IAM preset
 * Used for: AWS Bedrock
 */
export const AWS_IAM_PRESET_FIELDS: FieldConfig[] = [
  {
    key: 'modelName',
    label: 'Model Name',
    placeholder: 'anthropic.claude-3-sonnet-20240229-v1:0',
    type: 'text',
    envVar: '',
    helpText: 'The Bedrock model ID (also used as configuration display name)'
  },
  {
    key: 'accessKeyId',
    label: 'Access Key ID',
    placeholder: 'AKIAIOSFODNN7EXAMPLE',
    type: 'text',
    envVar: ''
  },
  {
    key: 'secretAccessKey',
    label: 'Secret Access Key',
    placeholder: 'Enter your secret access key',
    type: 'password',
    envVar: ''
  },
  {
    key: 'region',
    label: 'AWS Region',
    placeholder: 'us-east-1',
    type: 'text',
    envVar: '',
    helpText: 'The AWS region where Bedrock is available'
  }
]

/**
 * Fields for Google Cloud preset
 * Used for: Google Vertex AI
 */
export const GOOGLE_CLOUD_PRESET_FIELDS: FieldConfig[] = [
  {
    key: 'modelName',
    label: 'Model Name',
    placeholder: 'gemini-1.5-pro',
    type: 'text',
    envVar: '',
    helpText: 'The Vertex AI model ID (also used as configuration display name)'
  },
  {
    key: 'projectId',
    label: 'Project ID',
    placeholder: 'my-gcp-project',
    type: 'text',
    envVar: '',
    helpText: 'Your Google Cloud project ID'
  },
  {
    key: 'region',
    label: 'Region',
    placeholder: 'us-central1',
    type: 'text',
    envVar: '',
    helpText: 'The GCP region for Vertex AI'
  },
  {
    key: 'serviceAccountJson',
    label: 'Service Account JSON',
    placeholder: 'Paste your service account JSON key',
    type: 'password',
    envVar: '',
    helpText: 'The full JSON content of your service account key file'
  }
]

/**
 * Get the field configuration for a given preset type
 */
export function getFieldsForPreset(presetType: ProviderPresetType): FieldConfig[] {
  switch (presetType) {
    case 'api':
      return API_PRESET_FIELDS
    case 'aws-iam':
      return AWS_IAM_PRESET_FIELDS
    case 'google-cloud':
      return GOOGLE_CLOUD_PRESET_FIELDS
    default:
      return API_PRESET_FIELDS
  }
}

/**
 * Get the name field key for a given preset type
 * All presets use modelName as the display name
 */
export function getNameFieldForPreset(presetType: ProviderPresetType): string {
  // All presets use modelName as display name, but keeping parameter for future flexibility
  void presetType
  return 'modelName'
}

/**
 * Preset type display information
 */
export const PRESET_INFO: Record<ProviderPresetType, { name: string; description: string }> = {
  api: {
    name: 'API',
    description: 'Standard REST API with endpoint URL and API key'
  },
  'aws-iam': {
    name: 'AWS IAM',
    description: 'AWS Bedrock with IAM credentials'
  },
  'google-cloud': {
    name: 'Google Cloud',
    description: 'Vertex AI with service account'
  }
}

// Legacy aliases for backwards compatibility
export const MULTI_MODEL_FIELDS = API_PRESET_FIELDS
export const DEPLOYMENT_FIELDS = API_PRESET_FIELDS

export function getFieldsForModelSelection(modelSelection: ModelSelectionType): FieldConfig[] {
  void modelSelection
  return API_PRESET_FIELDS
}

export function getNameFieldForModelSelection(modelSelection: ModelSelectionType): string {
  void modelSelection
  return 'modelName'
}

/**
 * API type display information
 * API type determines which SDK/runtime to use, not the field configuration
 */
export const API_TYPE_INFO: Record<ProviderApiType, { name: string; description: string }> = {
  openai: {
    name: 'OpenAI',
    description: 'OpenAI API format (GPT models, Together.ai, Groq, local servers)'
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Anthropic API format (Claude models)'
  },
  google: {
    name: 'Google',
    description: 'Google AI API format (Gemini models)'
  },
  azure: {
    name: 'Azure OpenAI',
    description: 'Azure OpenAI API format'
  }
}

/**
 * Model selection type display information
 */
export const MODEL_SELECTION_INFO: Record<
  ModelSelectionType,
  { name: string; description: string }
> = {
  multi: {
    name: 'Multi-Model',
    description: 'One API key accesses multiple models (you pick from a dropdown)'
  },
  deployment: {
    name: 'Deployment-Based',
    description: 'Each configuration is a specific model/deployment'
  }
}

// Legacy aliases for backwards compatibility
export const CUSTOM_PROVIDER_FIELDS = DEPLOYMENT_FIELDS
export function getFieldsForApiType(apiType: ProviderApiType): FieldConfig[] {
  // Azure uses deployment fields, others use multi-model fields
  return apiType === 'azure' ? DEPLOYMENT_FIELDS : MULTI_MODEL_FIELDS
}
export function getNameFieldForApiType(apiType: ProviderApiType): string {
  return apiType === 'azure' ? 'deploymentName' : 'configName'
}
export function getDefaultModelSelectionForApiType(apiType: ProviderApiType): ModelSelectionType {
  return apiType === 'azure' ? 'deployment' : 'multi'
}

// Helper to create ProviderMeta for a custom provider
export function createCustomProviderMeta(userProvider: UserProvider): ProviderMeta {
  const presetType = userProvider.presetType || 'api'
  return {
    id: userProvider.id,
    name: userProvider.name,
    fields: getFieldsForPreset(presetType),
    requiresConfig: true,
    nameField: getNameFieldForPreset(presetType),
    modelSelection: 'deployment', // Custom providers always use deployment mode (each config IS a model)
    isCustom: true
  }
}

// Helper to check if a provider ID is a built-in provider
export function isBuiltInProvider(providerId: string): providerId is BuiltInProviderId {
  return providerId in PROVIDER_REGISTRY
}

// Helper to get provider by ID (supports both built-in and custom)
export function getProviderMeta(
  providerId: ProviderId,
  userProviders?: UserProvider[]
): ProviderMeta | null {
  // Check built-in providers first
  if (isBuiltInProvider(providerId)) {
    return PROVIDER_REGISTRY[providerId]
  }

  // Check custom providers
  if (userProviders) {
    const customProvider = userProviders.find((p) => p.id === providerId)
    if (customProvider) {
      return createCustomProviderMeta(customProvider)
    }
  }

  return null
}

// Get list of all built-in providers that require configuration
export function getConfigurableProviders(): ProviderMeta[] {
  return Object.values(PROVIDER_REGISTRY).filter((p) => p.requiresConfig)
}
