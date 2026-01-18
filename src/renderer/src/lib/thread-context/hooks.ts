import { useContext, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { ThreadState, ThreadActions, StreamData, ThreadContextValue } from './types'
import { ThreadContext } from './context'

export function useThreadContext(): ThreadContextValue {
  const context = useContext(ThreadContext)
  if (!context) throw new Error('useThreadContext must be used within a ThreadProvider')
  return context
}

// Hook to subscribe to stream data for a thread using useSyncExternalStore
export function useThreadStream(threadId: string): StreamData {
  const context = useThreadContext()

  const subscribe = useCallback(
    (callback: () => void) => context.subscribeToStream(threadId, callback),
    [context, threadId]
  )

  const getSnapshot = useCallback(() => context.getStreamData(threadId), [context, threadId])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Hook to access current thread's state and actions
export function useCurrentThread(threadId: string): ThreadState & ThreadActions {
  const context = useThreadContext()

  useEffect(() => {
    context.initializeThread(threadId)
  }, [threadId, context])

  const state = context.getThreadState(threadId)
  const actions = context.getThreadActions(threadId)

  return { ...state, ...actions }
}

// Hook for nullable threadId
export function useThreadState(threadId: string | null): (ThreadState & ThreadActions) | null {
  const context = useThreadContext()

  useEffect(() => {
    if (threadId) context.initializeThread(threadId)
  }, [threadId, context])

  if (!threadId) return null

  const state = context.getThreadState(threadId)
  const actions = context.getThreadActions(threadId)

  return { ...state, ...actions }
}
