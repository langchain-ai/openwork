import type { UseStreamTransport } from '@langchain/langgraph-sdk/react'

export type StreamPayload = Parameters<UseStreamTransport['stream']>[0]

export type StreamEvent = {
  id?: string
  event: string
  data: unknown
}

// Types for the IPC events from main process
export interface IPCMessage {
  id: string
  type: 'human' | 'ai' | 'tool' | 'system'
  content: string
  tool_calls?: { id: string; name: string; args: Record<string, unknown> }[]
}

export interface IPCValuesEvent {
  type: 'values'
  data: {
    messages?: IPCMessage[]
    todos?: { id?: string; content?: string; status?: string }[]
    files?: Record<string, unknown> | Array<{ path: string; is_dir?: boolean; size?: number }>
    workspacePath?: string
    subagents?: Array<{
      id?: string
      name?: string
      description?: string
      status?: string
      startedAt?: Date | string
      completedAt?: Date | string
    }>
    interrupt?: { id?: string; tool_call?: unknown }
  }
}

export interface IPCTokenEvent {
  type: 'token'
  messageId: string
  token: string
}

export interface IPCToolCallEvent {
  type: 'tool_call'
  messageId: string | null
  tool_calls: Array<{ id?: string; name?: string; args?: string }>
}

export interface IPCDoneEvent {
  type: 'done'
}

export interface IPCErrorEvent {
  type: 'error'
  error: string
}

export type IPCEvent =
  | IPCValuesEvent
  | IPCTokenEvent
  | IPCToolCallEvent
  | IPCDoneEvent
  | IPCErrorEvent
