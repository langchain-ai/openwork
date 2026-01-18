import { createContext } from 'react'
import type { ThreadContextValue } from './types'

export const ThreadContext = createContext<ThreadContextValue | null>(null)
