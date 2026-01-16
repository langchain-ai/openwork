/* eslint-disable @typescript-eslint/no-unused-vars */
import { createDeepAgent } from 'deepagents'
import { getDefaultModel } from '../ipc/models'
import { getApiKey, getCheckpointDbPath } from '../storage'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { SqlJsSaver } from '../checkpointer/sqljs-saver'
import { LocalSandbox } from './local-sandbox'

import type * as _lcTypes from 'langchain'
import type * as _lcMessages from '@langchain/core/messages'
import type * as _lcLanggraph from '@langchain/langgraph'
import type * as _lcZodTypes from '@langchain/core/utils/types'

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

// Get the appropriate model instance based on configuration
function getModelInstance(modelId?: string): ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI | string {
  const model = modelId || getDefaultModel()
  console.log('[Runtime] Using model:', model)

  // Determine provider from model ID
  if (model.startsWith('claude')) {
    const apiKey = getApiKey('anthropic')
    console.log('[Runtime] Anthropic API key present:', !!apiKey)
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }
    return new ChatAnthropic({
      model,
      anthropicApiKey: apiKey
    })
  } else if (
    model.startsWith('gpt') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('o4')
  ) {
    const apiKey = getApiKey('openai')
    console.log('[Runtime] OpenAI API key present:', !!apiKey)
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }
    return new ChatOpenAI({
      model,
      apiKey: apiKey
    })
  } else if (model.startsWith('gemini')) {
    const apiKey = getApiKey('google')
    console.log('[Runtime] Google API key present:', !!apiKey)
    if (!apiKey) {
      throw new Error('Google API key not configured')
    }
    return new ChatGoogleGenerativeAI({
      model,
      apiKey: apiKey
    })
  } else if (model.startsWith('glm')) {
    const apiKey = getApiKey('zhipu')
    console.log('[Runtime] Zhipu/Z.ai API key present:', !!apiKey)
    if (!apiKey) {
      throw new Error('Zhipu/Z.ai API key not configured')
    }
    // Route GLM through OpenAI-compatible endpoint at z.ai
    return new ChatOpenAI({
      model,
      apiKey: apiKey,
      configuration: { baseURL: 'https://api.z.ai/api/paas/v4/' }
    })
  }

  // Default to model string (let deepagents handle it)
  return model
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
