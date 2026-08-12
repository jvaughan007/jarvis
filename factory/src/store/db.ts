import { DatabaseSync } from 'node:sqlite'
import { MIGRATIONS } from './schema.ts'

export type Params = readonly (string | number | null)[]

/**
 * Thin wrapper over `node:sqlite`. Everything that touches the database goes
 * through here so that swapping the driver — `node:sqlite` is still flagged
 * experimental — is a one-file change rather than a rewrite.
 */
export class Db {
  #handle: DatabaseSync

  constructor(handle: DatabaseSync) {
    this.#handle = handle
  }

  run(sql: string, params: Params = []): void {
    this.#handle.prepare(sql).run(...params)
  }

  get<T>(sql: string, params: Params = []): T | undefined {
    return this.#handle.prepare(sql).get(...params) as T | undefined
  }

  all<T>(sql: string, params: Params = []): T[] {
    return this.#handle.prepare(sql).all(...params) as T[]
  }

  /**
   * Runs `fn` inside a transaction, rolling back if it throws.
   *
   * Not reentrant — SQLite has no nested transactions, and pretending otherwise
   * with savepoints would let an inner rollback silently leave an outer
   * transaction half-applied.
   */
  transaction<T>(fn: () => T): T {
    this.#handle.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.#handle.exec('COMMIT')
      return result
    } catch (error) {
      this.#handle.exec('ROLLBACK')
      throw error
    }
  }

  close(): void {
    this.#handle.close()
  }
}

/**
 * Opens the store and brings it up to the current schema version.
 *
 * Pass `:memory:` for tests.
 */
export function openDatabase(path: string): Db {
  const handle = new DatabaseSync(path)

  // WAL survives a crash mid-write and lets the dashboard read while an agent
  // writes. `foreign_keys` is off by default in SQLite, which surprises people.
  if (path !== ':memory:') handle.exec('PRAGMA journal_mode = WAL')
  handle.exec('PRAGMA foreign_keys = ON')
  handle.exec('PRAGMA busy_timeout = 5000')

  const row = handle.prepare('PRAGMA user_version').get() as { user_version: number }
  const applied = row.user_version

  if (applied > MIGRATIONS.length) {
    throw new Error(
      `Database at ${path} is at schema version ${applied}, but this build only knows ${MIGRATIONS.length}. ` +
        'It was written by a newer version of the factory — upgrade rather than downgrade.',
    )
  }

  for (let version = applied; version < MIGRATIONS.length; version++) {
    handle.exec('BEGIN IMMEDIATE')
    try {
      handle.exec(MIGRATIONS[version]!)
      // PRAGMA does not accept bound parameters; the value is a loop counter,
      // not input.
      handle.exec(`PRAGMA user_version = ${version + 1}`)
      handle.exec('COMMIT')
    } catch (error) {
      handle.exec('ROLLBACK')
      throw error
    }
  }

  return new Db(handle)
}
