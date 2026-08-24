import { homedir } from "os"
import { join } from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import type { ProviderId, CustomEndpoint } from "./types"

const OPENWORK_DIR = join(homedir(), ".openwork")
const ENV_FILE = join(OPENWORK_DIR, ".env")
const ENDPOINTS_FILE = join(OPENWORK_DIR, "endpoints.json")

// Environment variable names for each provider
const ENV_VAR_NAMES: Record<Exclude<ProviderId, "custom">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  ollama: "" // Ollama doesn't require an API key
}

// Generate env var name for custom endpoint API key
function getCustomEndpointEnvVarName(endpointId: string): string {
  // Convert to uppercase and replace non-alphanumeric with underscore
  const sanitized = endpointId.toUpperCase().replace(/[^A-Z0-9]/g, "_")
  return `CUSTOM_ENDPOINT_${sanitized}_API_KEY`
}

export function getOpenworkDir(): string {
  if (!existsSync(OPENWORK_DIR)) {
    mkdirSync(OPENWORK_DIR, { recursive: true })
  }
  return OPENWORK_DIR
}

export function getDbPath(): string {
  return join(getOpenworkDir(), "openwork.sqlite")
}

export function getCheckpointDbPath(): string {
  return join(getOpenworkDir(), "langgraph.sqlite")
}

export function getThreadCheckpointDir(): string {
  const dir = join(getOpenworkDir(), "threads")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getThreadCheckpointPath(threadId: string): string {
  return join(getThreadCheckpointDir(), `${threadId}.sqlite`)
}

export function deleteThreadCheckpoint(threadId: string): void {
  const path = getThreadCheckpointPath(threadId)
  if (existsSync(path)) {
    unlinkSync(path)
  }
}

export function getEnvFilePath(): string {
  return ENV_FILE
}

// Read .env file and parse into object
function parseEnvFile(): Record<string, string> {
  const envPath = getEnvFilePath()
  if (!existsSync(envPath)) return {}

  const content = readFileSync(envPath, "utf-8")
  const result: Record<string, string> = {}

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
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
    .filter((entry) => entry[1])
    .map(([k, v]) => `${k}=${v}`)
  writeFileSync(getEnvFilePath(), lines.join("\n") + "\n")
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

// =============================================================================
// Custom Endpoint Management
// =============================================================================

// Read endpoints from JSON file
function readEndpointsFile(): CustomEndpoint[] {
  if (!existsSync(ENDPOINTS_FILE)) return []

  try {
    const content = readFileSync(ENDPOINTS_FILE, "utf-8")
    return JSON.parse(content) as CustomEndpoint[]
  } catch {
    return []
  }
}

// Write endpoints to JSON file
function writeEndpointsFile(endpoints: CustomEndpoint[]): void {
  getOpenworkDir() // ensure dir exists
  writeFileSync(ENDPOINTS_FILE, JSON.stringify(endpoints, null, 2))
}

// Get all custom endpoints
export function getCustomEndpoints(): CustomEndpoint[] {
  return readEndpointsFile()
}

// Get a specific custom endpoint by ID
export function getCustomEndpoint(id: string): CustomEndpoint | undefined {
  const endpoints = readEndpointsFile()
  return endpoints.find((e) => e.id === id)
}

// Save a custom endpoint (create or update)
export function saveCustomEndpoint(endpoint: CustomEndpoint): void {
  const endpoints = readEndpointsFile()
  const index = endpoints.findIndex((e) => e.id === endpoint.id)

  if (index >= 0) {
    endpoints[index] = endpoint
  } else {
    endpoints.push(endpoint)
  }

  writeEndpointsFile(endpoints)
}

// Delete a custom endpoint
export function deleteCustomEndpoint(id: string): void {
  const endpoints = readEndpointsFile()
  const filtered = endpoints.filter((e) => e.id !== id)
  writeEndpointsFile(filtered)

  // Also delete the API key
  deleteCustomEndpointApiKey(id)
}

// Get API key for a custom endpoint
export function getCustomEndpointApiKey(endpointId: string): string | undefined {
  const envVarName = getCustomEndpointEnvVarName(endpointId)

  // Check .env file first
  const env = parseEnvFile()
  if (env[envVarName]) return env[envVarName]

  // Fall back to process environment
  return process.env[envVarName]
}

// Set API key for a custom endpoint
export function setCustomEndpointApiKey(endpointId: string, apiKey: string): void {
  const envVarName = getCustomEndpointEnvVarName(endpointId)

  const env = parseEnvFile()
  env[envVarName] = apiKey
  writeEnvFile(env)

  // Also set in process.env for current session
  process.env[envVarName] = apiKey
}

// Delete API key for a custom endpoint
export function deleteCustomEndpointApiKey(endpointId: string): void {
  const envVarName = getCustomEndpointEnvVarName(endpointId)

  const env = parseEnvFile()
  delete env[envVarName]
  writeEnvFile(env)

  // Also clear from process.env
  delete process.env[envVarName]
}

// Check if custom endpoint has an API key
export function hasCustomEndpointApiKey(endpointId: string): boolean {
  return !!getCustomEndpointApiKey(endpointId)
}
