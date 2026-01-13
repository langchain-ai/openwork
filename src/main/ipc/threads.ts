import { IpcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import {
  getAllThreads,
  getThread,
  createThread as dbCreateThread,
  updateThread as dbUpdateThread,
  deleteThread as dbDeleteThread
} from '../db'
import { getCheckpointer } from '../agent/runtime'
import { generateTitle } from '../services/title-generator'
import type { Thread } from '../types'

export function registerThreadHandlers(ipcMain: IpcMain) {
  // List all threads
  ipcMain.handle('threads:list', async () => {
    const threads = getAllThreads()
    return threads.map((row) => ({
      thread_id: row.thread_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status as Thread['status'],
      thread_values: row.thread_values ? JSON.parse(row.thread_values) : undefined,
      title: row.title
    }))
  })

  // Get a single thread
  ipcMain.handle('threads:get', async (_event, threadId: string) => {
    const row = getThread(threadId)
    if (!row) return null
    return {
      thread_id: row.thread_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status as Thread['status'],
      thread_values: row.thread_values ? JSON.parse(row.thread_values) : undefined,
      title: row.title
    }
  })

  // Create a new thread
  ipcMain.handle('threads:create', async (_event, metadata?: Record<string, unknown>) => {
    const threadId = uuid()
    const title = (metadata?.title as string) || `Thread ${new Date().toLocaleDateString()}`

    const thread = dbCreateThread(threadId, { ...metadata, title })

    return {
      thread_id: thread.thread_id,
      created_at: new Date(thread.created_at),
      updated_at: new Date(thread.updated_at),
      metadata: thread.metadata ? JSON.parse(thread.metadata) : undefined,
      status: thread.status as Thread['status'],
      thread_values: thread.thread_values ? JSON.parse(thread.thread_values) : undefined,
      title
    } as Thread
  })

  // Update a thread
  ipcMain.handle(
    'threads:update',
    async (_event, { threadId, updates }: { threadId: string; updates: Partial<Thread> }) => {
      const updateData: Parameters<typeof dbUpdateThread>[1] = {}

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.metadata !== undefined)
        updateData.metadata = JSON.stringify(updates.metadata)
      if (updates.thread_values !== undefined) updateData.thread_values = JSON.stringify(updates.thread_values)

      const row = dbUpdateThread(threadId, updateData)
      if (!row) throw new Error('Thread not found')

      return {
        thread_id: row.thread_id,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        status: row.status as Thread['status'],
        thread_values: row.thread_values ? JSON.parse(row.thread_values) : undefined,
        title: row.title
      }
    }
  )

  // Delete a thread
  ipcMain.handle('threads:delete', async (_event, threadId: string) => {
    console.log('[Threads] Deleting thread:', threadId)
    
    // Delete from our metadata store
    dbDeleteThread(threadId)
    console.log('[Threads] Deleted from metadata store')

    // Also delete from LangGraph checkpointer
    try {
      const checkpointer = await getCheckpointer()
      await checkpointer.deleteThread(threadId)
      console.log('[Threads] Deleted from checkpointer')
    } catch (e) {
      console.warn('[Threads] Failed to delete thread from checkpointer:', e)
    }
  })

  // Get thread history (checkpoints)
  ipcMain.handle('threads:history', async (_event, threadId: string) => {
    try {
      const checkpointer = await getCheckpointer()

      const history: unknown[] = []
      const config = { configurable: { thread_id: threadId } }

      for await (const checkpoint of checkpointer.list(config, { limit: 50 })) {
        history.push(checkpoint)
      }

      return history
    } catch (e) {
      console.warn('Failed to get thread history:', e)
      return []
    }
  })

  // Generate a title from a message
  ipcMain.handle('threads:generateTitle', async (_event, message: string) => {
    return generateTitle(message)
  })
}
