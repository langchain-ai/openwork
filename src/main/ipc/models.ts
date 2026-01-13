import { IpcMain } from 'electron'
import Store from 'electron-store'
import type { ModelConfig } from '../types'

// Encrypted store for API keys
const store = new Store({
  name: 'openwork-settings',
  encryptionKey: 'openwork-encryption-key-v1' // In production, derive from machine ID
})

// Available models configuration
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    description: 'Latest Claude model, best for complex tasks',
    available: true
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    description: 'Excellent balance of speed and capability',
    available: true
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    description: 'Fast and efficient for simpler tasks',
    available: true
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    description: 'OpenAI flagship model',
    available: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    description: 'Smaller, faster GPT-4o variant',
    available: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    description: 'Google fast model',
    available: true
  }
]

export function registerModelHandlers(ipcMain: IpcMain) {
  // List available models
  ipcMain.handle('models:list', async () => {
    // Check which models have API keys configured
    return AVAILABLE_MODELS.map(model => ({
      ...model,
      available: hasApiKey(model.provider)
    }))
  })

  // Get default model
  ipcMain.handle('models:getDefault', async () => {
    return store.get('defaultModel', 'claude-sonnet-4-20250514') as string
  })

  // Set default model
  ipcMain.handle('models:setDefault', async (_event, modelId: string) => {
    store.set('defaultModel', modelId)
  })

  // Set API key for a provider
  ipcMain.handle('models:setApiKey', async (_event, { provider, apiKey }: { provider: string; apiKey: string }) => {
    store.set(`apiKeys.${provider}`, apiKey)
    
    // Also set as environment variable for the current session
    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY'
    }
    
    const envVar = envVarMap[provider]
    if (envVar) {
      process.env[envVar] = apiKey
    }
  })

  // Get API key for a provider
  ipcMain.handle('models:getApiKey', async (_event, provider: string) => {
    return store.get(`apiKeys.${provider}`, null) as string | null
  })

  // Sync version info
  ipcMain.on('app:version', (event) => {
    event.returnValue = require('../../package.json').version
  })
}

function hasApiKey(provider: string): boolean {
  // Check store first
  const storedKey = store.get(`apiKeys.${provider}`) as string | undefined
  if (storedKey) return true

  // Check environment variables
  const envVarMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY'
  }

  const envVar = envVarMap[provider]
  return envVar ? !!process.env[envVar] : false
}

// Export for use in agent runtime
export function getApiKey(provider: string): string | undefined {
  const storedKey = store.get(`apiKeys.${provider}`) as string | undefined
  if (storedKey) return storedKey

  const envVarMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY'
  }

  const envVar = envVarMap[provider]
  return envVar ? process.env[envVar] : undefined
}

export function getDefaultModel(): string {
  return store.get('defaultModel', 'claude-sonnet-4-20250514') as string
}
