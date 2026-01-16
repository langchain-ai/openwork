import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const OPENWORK_DIR = join(homedir(), '.openwork')
const ENV_FILE = join(OPENWORK_DIR, '.env')

// Environment variable names for each provider
const ENV_VAR_NAMES: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY'
}

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

// Write object back to .env file
function writeEnvFile(env: Record<string, string>): void {
  getOpenworkDir() // ensure dir exists
  const lines = Object.entries(env)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
  writeFileSync(getEnvFilePath(), lines.join('\n') + '\n')
}

// API key management
export function getApiKey(provider: string): string | undefined {
  const envVarName = ENV_VAR_NAMES[provider]
  if (!envVarName) return undefined

  // Check .env file first
  const env = parseEnvFile()
  if (env[envVarName]) return env[envVarName]

  // Fall back to process environment
  return process.env[envVarName]
}

export function setApiKey(provider: string, apiKey: string): void {
  const envVarName = ENV_VAR_NAMES[provider]
  if (!envVarName) return

  const env = parseEnvFile()
  env[envVarName] = apiKey
  writeEnvFile(env)

  // Also set in process.env for current session
  process.env[envVarName] = apiKey
}

export function deleteApiKey(provider: string): void {
  const envVarName = ENV_VAR_NAMES[provider]
  if (!envVarName) return

  const env = parseEnvFile()
  delete env[envVarName]
  writeEnvFile(env)

  // Also clear from process.env
  delete process.env[envVarName]
}

export function hasApiKey(provider: string): boolean {
  return !!getApiKey(provider)
}

// Azure OpenAI configuration interface
export interface AzureConfig {
  endpoint: string
  deployment: string
  apiVersion: string
}

// Parse Azure Target URI (e.g., https://AIF-ABL.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2024-05-01-preview)
// Returns endpoint (base URL) and apiVersion, or null if parsing fails
function parseAzureTargetUri(targetUri: string): { endpoint: string; apiVersion: string } | null {
  try {
    const url = new URL(targetUri)
    const apiVersion = url.searchParams.get('api-version')
    
    if (!apiVersion) {
      return null
    }
    
    // Extract base endpoint: remove /deployments/... and query params
    const pathParts = url.pathname.split('/')
    const deploymentsIndex = pathParts.indexOf('deployments')
    if (deploymentsIndex === -1) {
      return null
    }
    
    // Build base endpoint: protocol + host + path up to /openai
    const basePath = pathParts.slice(0, deploymentsIndex).join('/')
    const endpoint = `${url.protocol}//${url.host}${basePath}`
    
    return { endpoint, apiVersion }
  } catch {
    return null
  }
}

// Normalize Azure endpoint: store as origin (no trailing slash) and strip any /openai/... suffix.
function normalizeAzureEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim()

  // AzureChatOpenAI expects a base endpoint (e.g. https://<resource>.openai.azure.com/)
  // The Azure portal often provides URLs that include /openai/... which we should strip.
  try {
    const url = new URL(trimmed)

    // Some Azure portals show `https://<resource>.cognitiveservices.azure.com/openai/...`
    // LangChain's Azure OpenAI utilities expect the OpenAI host form:
    // `https://<resource>.openai.azure.com/`
    const host = url.host.toLowerCase()
    if (host.endsWith('.cognitiveservices.azure.com')) {
      const resourceName = url.host.split('.')[0]
      url.host = `${resourceName}.openai.azure.com`
    }

    const pathname = url.pathname || '/'
    const openaiIndex = pathname.toLowerCase().indexOf('/openai')
    const basePath = openaiIndex >= 0 ? pathname.slice(0, openaiIndex) : pathname

    // Persist without a trailing slash to avoid accidental `//openai/...` when composing URLs.
    const normalizedBasePath = basePath === '/' ? '' : basePath
    url.pathname = normalizedBasePath
    url.search = ''
    url.hash = ''

    // Use origin + pathname to avoid `https://host/` trailing slash when pathname is empty.
    return `${url.origin}${url.pathname}`
  } catch {
    const openaiIndex = trimmed.toLowerCase().indexOf('/openai')
    const base = openaiIndex >= 0 ? trimmed.slice(0, openaiIndex) : trimmed
    return base.endsWith('/') ? base.slice(0, -1) : base
  }
}

// Get Azure OpenAI configuration
export function getAzureConfig(): AzureConfig | null {
  const env = parseEnvFile()
  
  const endpoint = env.AZURE_OPENAI_ENDPOINT
  const deployment = env.AZURE_OPENAI_DEPLOYMENT
  const apiVersion = env.AZURE_OPENAI_API_VERSION
  
  if (!endpoint || !deployment || !apiVersion) {
    return null
  }
  
  return {
    endpoint: normalizeAzureEndpoint(endpoint),
    deployment,
    apiVersion
  }
}

// Set Azure OpenAI configuration
export function setAzureConfig(config: AzureConfig): void {
  const env = parseEnvFile()
  
  env.AZURE_OPENAI_ENDPOINT = normalizeAzureEndpoint(config.endpoint)
  env.AZURE_OPENAI_DEPLOYMENT = config.deployment
  env.AZURE_OPENAI_API_VERSION = config.apiVersion
  
  writeEnvFile(env)
}

// Set Azure endpoint (accepts either base endpoint or full Target URI)
export function setAzureEndpoint(endpointOrUri: string): { endpoint: string; apiVersion?: string } | null {
  const parsed = parseAzureTargetUri(endpointOrUri)
  
  if (parsed) {
    // User pasted Target URI - extract endpoint and apiVersion
    const env = parseEnvFile()
    env.AZURE_OPENAI_ENDPOINT = normalizeAzureEndpoint(parsed.endpoint)
    if (parsed.apiVersion) {
      env.AZURE_OPENAI_API_VERSION = parsed.apiVersion
    }
    writeEnvFile(env)
    return { endpoint: parsed.endpoint, apiVersion: parsed.apiVersion }
  } else {
    // User pasted base endpoint - just store it
    const env = parseEnvFile()
    env.AZURE_OPENAI_ENDPOINT = normalizeAzureEndpoint(endpointOrUri)
    writeEnvFile(env)
    return { endpoint: normalizeAzureEndpoint(endpointOrUri) }
  }
}

// Check if Azure OpenAI is fully configured (needs key + endpoint + deployment + apiVersion)
export function hasAzureConfig(): boolean {
  const apiKey = getApiKey('azure')
  const config = getAzureConfig()
  return !!apiKey && !!config
}

// Check if a provider is configured (handles special cases like Azure)
export function isProviderConfigured(provider: string): boolean {
  if (provider === 'azure') {
    return hasAzureConfig()
  }
  return hasApiKey(provider)
}
