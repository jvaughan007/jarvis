import type { Db } from './db.ts'
import { hashPayload } from '../hash.ts'
import { KeyReuseError, NeedsReconciliationError, RemoteError } from '../errors.ts'

export type WriteState = 'in_flight' | 'succeeded' | 'failed' | 'indeterminate'

export interface WriteRow {
  key: string
  operation: string
  state: WriteState
  request_hash: string
  result_json: string | null
  error: string | null
  attempts: number
  created_at: string
  updated_at: string
}

export interface WriteSpec {
  /** Stable across retries of the same intent. See `writeKey()`. */
  key: string
  /** Dotted provider operation, e.g. `etsy.createListing`. For auditing. */
  operation: string
  /** The full request payload. Hashed, so a changed payload is caught. */
  request: unknown
}

type Clock = () => Date

/**
 * The ledger every state-changing provider call goes through.
 *
 * The contract: an effect registered under a given key runs **at most once**.
 * A replay returns the recorded result. A replay after an *unknown* outcome
 * refuses to run and asks for a human, because the alternative — guessing — is
 * how a storefront ends up with two of everything.
 */
export class WriteLedger {
  #db: Db
  #now: Clock

  constructor(db: Db, now: Clock = () => new Date()) {
    this.#db = db
    this.#now = now
  }

  async once<T>(spec: WriteSpec, effect: () => Promise<T>): Promise<T> {
    const requestHash = hashPayload(spec.request)
    const existing = this.inspect(spec.key)

    if (existing) {
      // Unresolved state is checked before the payload, deliberately. If an
      // earlier attempt may have created something, that has to be settled
      // whatever the caller is passing now — reporting a key-reuse bug would
      // send them after the wrong problem and leave the orphan in place.
      if (existing.state === 'in_flight' || existing.state === 'indeterminate') {
        throw new NeedsReconciliationError(spec.key, existing.operation, existing.state)
      }
      if (existing.request_hash !== requestHash) {
        throw new KeyReuseError(spec.key, existing.operation)
      }
      if (existing.state === 'succeeded') {
        return JSON.parse(existing.result_json ?? 'null') as T
      }
    }

    this.#markInFlight(spec, requestHash, existing)

    let result: T
    try {
      result = await effect()
    } catch (error) {
      this.#markOutcome(spec.key, appliedness(error) === 'no' ? 'failed' : 'indeterminate', error)
      throw error
    }

    this.#db.run(
      `UPDATE writes SET state = 'succeeded', result_json = ?, error = NULL, updated_at = ? WHERE key = ?`,
      [JSON.stringify(result ?? null), this.#stamp(), spec.key],
    )
    return result
  }

  /**
   * Settles a write whose outcome was unknown, once someone has looked at the
   * provider and established what really happened.
   */
  reconcile(key: string, outcome: { applied: true; result: unknown } | { applied: false }): void {
    const row = this.inspect(key)
    if (!row) throw new Error(`No write recorded under key "${key}".`)
    if (row.state !== 'indeterminate' && row.state !== 'in_flight') {
      throw new Error(`Write "${key}" is ${row.state} and is not awaiting reconciliation.`)
    }

    if (outcome.applied) {
      this.#db.run(
        `UPDATE writes SET state = 'succeeded', result_json = ?, error = NULL, updated_at = ? WHERE key = ?`,
        [JSON.stringify(outcome.result ?? null), this.#stamp(), key],
      )
    } else {
      this.#db.run(
        `UPDATE writes SET state = 'failed', result_json = NULL, updated_at = ? WHERE key = ?`,
        [this.#stamp(), key],
      )
    }
  }

  inspect(key: string): WriteRow | undefined {
    return this.#db.get<WriteRow>('SELECT * FROM writes WHERE key = ?', [key])
  }

  /** Everything blocked on a human deciding what happened. */
  pending(): WriteRow[] {
    return this.#db.all<WriteRow>(
      `SELECT * FROM writes WHERE state IN ('in_flight', 'indeterminate') ORDER BY updated_at`,
    )
  }

  #markInFlight(spec: WriteSpec, requestHash: string, existing: WriteRow | undefined): void {
    const stamp = this.#stamp()
    if (existing) {
      this.#db.run(
        `UPDATE writes SET state = 'in_flight', attempts = attempts + 1, updated_at = ? WHERE key = ?`,
        [stamp, spec.key],
      )
    } else {
      this.#db.run(
        `INSERT INTO writes (key, operation, state, request_hash, attempts, created_at, updated_at)
         VALUES (?, ?, 'in_flight', ?, 1, ?, ?)`,
        [spec.key, spec.operation, requestHash, stamp, stamp],
      )
    }
  }

  #markOutcome(key: string, state: WriteState, error: unknown): void {
    this.#db.run('UPDATE writes SET state = ?, error = ?, updated_at = ? WHERE key = ?', [
      state,
      String(error instanceof Error ? error.message : error).slice(0, 2000),
      this.#stamp(),
      key,
    ])
  }

  #stamp(): string {
    return this.#now().toISOString()
  }
}

/**
 * Only a `RemoteError` that explicitly proves the request never went out is
 * treated as safely retryable. Everything else — including bugs in our own
 * code, which could have thrown either side of the call — is `'maybe'`.
 */
function appliedness(error: unknown): 'no' | 'maybe' {
  return error instanceof RemoteError ? error.applied : 'maybe'
}
