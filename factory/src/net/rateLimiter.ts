import { RemoteError } from '../errors.ts'

export interface Window {
  /** Human name, used in errors: 'per-second', 'per-day', 'publish'. */
  readonly name: string
  readonly limit: number
  readonly intervalMs: number
}

export interface RateLimiterOptions {
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  /** Give up rather than block a run for an unbounded time. Default 60s. */
  maxWaitMs?: number
}

/**
 * `limit` is mutable here even though it is readonly on `Window` — `observe()`
 * replaces the configured guess with what the provider reports.
 */
interface WindowState {
  readonly name: string
  limit: number
  readonly intervalMs: number
  /** Timestamps of calls admitted in this window. */
  hits: number[]
}

/**
 * Sliding-window limiter that can be corrected by the provider.
 *
 * Etsy stopped publishing its quota numbers — they are readable only from your
 * own portal page and from response headers — so configured limits here are a
 * starting guess and `observe()` replaces them with what the provider actually
 * says. The old widely-quoted "10,000/day, 10/sec" figures are not in current
 * documentation and are not used.
 */
export class RateLimiter {
  readonly name: string
  #windows: WindowState[]
  #now: () => number
  #sleep: (ms: number) => Promise<void>
  #maxWaitMs: number
  /** Set by a 429 or a `retry-after`; nothing is admitted before this time. */
  #blockedUntil = 0
  #calls = 0
  #errors = 0

  constructor(name: string, windows: readonly Window[], options: RateLimiterOptions = {}) {
    this.name = name
    this.#windows = windows.map((w) => ({ ...w, hits: [] }))
    this.#now = options.now ?? Date.now
    this.#sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.#maxWaitMs = options.maxWaitMs ?? 60_000
  }

  /**
   * Blocks until a slot is free, then claims it.
   *
   * Throws with `applied: 'no'` when the wait would exceed `maxWaitMs` — the
   * request provably never went out, so the write ledger may safely retry it.
   */
  async acquire(): Promise<void> {
    const deadline = this.#now() + this.#maxWaitMs

    for (;;) {
      const wait = this.#waitFor()
      if (wait === 0) {
        const at = this.#now()
        for (const window of this.#windows) window.hits.push(at)
        this.#calls++
        return
      }

      if (this.#now() + wait > deadline) {
        throw new RemoteError(
          `${this.name}: rate limit would require waiting ${Math.ceil(wait / 1000)}s, ` +
            `over the ${Math.round(this.#maxWaitMs / 1000)}s ceiling.`,
          { provider: this.name, applied: 'no' },
        )
      }

      await this.#sleep(wait)
    }
  }

  /** Milliseconds until a slot frees up; 0 if one is free now. */
  #waitFor(): number {
    const at = this.#now()
    let wait = Math.max(0, this.#blockedUntil - at)

    for (const window of this.#windows) {
      const cutoff = at - window.intervalMs
      while (window.hits.length > 0 && window.hits[0]! <= cutoff) window.hits.shift()

      if (window.hits.length >= window.limit) {
        // The oldest hit has to age out of the window before there is room.
        const oldest = window.hits[window.hits.length - window.limit]!
        wait = Math.max(wait, oldest + window.intervalMs - at)
      }
    }

    return wait
  }

  /**
   * Corrects local state from a response.
   *
   * Etsy reports `x-limit-per-second` / `x-remaining-this-second` and
   * `x-limit-per-day` / `x-remaining-today`. Trusting the provider's remaining
   * count over our own tally keeps us honest across restarts, other processes
   * sharing the key, and any drift in our accounting.
   */
  observe(headers: Headers): void {
    this.#applyHeader(headers, 'per-second', 'x-limit-per-second', 'x-remaining-this-second')
    this.#applyHeader(headers, 'per-day', 'x-limit-per-day', 'x-remaining-today')

    const retryAfter = readInt(headers.get('retry-after'))
    if (retryAfter !== undefined) this.penalize(retryAfter * 1000)
  }

  #applyHeader(headers: Headers, name: string, limitKey: string, remainingKey: string): void {
    const window = this.#windows.find((w) => w.name === name)
    if (!window) return

    const limit = readInt(headers.get(limitKey))
    if (limit !== undefined && limit > 0) window.limit = limit

    const remaining = readInt(headers.get(remainingKey))
    if (remaining === undefined) return

    // Rebuild the hit log so its length reflects the provider's count. Exact
    // timestamps are unknown, so assume the worst — that every consumed slot
    // was used just now and so ages out as late as possible.
    const used = Math.max(0, window.limit - remaining)
    const at = this.#now()
    window.hits = new Array<number>(Math.min(used, window.limit)).fill(at)
  }

  /** Stop admitting anything for `ms`. Called on 429 and `retry-after`. */
  penalize(ms: number): void {
    this.#blockedUntil = Math.max(this.#blockedUntil, this.#now() + ms)
  }

  recordOutcome(ok: boolean): void {
    if (!ok) this.#errors++
  }

  /**
   * Printify caps errors at 5% of total requests — a limit a naive retry loop
   * can breach while comfortably under the request cap. Surfaced so callers can
   * fail closed instead of hammering.
   */
  get errorRate(): number {
    return this.#calls === 0 ? 0 : this.#errors / this.#calls
  }

  get stats(): { calls: number; errors: number; errorRate: number } {
    return { calls: this.#calls, errors: this.#errors, errorRate: this.errorRate }
  }
}

function readInt(value: string | null): number | undefined {
  if (value === null) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined
}

/**
 * Published Printify limits. Unlike Etsy's, these are documented, so they are
 * configured rather than learned.
 */
export const PRINTIFY_WINDOWS: readonly Window[] = [
  { name: 'global', limit: 600, intervalMs: 60_000 },
  { name: 'publish', limit: 200, intervalMs: 30 * 60_000 },
]

/**
 * Etsy's real numbers are unknown until a response arrives. These are
 * deliberately conservative placeholders that `observe()` overwrites on the
 * first call — they are not a claim about Etsy's actual quota.
 */
export const ETSY_WINDOWS: readonly Window[] = [
  { name: 'per-second', limit: 5, intervalMs: 1_000 },
  { name: 'per-day', limit: 5_000, intervalMs: 24 * 60 * 60_000 },
]
