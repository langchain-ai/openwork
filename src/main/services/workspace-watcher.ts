import * as fs from "fs"
import * as path from "path"
import { BrowserWindow } from "electron"

// Store active watchers by thread ID
const activeWatchers = new Map<string, { watcher: fs.FSWatcher; timer?: NodeJS.Timeout }>()

// Debounce timers to prevent rapid-fire updates
const debounceTimers = new Map<string, NodeJS.Timeout>()

const DEBOUNCE_DELAY = 500 // ms
const POLLING_INTERVAL = 4000 // 4s safety poll for reliable updates

/**
 * Start watching a workspace directory for file changes.
 * Sends 'workspace:files-changed' events to the renderer when changes are detected.
 */
export function startWatching(threadId: string, workspacePath: string): void {
  // Stop any existing watcher for this thread
  stopWatching(threadId)

  // Verify the path exists and is a directory
  try {
    const stat = fs.statSync(workspacePath)
    if (!stat.isDirectory()) {
      console.warn(`[WorkspaceWatcher] Path is not a directory: ${workspacePath}`)
      return
    }
  } catch (e) {
    console.warn(`[WorkspaceWatcher] Cannot access path: ${workspacePath}`, e)
    return
  }

  try {
    // 1. Native FS Watcher
    // Use recursive watching (supported on macOS and Windows)
    const fsWatcher = fs.watch(workspacePath, { recursive: true }, (eventType, filename) => {
      // Skip hidden files and common non-project files
      if (filename) {
        const parts = filename.split(path.sep)
        if (parts.some((p) => p.startsWith(".") || p === "node_modules")) {
          return
        }
      }

      console.log(`[WorkspaceWatcher] ${eventType}: ${filename} in thread ${threadId}`)

      // Debounce to prevent rapid updates
      const existingTimer = debounceTimers.get(threadId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        debounceTimers.delete(threadId)
        notifyRenderer(threadId, workspacePath)
      }, DEBOUNCE_DELAY)

      debounceTimers.set(threadId, timer)
    })

    fsWatcher.on("error", (error) => {
      console.error(`[WorkspaceWatcher] Error watching ${workspacePath}:`, error)
      // Don't fully stop on error, the polling will pick it up
    })

    // 2. Safety Polling Interval
    // Ensures UI updates even if fs.watch fails (common on network/virtual drives like A:\)
    const pollTimer = setInterval(() => {
      notifyRenderer(threadId, workspacePath)
    }, POLLING_INTERVAL)

    activeWatchers.set(threadId, { watcher: fsWatcher, timer: pollTimer })
    console.log(`[WorkspaceWatcher] Started watching ${workspacePath} for thread ${threadId}`)
  } catch (e) {
    console.error(`[WorkspaceWatcher] Failed to start watching ${workspacePath}:`, e)
  }
}

/**
 * Stop watching the workspace for a specific thread.
 */
export function stopWatching(threadId: string): void {
  const active = activeWatchers.get(threadId)
  if (active) {
    active.watcher.close()
    if (active.timer) clearInterval(active.timer)
    activeWatchers.delete(threadId)
    console.log(`[WorkspaceWatcher] Stopped watching for thread ${threadId}`)
  }

  const timer = debounceTimers.get(threadId)
  if (timer) {
    clearTimeout(timer)
    debounceTimers.delete(threadId)
  }
}

/**
 * Stop all active watchers.
 */
export function stopAllWatching(): void {
  for (const threadId of activeWatchers.keys()) {
    stopWatching(threadId)
  }
}

/**
 * Notify renderer windows about file changes.
 */
function notifyRenderer(threadId: string, workspacePath: string): void {
  const windows = BrowserWindow.getAllWindows()

  for (const win of windows) {
    win.webContents.send("workspace:files-changed", {
      threadId,
      workspacePath
    })
  }
}

/**
 * Check if a thread's workspace is currently being watched.
 */
export function isWatching(threadId: string): boolean {
  return activeWatchers.has(threadId)
}
