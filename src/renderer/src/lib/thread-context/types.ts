import type { Message, Todo, FileInfo, Subagent, HITLRequest } from '@/types'
import type { useStream } from '@langchain/langgraph-sdk/react'
import type { DeepAgent } from '../../../../main/agent/types'

// Open file tab type
export interface OpenFile {
  path: string
  name: string
}

// Token usage tracking for context window monitoring
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
  lastUpdated: Date
}

// Per-thread state (persisted/restored from checkpoints)
export interface ThreadState {
  messages: Message[]
  todos: Todo[]
  workspaceFiles: FileInfo[]
  workspacePath: string | null
  subagents: Subagent[]
  pendingApproval: HITLRequest | null
  error: string | null
  currentModel: string
  openFiles: OpenFile[]
  activeTab: 'agent' | string
  fileContents: Record<string, string>
  tokenUsage: TokenUsage | null
}

// Stream instance type
export type StreamInstance = ReturnType<typeof useStream<DeepAgent>>

// Stream data that we want to be reactive
export interface StreamData {
  messages: StreamInstance['messages']
  isLoading: boolean
  stream: StreamInstance | null
}

// Actions available on a thread
export interface ThreadActions {
  appendMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setTodos: (todos: Todo[]) => void
  setWorkspaceFiles: (files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => void
  setWorkspacePath: (path: string | null) => void
  setSubagents: (subagents: Subagent[]) => void
  setPendingApproval: (request: HITLRequest | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCurrentModel: (modelId: string) => void
  openFile: (path: string, name: string) => void
  closeFile: (path: string) => void
  setActiveTab: (tab: 'agent' | string) => void
  setFileContents: (path: string, content: string) => void
}

// Context value
export interface ThreadContextValue {
  getThreadState: (threadId: string) => ThreadState
  getThreadActions: (threadId: string) => ThreadActions
  initializeThread: (threadId: string) => void
  cleanupThread: (threadId: string) => void
  // Stream subscription
  subscribeToStream: (threadId: string, callback: () => void) => () => void
  getStreamData: (threadId: string) => StreamData
}

// Custom event types from the stream
export interface CustomEventData {
  type?: string
  request?: HITLRequest
  files?: Array<{ path: string; is_dir?: boolean; size?: number }>
  path?: string
  subagents?: Array<{
    id?: string
    name?: string
    description?: string
    status?: string
    startedAt?: Date
    completedAt?: Date
  }>
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
  }
}

// Default thread state
export const createDefaultThreadState = (): ThreadState => ({
  messages: [],
  todos: [],
  workspaceFiles: [],
  workspacePath: null,
  subagents: [],
  pendingApproval: null,
  error: null,
  currentModel: 'claude-sonnet-4-5-20250929',
  openFiles: [],
  activeTab: 'agent',
  fileContents: {},
  tokenUsage: null
})

export const defaultStreamData: StreamData = {
  messages: [],
  isLoading: false,
  stream: null
}
