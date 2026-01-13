/**
 * SyncedStateBackend: Wraps StateBackend with bidirectional disk sync.
 * 
 * Files are stored in LangGraph state (for checkpointing) AND optionally
 * synced to a directory on disk for persistence across sessions.
 */

import { StateBackend, FilesystemBackend } from 'deepagents'
import type {
  BackendProtocol,
  EditResult,
  FileData,
  FileDownloadResponse,
  FileInfo,
  FileUploadResponse,
  GrepMatch,
  WriteResult
} from 'deepagents'
import type { BaseStore } from '@langchain/langgraph-checkpoint'

/**
 * State and store container for backend initialization.
 * Compatible with deepagents StateAndStore interface.
 */
export interface StateAndStore {
  /** Current agent state with files, messages, etc. */
  state: unknown
  /** Optional BaseStore for persistent cross-conversation storage */
  store?: BaseStore
  /** Optional assistant ID for per-assistant isolation in store */
  assistantId?: string
}

export interface SyncedStateBackendOptions {
  /** State and store from LangGraph for the StateBackend */
  stateAndStore: StateAndStore
  /** Optional path to sync files to disk. If not set, only state is used. */
  syncPath?: string | null
}

/**
 * Backend that stores files in both LangGraph state AND optionally syncs to disk.
 * 
 * - Writes go to both state (for checkpointing) and disk (for persistence)
 * - Reads prefer state, fall back to disk for initial load
 * - Bidirectional: changes on disk can be loaded into state
 */
export class SyncedStateBackend implements BackendProtocol {
  private stateBackend: StateBackend
  private fsBackend: FilesystemBackend | null = null
  private syncPath: string | null

  constructor(options: SyncedStateBackendOptions) {
    this.stateBackend = new StateBackend(options.stateAndStore)
    this.syncPath = options.syncPath || null
    
    if (this.syncPath) {
      this.fsBackend = new FilesystemBackend({
        rootDir: this.syncPath,
        virtualMode: true // Use virtual paths starting with /
      })
    }
  }

  /**
   * List files from state, merging with disk if sync is enabled.
   */
  async lsInfo(path: string): Promise<FileInfo[]> {
    const stateFiles = this.stateBackend.lsInfo(path)
    
    if (!this.fsBackend) {
      return stateFiles
    }

    // Get disk files and merge
    const diskFiles = await this.fsBackend.lsInfo(path)
    
    // Create a map of state files by path for quick lookup
    const stateFilesMap = new Map(stateFiles.map(f => [f.path, f]))
    
    // Merge: state files take precedence, add disk-only files
    for (const diskFile of diskFiles) {
      if (!stateFilesMap.has(diskFile.path)) {
        stateFilesMap.set(diskFile.path, diskFile)
      }
    }
    
    const merged = Array.from(stateFilesMap.values())
    merged.sort((a, b) => a.path.localeCompare(b.path))
    return merged
  }

  /**
   * Read file from state, falling back to disk if not found.
   */
  async read(filePath: string, offset: number = 0, limit: number = 2000): Promise<string> {
    // Try state first
    const stateResult = this.stateBackend.read(filePath, offset, limit)
    if (!stateResult.startsWith('Error:')) {
      return stateResult
    }
    
    // Fall back to disk if sync enabled
    if (this.fsBackend) {
      return await this.fsBackend.read(filePath, offset, limit)
    }
    
    return stateResult
  }

  /**
   * Read raw file data, preferring state over disk.
   */
  async readRaw(filePath: string): Promise<FileData> {
    try {
      return this.stateBackend.readRaw(filePath)
    } catch {
      if (this.fsBackend) {
        return await this.fsBackend.readRaw(filePath)
      }
      throw new Error(`File '${filePath}' not found`)
    }
  }

  /**
   * Write file to both state and disk (if sync enabled).
   */
  async write(filePath: string, content: string): Promise<WriteResult> {
    // Write to state first
    const stateResult = this.stateBackend.write(filePath, content)
    
    if (stateResult.error) {
      return stateResult
    }
    
    // Also write to disk if sync enabled
    if (this.fsBackend) {
      const diskResult = await this.fsBackend.write(filePath, content)
      if (diskResult.error) {
        console.warn(`[SyncedBackend] Disk write failed for ${filePath}:`, diskResult.error)
        // Still return success from state - disk sync is best-effort
      }
    }
    
    return stateResult
  }

  /**
   * Edit file in both state and disk (if sync enabled).
   */
  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll: boolean = false
  ): Promise<EditResult> {
    // Edit in state first
    const stateResult = this.stateBackend.edit(filePath, oldString, newString, replaceAll)
    
    if (stateResult.error) {
      // If file not in state, try loading from disk first
      if (this.fsBackend && stateResult.error.includes('not found')) {
        try {
          // Read from disk
          const diskContent = await this.fsBackend.read(filePath)
          if (!diskContent.startsWith('Error:')) {
            // Write to state to initialize it
            const writeResult = this.stateBackend.write(filePath, diskContent)
            if (!writeResult.error) {
              // Now try edit again
              const retryResult = this.stateBackend.edit(filePath, oldString, newString, replaceAll)
              if (!retryResult.error && this.fsBackend) {
                // Sync edit to disk
                await this.fsBackend.edit(filePath, oldString, newString, replaceAll)
              }
              return retryResult
            }
          }
        } catch {
          // Fall through to return original error
        }
      }
      return stateResult
    }
    
    // Sync edit to disk if successful
    if (this.fsBackend) {
      const diskResult = await this.fsBackend.edit(filePath, oldString, newString, replaceAll)
      if (diskResult.error) {
        console.warn(`[SyncedBackend] Disk edit failed for ${filePath}:`, diskResult.error)
        // Still return success from state
      }
    }
    
    return stateResult
  }

  /**
   * Search files in both state and disk.
   */
  async grepRaw(
    pattern: string,
    path: string = '/',
    glob: string | null = null
  ): Promise<GrepMatch[] | string> {
    const stateResult = this.stateBackend.grepRaw(pattern, path, glob)
    
    if (typeof stateResult === 'string') {
      return stateResult // Error from state
    }
    
    if (!this.fsBackend) {
      return stateResult
    }
    
    // Merge with disk results
    const diskResult = await this.fsBackend.grepRaw(pattern, path, glob)
    
    if (typeof diskResult === 'string') {
      return stateResult // Return state results if disk fails
    }
    
    // Merge results, preferring state matches (they're more recent)
    const seenPaths = new Set(stateResult.map(m => `${m.path}:${m.line}`))
    const merged = [...stateResult]
    
    for (const match of diskResult) {
      const key = `${match.path}:${match.line}`
      if (!seenPaths.has(key)) {
        merged.push(match)
      }
    }
    
    return merged
  }

  /**
   * Glob search in both state and disk.
   */
  async globInfo(pattern: string, path: string = '/'): Promise<FileInfo[]> {
    const stateFiles = this.stateBackend.globInfo(pattern, path)
    
    if (!this.fsBackend) {
      return stateFiles
    }
    
    const diskFiles = await this.fsBackend.globInfo(pattern, path)
    
    // Merge: state files take precedence
    const stateFilesMap = new Map(stateFiles.map(f => [f.path, f]))
    
    for (const diskFile of diskFiles) {
      if (!stateFilesMap.has(diskFile.path)) {
        stateFilesMap.set(diskFile.path, diskFile)
      }
    }
    
    const merged = Array.from(stateFilesMap.values())
    merged.sort((a, b) => a.path.localeCompare(b.path))
    return merged
  }

  /**
   * Upload files to both state and disk.
   */
  async uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
    const stateResult = this.stateBackend.uploadFiles(files)
    
    // Also upload to disk if sync enabled
    if (this.fsBackend) {
      await this.fsBackend.uploadFiles(files)
    }
    
    return stateResult
  }

  /**
   * Download files from state, falling back to disk.
   */
  async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
    const stateResult = this.stateBackend.downloadFiles(paths)
    
    if (!this.fsBackend) {
      return stateResult
    }
    
    // For files not found in state, try disk
    const responses: FileDownloadResponse[] = []
    
    for (let i = 0; i < paths.length; i++) {
      const stateResponse = stateResult[i]
      
      if (stateResponse.error === 'file_not_found' && this.fsBackend) {
        const diskResult = await this.fsBackend.downloadFiles([paths[i]])
        responses.push(diskResult[0])
      } else {
        responses.push(stateResponse)
      }
    }
    
    return responses
  }

  /**
   * Load all files from disk into state (for initial sync).
   * Call this when starting a thread with an existing workspace.
   */
  async syncFromDisk(): Promise<{ loaded: string[]; errors: string[] }> {
    const loaded: string[] = []
    const errors: string[] = []
    
    if (!this.fsBackend) {
      return { loaded, errors }
    }
    
    // List all files on disk
    const diskFiles = await this.fsBackend.lsInfo('/')
    
    for (const file of diskFiles) {
      if (file.is_dir) continue
      
      try {
        const content = await this.fsBackend.read(file.path)
        if (!content.startsWith('Error:')) {
          // Remove line numbers from read output to get raw content
          const lines = content.split('\n')
          const rawContent = lines
            .map(line => line.replace(/^\s*\d+\|/, ''))
            .join('\n')
          
          const result = this.stateBackend.write(file.path, rawContent)
          if (!result.error) {
            loaded.push(file.path)
          } else {
            errors.push(`${file.path}: ${result.error}`)
          }
        }
      } catch (e) {
        errors.push(`${file.path}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    
    return { loaded, errors }
  }
}

/**
 * Create a factory function for SyncedStateBackend.
 * This can be passed to createFilesystemMiddleware.
 */
export function createSyncedBackendFactory(syncPath?: string | null) {
  return (stateAndStore: StateAndStore): BackendProtocol => {
    return new SyncedStateBackend({
      stateAndStore,
      syncPath
    })
  }
}
