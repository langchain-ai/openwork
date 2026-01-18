/* eslint-disable @typescript-eslint/no-unused-vars */
import { createDeepAgent } from 'deepagents'
import { getDefaultModel, getModelConfigById } from '../ipc/models'
import {
  getApiKey,
  getCheckpointDbPath,
  getActiveProviderConfig,
  getUserProviders
} from '../storage'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { SqlJsSaver } from '../checkpointer/sqljs-saver'
import { LocalSandbox } from './local-sandbox'

import type * as _lcTypes from 'langchain'
import type * as _lcMessages from '@langchain/core/messages'
import type * as _lcLanggraph from '@langchain/langgraph'
import type * as _lcZodTypes from '@langchain/core/utils/types'
import type { ProviderId, ProviderApiType } from '../../shared/types'
import { isBuiltInProvider } from '../../shared/providers'

import { BASE_SYSTEM_PROMPT } from './system-prompt'

/**
 * Generate the full system prompt for the agent.
 *
 * @param workspacePath - The workspace path the agent is operating in
 * @returns The complete system prompt
 */
function getSystemPrompt(workspacePath: string): string {
  const workingDirSection = `
### File System and Paths

**IMPORTANT - Path Handling:**
- All file paths use fully qualified absolute system paths
- The workspace root is: \`${workspacePath}\`
- Example: \`${workspacePath}/src/index.ts\`, \`${workspacePath}/README.md\`
- To list the workspace root, use \`ls("${workspacePath}")\`
- Always use full absolute paths for all file operations
`

  return workingDirSection + BASE_SYSTEM_PROMPT
}

// Singleton checkpointer instance
let checkpointer: SqlJsSaver | null = null

export async function getCheckpointer(): Promise<SqlJsSaver> {
  if (!checkpointer) {
    checkpointer = new SqlJsSaver(getCheckpointDbPath())
    await checkpointer.initialize()
  }
  return checkpointer
}

// Helper to extract base URL and instance name from Azure endpoint/URI
function parseAzureEndpoint(endpoint: string): { baseUrl: string; instanceName: string } {
  // Handle full URI like: https://resource.cognitiveservices.azure.com/openai/deployments/...
  // Or base URL like: https://resource.openai.azure.com
  // Or base URL like: https://resource.cognitiveservices.azure.com

  // Extract base URL (remove path after domain)
  const urlMatch = endpoint.match(/^(https?:\/\/[^/]+)/)
  const baseUrl = urlMatch ? urlMatch[1] : endpoint

  // Extract instance name from various Azure URL patterns
  const instanceMatch = baseUrl.match(
    /https?:\/\/([^.]+)\.(openai\.azure\.com|cognitiveservices\.azure\.com)/
  )
  const instanceName = instanceMatch ? instanceMatch[1] : baseUrl

  return { baseUrl, instanceName }
}

/**
 * Create the appropriate LLM instance based on the model configuration.
 *
 * This function:
 * 1. Looks up the ModelConfig by ID to get the actual API model name
 * 2. Uses ModelConfig.provider to determine which SDK to use
 * 3. Uses ModelConfig.model as the actual model name sent to the API
 * 4. Falls back to inferring provider from model ID prefix if not in AVAILABLE_MODELS
 *
 * @param modelId - The model ID (from AVAILABLE_MODELS or custom)
 * @returns An LLM instance configured for the appropriate provider
 */
function getModelInstance(
  modelId?: string
): ChatAnthropic | ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI | string {
  const selectedModelId = modelId || getDefaultModel()
  console.log('[Runtime] Selected model ID:', selectedModelId)

  // Look up the ModelConfig to get the actual API model name and provider
  const modelConfig = getModelConfigById(selectedModelId)

  if (modelConfig) {
    // Found in AVAILABLE_MODELS - use the config's model name and provider
    console.log('[Runtime] Found ModelConfig:', {
      id: modelConfig.id,
      model: modelConfig.model,
      provider: modelConfig.provider
    })
    return createLLMForProvider(modelConfig.provider, modelConfig.model)
  }

  // Not in AVAILABLE_MODELS - fall back to inferring provider from ID prefix
  // This supports custom models not in the predefined list
  console.log('[Runtime] Model not in AVAILABLE_MODELS, inferring provider from ID prefix')
  const inferredProvider = inferProviderFromModelId(selectedModelId)
  return createLLMForProvider(inferredProvider, selectedModelId)
}

/**
 * Infer the provider from a model ID based on naming conventions.
 * Used as fallback when model is not in AVAILABLE_MODELS.
 *
 * Special format: {providerId}:deployment - for custom provider deployments
 */
function inferProviderFromModelId(modelId: string): ProviderId {
  // Check for custom provider deployment format: {uuid}:deployment
  if (modelId.endsWith(':deployment')) {
    const providerId = modelId.replace(':deployment', '')
    // If it looks like a UUID, it's a custom provider
    if (providerId.includes('-') && providerId.length > 30) {
      return providerId
    }
  }

  if (modelId.startsWith('claude')) return 'anthropic'
  if (
    modelId.startsWith('gpt') ||
    modelId.startsWith('o1') ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4')
  )
    return 'openai'
  if (modelId.startsWith('gemini')) return 'google'
  // Default to anthropic if we can't determine
  return 'anthropic'
}

/**
 * Create an LLM instance for a specific provider with the given model name.
 *
 * For built-in providers (anthropic, openai, google), uses the provider's API key.
 * For custom providers, looks up the provider's apiType and uses the active config.
 *
 * @param provider - The provider ID (built-in or custom provider UUID)
 * @param modelName - The actual model name to send to the API
 * @returns An LLM instance configured for the provider
 */
function createLLMForProvider(
  provider: ProviderId,
  modelName: string
): ChatAnthropic | ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI | string {
  console.log('[Runtime] Creating LLM for provider:', provider, 'with model:', modelName)

  // Check for built-in providers first
  if (isBuiltInProvider(provider)) {
    return createLLMForBuiltInProvider(provider, modelName)
  }

  // Custom provider - look up its apiType and config
  return createLLMForCustomProvider(provider, modelName)
}

/**
 * Create LLM for built-in providers (anthropic, openai, google, ollama)
 */
function createLLMForBuiltInProvider(
  provider: 'anthropic' | 'openai' | 'google' | 'ollama',
  modelName: string
): ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI | string {
  switch (provider) {
    case 'anthropic': {
      const apiKey = getApiKey('anthropic')
      console.log('[Runtime] Anthropic API key present:', !!apiKey)
      if (!apiKey) {
        throw new Error('Anthropic API key not configured')
      }
      return new ChatAnthropic({
        model: modelName,
        anthropicApiKey: apiKey
      })
    }

    case 'openai': {
      const apiKey = getApiKey('openai')
      console.log('[Runtime] OpenAI API key present:', !!apiKey)
      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }
      return new ChatOpenAI({
        model: modelName,
        openAIApiKey: apiKey
      })
    }

    case 'google': {
      const apiKey = getApiKey('google')
      console.log('[Runtime] Google API key present:', !!apiKey)
      if (!apiKey) {
        throw new Error('Google API key not configured')
      }
      return new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: apiKey
      })
    }

    case 'ollama':
    default: {
      // Ollama or unknown - return model string and let deepagents handle it
      console.log('[Runtime] Ollama/unknown provider, returning model string:', modelName)
      return modelName
    }
  }
}

/**
 * Create LLM for custom providers.
 * Looks up the provider's apiType and uses the active config.
 */
function createLLMForCustomProvider(
  providerId: string,
  modelName: string
): ChatAnthropic | ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI | string {
  console.log('[Runtime] Creating LLM for custom provider:', providerId)

  // Find the custom provider to get its apiType
  const userProviders = getUserProviders()
  const customProvider = userProviders.find((p) => p.id === providerId)

  if (!customProvider) {
    console.log('[Runtime] Custom provider not found, returning model string:', modelName)
    return modelName
  }

  // Get the active config for this provider
  const activeConfig = getActiveProviderConfig(providerId)
  if (!activeConfig) {
    throw new Error(`No configuration found for provider "${customProvider.name}"`)
  }

  const apiType: ProviderApiType = customProvider.apiType
  console.log('[Runtime] Custom provider apiType:', apiType, 'config:', {
    modelName: activeConfig.config.modelName,
    endpoint: activeConfig.config.endpoint,
    hasApiKey: !!activeConfig.config.apiKey
  })

  // Create LLM based on apiType
  switch (apiType) {
    case 'azure': {
      // Azure-style API (uses endpoint, api key, model name, optional api version)
      const { endpoint, apiKey, apiVersion } = activeConfig.config
      if (!endpoint || !apiKey) {
        throw new Error(
          `Azure configuration incomplete for "${customProvider.name}". Please configure endpoint and API key.`
        )
      }
      const { instanceName } = parseAzureEndpoint(endpoint)
      const deploymentName = activeConfig.config.modelName || modelName
      return new AzureChatOpenAI({
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiInstanceName: instanceName,
        azureOpenAIApiDeploymentName: deploymentName,
        azureOpenAIApiVersion: apiVersion || '2024-05-01-preview'
      })
    }

    case 'openai': {
      // OpenAI-compatible API (uses api key, optional base URL)
      const { apiKey, endpoint } = activeConfig.config
      if (!apiKey) {
        throw new Error(`API key not configured for "${customProvider.name}"`)
      }
      const llmModel = activeConfig.config.modelName || modelName
      return new ChatOpenAI({
        model: llmModel,
        openAIApiKey: apiKey,
        configuration: endpoint ? { baseURL: endpoint } : undefined
      })
    }

    case 'anthropic': {
      // Anthropic-compatible API
      const { apiKey, endpoint } = activeConfig.config
      if (!apiKey) {
        throw new Error(`API key not configured for "${customProvider.name}"`)
      }
      const llmModel = activeConfig.config.modelName || modelName
      return new ChatAnthropic({
        model: llmModel,
        anthropicApiKey: apiKey,
        clientOptions: endpoint ? { baseURL: endpoint } : undefined
      })
    }

    case 'google': {
      // Google-compatible API
      const { apiKey } = activeConfig.config
      if (!apiKey) {
        throw new Error(`API key not configured for "${customProvider.name}"`)
      }
      const llmModel = activeConfig.config.modelName || modelName
      return new ChatGoogleGenerativeAI({
        model: llmModel,
        apiKey: apiKey
      })
    }

    default: {
      console.log('[Runtime] Unknown apiType, returning model string:', modelName)
      return modelName
    }
  }
}

export interface CreateAgentRuntimeOptions {
  /** Model ID to use (defaults to configured default model) */
  modelId?: string
  /** Workspace path - REQUIRED for agent to operate on files */
  workspacePath: string
}

// Create agent runtime with configured model and checkpointer
export type AgentRuntime = ReturnType<typeof createDeepAgent>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createAgentRuntime(options: CreateAgentRuntimeOptions) {
  const { modelId, workspacePath } = options

  if (!workspacePath) {
    throw new Error(
      'Workspace path is required. Please select a workspace folder before running the agent.'
    )
  }

  console.log('[Runtime] Creating agent runtime...')
  console.log('[Runtime] Workspace path:', workspacePath)

  const model = getModelInstance(modelId)
  console.log('[Runtime] Model instance created:', typeof model)

  const checkpointer = await getCheckpointer()
  console.log('[Runtime] Checkpointer ready')

  const backend = new LocalSandbox({
    rootDir: workspacePath,
    virtualMode: false, // Use absolute system paths for consistency with shell commands
    timeout: 120_000, // 2 minutes
    maxOutputBytes: 100_000 // ~100KB
  })

  const systemPrompt = getSystemPrompt(workspacePath)

  // Custom filesystem prompt for absolute paths (matches virtualMode: false)
  const filesystemSystemPrompt = `You have access to a filesystem. All file paths use fully qualified absolute system paths.

- ls: list files in a directory (e.g., ls("${workspacePath}"))
- read_file: read a file from the filesystem
- write_file: write to a file in the filesystem
- edit_file: edit a file in the filesystem
- glob: find files matching a pattern (e.g., "**/*.py")
- grep: search for text within files

The workspace root is: ${workspacePath}`

  const agent = createDeepAgent({
    model,
    checkpointer,
    backend,
    systemPrompt,
    // Custom filesystem prompt for absolute paths (requires deepagents update)
    filesystemSystemPrompt,
    // Require human approval for all shell commands
    interruptOn: { execute: true }
  } as Parameters<typeof createDeepAgent>[0])

  console.log('[Runtime] Deep agent created with LocalSandbox at:', workspacePath)
  return agent
}

export type DeepAgent = ReturnType<typeof createDeepAgent>

// Clean up resources
export async function closeRuntime(): Promise<void> {
  if (checkpointer) {
    await checkpointer.close()
    checkpointer = null
  }
}
