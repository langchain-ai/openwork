import { IpcMain, dialog, app } from "electron"
import Store from "electron-store"
import * as fs from "fs/promises"
import * as path from "path"
import type {
  ModelConfig,
  Provider,
  SetApiKeyParams,
  WorkspaceSetParams,
  WorkspaceLoadParams,
  WorkspaceFileParams,
  CustomEndpoint,
  CreateEndpointParams,
  UpdateEndpointParams
} from "../types"
import { startWatching, stopWatching } from "../services/workspace-watcher"
import {
  getOpenworkDir,
  getApiKey,
  setApiKey,
  deleteApiKey,
  hasApiKey,
  getCustomEndpoints,
  getCustomEndpoint,
  saveCustomEndpoint,
  deleteCustomEndpoint,
  getCustomEndpointApiKey,
  setCustomEndpointApiKey,
  hasCustomEndpointApiKey
} from "../storage"

// Store for non-sensitive settings only (no encryption needed)
const store = new Store({
  name: "settings",
  cwd: getOpenworkDir()
})

// Provider configurations
const PROVIDERS: Omit<Provider, "hasApiKey">[] = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai", name: "OpenAI" },
  { id: "google", name: "Google" }
]

// Available models configuration (updated Jan 2026)
const AVAILABLE_MODELS: ModelConfig[] = [
  // Anthropic Claude 4.5 series (latest as of Jan 2026)
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    model: "claude-opus-4-5-20251101",
    description: "Premium model with maximum intelligence",
    available: true
  },
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    description: "Best balance of intelligence, speed, and cost for agents",
    available: true
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    description: "Fastest model with near-frontier intelligence",
    available: true
  },
  // Anthropic Claude legacy models
  {
    id: "claude-opus-4-1-20250805",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    model: "claude-opus-4-1-20250805",
    description: "Previous generation premium model with extended thinking",
    available: true
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    description: "Fast and capable previous generation model",
    available: true
  },
  // OpenAI GPT-5 series (latest as of Jan 2026)
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    model: "gpt-5.2",
    description: "Latest flagship with enhanced coding and agentic capabilities",
    available: true
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "openai",
    model: "gpt-5.1",
    description: "Advanced reasoning and robust performance",
    available: true
  },
  // OpenAI o-series reasoning models
  {
    id: "o3",
    name: "o3",
    provider: "openai",
    model: "o3",
    description: "Advanced reasoning for complex problem-solving",
    available: true
  },
  {
    id: "o3-mini",
    name: "o3 Mini",
    provider: "openai",
    model: "o3-mini",
    description: "Cost-effective reasoning with faster response times",
    available: true
  },
  {
    id: "o4-mini",
    name: "o4 Mini",
    provider: "openai",
    model: "o4-mini",
    description: "Fast, efficient reasoning model succeeding o3",
    available: true
  },
  {
    id: "o1",
    name: "o1",
    provider: "openai",
    model: "o1",
    description: "Premium reasoning for research, coding, math and science",
    available: true
  },
  // OpenAI GPT-4 series
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    model: "gpt-4.1",
    description: "Strong instruction-following with 1M context window",
    available: true
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    model: "gpt-4.1-mini",
    description: "Faster, smaller version balancing performance and efficiency",
    available: true
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    model: "gpt-4.1-nano",
    description: "Most cost-efficient for lighter tasks",
    available: true
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    model: "gpt-4o",
    description: "Versatile model for text generation and comprehension",
    available: true
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    model: "gpt-4o-mini",
    description: "Cost-efficient variant with faster response times",
    available: true
  },
  // Google Gemini models
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "google",
    model: "gemini-3-pro-preview",
    description: "State-of-the-art reasoning and multimodal understanding",
    available: true
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "google",
    model: "gemini-3-flash-preview",
    description: "Fast frontier-class model with low latency and cost",
    available: true
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    model: "gemini-2.5-pro",
    description: "High-capability model for complex reasoning and coding",
    available: true
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    model: "gemini-2.5-flash",
    description: "Lightning-fast with balance of intelligence and latency",
    available: true
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    model: "gemini-2.5-flash-lite",
    description: "Fast, low-cost, high-performance model",
    available: true
  }
]

export function registerModelHandlers(ipcMain: IpcMain): void {
  // List available models (including custom endpoint models)
  ipcMain.handle("models:list", async () => {
    // Built-in models with API key availability
    const builtInModels = AVAILABLE_MODELS.map((model) => ({
      ...model,
      available: hasApiKey(model.provider)
    }))

    // Custom endpoint models
    const customEndpoints = getCustomEndpoints()
    const customModels: ModelConfig[] = []

    for (const endpoint of customEndpoints) {
      if (endpoint.models && endpoint.models.length > 0) {
        for (const modelName of endpoint.models) {
          customModels.push({
            id: `custom:${endpoint.id}:${modelName}`,
            name: modelName,
            provider: "custom",
            model: modelName,
            description: `via ${endpoint.name}`,
            available: hasCustomEndpointApiKey(endpoint.id),
            endpointId: endpoint.id
          })
        }
      }
    }

    return [...builtInModels, ...customModels]
  })

  // Get default model
  ipcMain.handle("models:getDefault", async () => {
    return store.get("defaultModel", "claude-sonnet-4-5-20250929") as string
  })

  // Set default model
  ipcMain.handle("models:setDefault", async (_event, modelId: string) => {
    store.set("defaultModel", modelId)
  })

  // Set API key for a provider (stored in ~/.openwork/.env)
  ipcMain.handle("models:setApiKey", async (_event, { provider, apiKey }: SetApiKeyParams) => {
    setApiKey(provider, apiKey)
  })

  // Get API key for a provider (from ~/.openwork/.env or process.env)
  ipcMain.handle("models:getApiKey", async (_event, provider: string) => {
    return getApiKey(provider) ?? null
  })

  // Delete API key for a provider
  ipcMain.handle("models:deleteApiKey", async (_event, provider: string) => {
    deleteApiKey(provider)
  })

  // List providers with their API key status (including custom endpoints)
  ipcMain.handle("models:listProviders", async () => {
    // Built-in providers
    const builtInProviders = PROVIDERS.map((provider) => ({
      ...provider,
      hasApiKey: hasApiKey(provider.id)
    }))

    // Custom endpoints as providers
    const customEndpoints = getCustomEndpoints()
    const customProviders: Provider[] = customEndpoints.map((endpoint) => ({
      id: "custom" as const,
      name: endpoint.name,
      hasApiKey: hasCustomEndpointApiKey(endpoint.id),
      endpointId: endpoint.id
    }))

    return [...builtInProviders, ...customProviders]
  })

  // =============================================================================
  // Custom Endpoint Handlers
  // =============================================================================

  // List all custom endpoints
  ipcMain.handle("endpoints:list", async () => {
    return getCustomEndpoints()
  })

  // Get a single custom endpoint
  ipcMain.handle("endpoints:get", async (_event, id: string) => {
    return getCustomEndpoint(id) ?? null
  })

  // Create a new custom endpoint
  ipcMain.handle("endpoints:create", async (_event, params: CreateEndpointParams) => {
    const { id, name, baseUrl, apiKey } = params

    // Check if endpoint with this ID already exists
    const existing = getCustomEndpoint(id)
    if (existing) {
      throw new Error(`Endpoint with ID "${id}" already exists`)
    }

    // Create endpoint
    const endpoint: CustomEndpoint = {
      id,
      name,
      baseUrl,
      models: []
    }

    saveCustomEndpoint(endpoint)
    setCustomEndpointApiKey(id, apiKey)

    return endpoint
  })

  // Update an existing custom endpoint
  ipcMain.handle("endpoints:update", async (_event, params: UpdateEndpointParams) => {
    const { id, updates } = params

    const existing = getCustomEndpoint(id)
    if (!existing) {
      throw new Error(`Endpoint with ID "${id}" not found`)
    }

    // Update endpoint properties
    const updated: CustomEndpoint = {
      ...existing,
      ...updates
    }

    saveCustomEndpoint(updated)

    // Update API key if provided
    if (updates.apiKey) {
      setCustomEndpointApiKey(id, updates.apiKey)
    }

    return updated
  })

  // Delete a custom endpoint
  ipcMain.handle("endpoints:delete", async (_event, id: string) => {
    deleteCustomEndpoint(id)
  })

  // Discover models from a custom endpoint's /models API
  ipcMain.handle("endpoints:discoverModels", async (_event, id: string) => {
    const endpoint = getCustomEndpoint(id)
    if (!endpoint) {
      throw new Error(`Endpoint with ID "${id}" not found`)
    }

    const apiKey = getCustomEndpointApiKey(id)
    if (!apiKey) {
      throw new Error(`No API key configured for endpoint "${id}"`)
    }

    // Normalize base URL (remove trailing slash)
    const baseUrl = endpoint.baseUrl.replace(/\/+$/, "")
    const modelsUrl = `${baseUrl}/models`

    try {
      const response = await fetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> }

      // OpenAI-compatible /models endpoint returns { data: [{ id: "model-name", ... }, ...] }
      const models = data.data?.map((m) => m.id) ?? []

      // Update endpoint with discovered models
      const updated: CustomEndpoint = {
        ...endpoint,
        models
      }
      saveCustomEndpoint(updated)

      return models
    } catch (error) {
      throw new Error(
        `Failed to discover models: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })

  // Test connection to a custom endpoint (validates API key and base URL)
  ipcMain.handle(
    "endpoints:testConnection",
    async (_event, { baseUrl, apiKey }: { baseUrl: string; apiKey: string }) => {
      // Normalize base URL (remove trailing slash)
      const normalizedUrl = baseUrl.replace(/\/+$/, "")
      const modelsUrl = `${normalizedUrl}/models`

      try {
        const response = await fetch(modelsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          }
        }

        const data = (await response.json()) as { data?: Array<{ id: string }> }
        const models = data.data?.map((m) => m.id) ?? []

        return {
          success: true,
          models
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Connection failed"
        }
      }
    }
  )

  // Sync version info
  ipcMain.on("app:version", (event) => {
    event.returnValue = app.getVersion()
  })

  // Get workspace path for a thread (from thread metadata)
  ipcMain.handle("workspace:get", async (_event, threadId?: string) => {
    if (!threadId) {
      // Fallback to global setting for backwards compatibility
      return store.get("workspacePath", null) as string | null
    }

    // Get from thread metadata via threads:get
    const { getThread } = await import("../db")
    const thread = getThread(threadId)
    if (!thread?.metadata) return null

    const metadata = JSON.parse(thread.metadata)
    return metadata.workspacePath || null
  })

  // Set workspace path for a thread (stores in thread metadata)
  ipcMain.handle(
    "workspace:set",
    async (_event, { threadId, path: newPath }: WorkspaceSetParams) => {
      if (!threadId) {
        // Fallback to global setting
        if (newPath) {
          store.set("workspacePath", newPath)
        } else {
          store.delete("workspacePath")
        }
        return newPath
      }

      const { getThread, updateThread } = await import("../db")
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
  ipcMain.handle("workspace:select", async (_event, threadId?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Select Workspace Folder",
      message: "Choose a folder for the agent to work in"
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    if (threadId) {
      const { getThread, updateThread } = await import("../db")
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
      store.set("workspacePath", selectedPath)
    }

    return selectedPath
  })

  // Load files from disk into the workspace view
  ipcMain.handle("workspace:loadFromDisk", async (_event, { threadId }: WorkspaceLoadParams) => {
    const { getThread } = await import("../db")

    // Get workspace path from thread metadata
    const thread = getThread(threadId)
    const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
    const workspacePath = metadata.workspacePath as string | null

    if (!workspacePath) {
      return { success: false, error: "No workspace folder linked", files: [] }
    }

    try {
      const files: Array<{
        path: string
        is_dir: boolean
        size?: number
        modified_at?: string
      }> = []

      // Recursively read directory
      async function readDir(dirPath: string, relativePath: string = ""): Promise<void> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          // Skip hidden files and common non-project files
          if (entry.name.startsWith(".") || entry.name === "node_modules") {
            continue
          }

          const fullPath = path.join(dirPath, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            files.push({
              path: "/" + relPath,
              is_dir: true
            })
            await readDir(fullPath, relPath)
          } else {
            const stat = await fs.stat(fullPath)
            files.push({
              path: "/" + relPath,
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
        error: e instanceof Error ? e.message : "Unknown error",
        files: []
      }
    }
  })

  // Read a single file's contents from disk
  ipcMain.handle(
    "workspace:readFile",
    async (_event, { threadId, filePath }: WorkspaceFileParams) => {
      const { getThread } = await import("../db")

      // Get workspace path from thread metadata
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | null

      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder linked"
        }
      }

      try {
        // Convert virtual path to full disk path
        const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath
        const fullPath = path.join(workspacePath, relativePath)

        // Security check: ensure the resolved path is within the workspace
        const resolvedPath = path.resolve(fullPath)
        const resolvedWorkspace = path.resolve(workspacePath)
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
          return { success: false, error: "Access denied: path outside workspace" }
        }

        // Check if file exists
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          return { success: false, error: "Cannot read directory as file" }
        }

        // Read file contents
        const content = await fs.readFile(fullPath, "utf-8")

        return {
          success: true,
          content,
          size: stat.size,
          modified_at: stat.mtime.toISOString()
        }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error"
        }
      }
    }
  )

  // Read a binary file (images, PDFs, etc.) and return as base64
  ipcMain.handle(
    "workspace:readBinaryFile",
    async (_event, { threadId, filePath }: WorkspaceFileParams) => {
      const { getThread } = await import("../db")

      // Get workspace path from thread metadata
      const thread = getThread(threadId)
      const metadata = thread?.metadata ? JSON.parse(thread.metadata) : {}
      const workspacePath = metadata.workspacePath as string | null

      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder linked"
        }
      }

      try {
        // Convert virtual path to full disk path
        const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath
        const fullPath = path.join(workspacePath, relativePath)

        // Security check: ensure the resolved path is within the workspace
        const resolvedPath = path.resolve(fullPath)
        const resolvedWorkspace = path.resolve(workspacePath)
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
          return { success: false, error: "Access denied: path outside workspace" }
        }

        // Check if file exists
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          return { success: false, error: "Cannot read directory as file" }
        }

        // Read file as binary and convert to base64
        const buffer = await fs.readFile(fullPath)
        const base64 = buffer.toString("base64")

        return {
          success: true,
          content: base64,
          size: stat.size,
          modified_at: stat.mtime.toISOString()
        }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error"
        }
      }
    }
  )
}

// Re-export getApiKey from storage for use in agent runtime
export { getApiKey } from "../storage"

export function getDefaultModel(): string {
  return store.get("defaultModel", "claude-sonnet-4-5-20250929") as string
}
