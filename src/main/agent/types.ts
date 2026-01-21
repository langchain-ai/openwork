// @ts-ignore this is a workaround to avoid type errors in the main process
import type { createAgentRuntime } from "./runtime"

export type DeepAgent = Awaited<ReturnType<typeof createAgentRuntime>>
