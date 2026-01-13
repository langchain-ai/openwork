import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { RunnableConfig } from '@langchain/core/runnables'
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointTuple,
  type SerializerProtocol,
  type PendingWrite,
  type CheckpointMetadata,
  copyCheckpoint
} from '@langchain/langgraph-checkpoint'

interface CheckpointRow {
  thread_id: string
  checkpoint_ns: string
  checkpoint_id: string
  parent_checkpoint_id: string | null
  type: string | null
  checkpoint: string
  metadata: string
}

interface WriteRow {
  task_id: string
  channel: string
  type: string | null
  value: string
}

/**
 * SQLite checkpointer using sql.js (pure JavaScript, no native modules)
 * Compatible with all Electron versions without native compilation.
 */
export class SqlJsSaver extends BaseCheckpointSaver {
  private db: SqlJsDatabase | null = null
  private dbPath: string
  private isSetup = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  constructor(dbPath: string, serde?: SerializerProtocol) {
    super(serde)
    this.dbPath = dbPath
  }

  /**
   * Initialize the database asynchronously
   */
  async initialize(): Promise<void> {
    if (this.db) return

    const SQL = await initSqlJs()

    // Load existing database if it exists
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath)
      this.db = new SQL.Database(buffer)
    } else {
      // Ensure directory exists
      const dir = dirname(this.dbPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      this.db = new SQL.Database()
    }

    this.setup()
  }

  private setup(): void {
    if (this.isSetup || !this.db) return

    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        parent_checkpoint_id TEXT,
        type TEXT,
        checkpoint TEXT,
        metadata TEXT,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS writes (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        channel TEXT NOT NULL,
        type TEXT,
        value TEXT,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
      )
    `)

    this.isSetup = true
    this.saveToDisk()
  }

  /**
   * Save database to disk (debounced)
   */
  private saveToDisk(): void {
    if (!this.db) return

    this.dirty = true

    // Debounce saves to avoid excessive disk writes
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      if (this.db && this.dirty) {
        const data = this.db.export()
        writeFileSync(this.dbPath, Buffer.from(data))
        this.dirty = false
      }
    }, 100)
  }

  /**
   * Force immediate save to disk
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.db && this.dirty) {
      const data = this.db.export()
      writeFileSync(this.dbPath, Buffer.from(data))
      this.dirty = false
    }
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    const { thread_id, checkpoint_ns = '', checkpoint_id } = config.configurable ?? {}

    let sql: string
    let params: (string | undefined)[]

    if (checkpoint_id) {
      sql = `
        SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM checkpoints
        WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
      `
      params = [thread_id, checkpoint_ns, checkpoint_id]
    } else {
      sql = `
        SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM checkpoints
        WHERE thread_id = ? AND checkpoint_ns = ?
        ORDER BY checkpoint_id DESC
        LIMIT 1
      `
      params = [thread_id, checkpoint_ns]
    }

    const stmt = this.db.prepare(sql)
    stmt.bind(params.filter((p) => p !== undefined))

    if (!stmt.step()) {
      stmt.free()
      return undefined
    }

    const row = stmt.getAsObject() as unknown as CheckpointRow
    stmt.free()

    // Get pending writes
    const writesStmt = this.db.prepare(`
      SELECT task_id, channel, type, value
      FROM writes
      WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
    `)
    writesStmt.bind([row.thread_id, row.checkpoint_ns, row.checkpoint_id])

    const pendingWrites: [string, string, unknown][] = []
    while (writesStmt.step()) {
      const write = writesStmt.getAsObject() as unknown as WriteRow
      const value = await this.serde.loadsTyped(write.type ?? 'json', write.value ?? '')
      pendingWrites.push([write.task_id, write.channel, value])
    }
    writesStmt.free()

    const checkpoint = (await this.serde.loadsTyped(
      row.type ?? 'json',
      row.checkpoint
    )) as Checkpoint

    const finalConfig = checkpoint_id
      ? config
      : {
          configurable: {
            thread_id: row.thread_id,
            checkpoint_ns: row.checkpoint_ns,
            checkpoint_id: row.checkpoint_id
          }
        }

    return {
      checkpoint,
      config: finalConfig,
      metadata: (await this.serde.loadsTyped(
        row.type ?? 'json',
        row.metadata
      )) as CheckpointMetadata,
      parentConfig: row.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_ns: row.checkpoint_ns,
              checkpoint_id: row.parent_checkpoint_id
            }
          }
        : undefined,
      pendingWrites
    }
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    const { limit, before } = options ?? {}
    const thread_id = config.configurable?.thread_id
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? ''

    let sql = `
      SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
      FROM checkpoints
      WHERE thread_id = ? AND checkpoint_ns = ?
    `
    const params: string[] = [thread_id, checkpoint_ns]

    if (before?.configurable?.checkpoint_id) {
      sql += ` AND checkpoint_id < ?`
      params.push(before.configurable.checkpoint_id)
    }

    sql += ` ORDER BY checkpoint_id DESC`

    if (limit) {
      sql += ` LIMIT ${parseInt(String(limit), 10)}`
    }

    const stmt = this.db.prepare(sql)
    stmt.bind(params)

    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as CheckpointRow

      // Get pending writes for this checkpoint
      const writesStmt = this.db.prepare(`
        SELECT task_id, channel, type, value
        FROM writes
        WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
      `)
      writesStmt.bind([row.thread_id, row.checkpoint_ns, row.checkpoint_id])

      const pendingWrites: [string, string, unknown][] = []
      while (writesStmt.step()) {
        const write = writesStmt.getAsObject() as unknown as WriteRow
        const value = await this.serde.loadsTyped(write.type ?? 'json', write.value ?? '')
        pendingWrites.push([write.task_id, write.channel, value])
      }
      writesStmt.free()

      const checkpoint = (await this.serde.loadsTyped(
        row.type ?? 'json',
        row.checkpoint
      )) as Checkpoint

      yield {
        config: {
          configurable: {
            thread_id: row.thread_id,
            checkpoint_ns: row.checkpoint_ns,
            checkpoint_id: row.checkpoint_id
          }
        },
        checkpoint,
        metadata: (await this.serde.loadsTyped(
          row.type ?? 'json',
          row.metadata
        )) as CheckpointMetadata,
        parentConfig: row.parent_checkpoint_id
          ? {
              configurable: {
                thread_id: row.thread_id,
                checkpoint_ns: row.checkpoint_ns,
                checkpoint_id: row.parent_checkpoint_id
              }
            }
          : undefined,
        pendingWrites
      }
    }

    stmt.free()
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    if (!config.configurable) {
      throw new Error('Empty configuration supplied.')
    }

    const thread_id = config.configurable?.thread_id
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? ''
    const parent_checkpoint_id = config.configurable?.checkpoint_id

    if (!thread_id) {
      throw new Error('Missing "thread_id" field in passed "config.configurable".')
    }

    const preparedCheckpoint = copyCheckpoint(checkpoint)

    const [[type1, serializedCheckpoint], [type2, serializedMetadata]] = await Promise.all([
      this.serde.dumpsTyped(preparedCheckpoint),
      this.serde.dumpsTyped(metadata)
    ])

    if (type1 !== type2) {
      throw new Error('Failed to serialize checkpoint and metadata to the same type.')
    }

    this.db.run(
      `INSERT OR REPLACE INTO checkpoints 
       (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        thread_id,
        checkpoint_ns,
        checkpoint.id,
        parent_checkpoint_id ?? null,
        type1,
        serializedCheckpoint,
        serializedMetadata
      ]
    )

    this.saveToDisk()

    return {
      configurable: {
        thread_id,
        checkpoint_ns,
        checkpoint_id: checkpoint.id
      }
    }
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    if (!config.configurable) {
      throw new Error('Empty configuration supplied.')
    }

    if (!config.configurable?.thread_id) {
      throw new Error('Missing thread_id field in config.configurable.')
    }

    if (!config.configurable?.checkpoint_id) {
      throw new Error('Missing checkpoint_id field in config.configurable.')
    }

    for (let idx = 0; idx < writes.length; idx++) {
      const write = writes[idx]
      const [type, serializedWrite] = await this.serde.dumpsTyped(write[1])

      this.db.run(
        `INSERT OR REPLACE INTO writes 
         (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          config.configurable.thread_id,
          config.configurable.checkpoint_ns ?? '',
          config.configurable.checkpoint_id,
          taskId,
          idx,
          write[0],
          type,
          serializedWrite
        ]
      )
    }

    this.saveToDisk()
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    this.db.run(`DELETE FROM checkpoints WHERE thread_id = ?`, [threadId])
    this.db.run(`DELETE FROM writes WHERE thread_id = ?`, [threadId])

    this.saveToDisk()
  }

  /**
   * Close the database and save any pending changes
   */
  async close(): Promise<void> {
    await this.flush()
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
