import { existsSync } from 'node:fs'
import type { Db } from '../store/db.ts'
import { GuardError } from '../errors.ts'

export interface GuardConfig {
  /**
   * When true, writes are recorded and reported but never sent. **Defaults to
   * true.** Turning it off is a deliberate act, made once, by a human.
   */
  dryRun: boolean

  /**
   * Ceiling on state-changing calls in a single run.
   *
   * This is a compliance control, not only a runaway-loop guard. Etsy's API
   * terms prohibit facilitating listings "including but not limited to
   * mass-produced items", and enforcement arrives as silent visibility
   * throttling before it arrives as a ban. A low cap is the shape of a shop
   * that stays inside that line.
   */
  maxWritesPerRun: number

  /**
   * Printify throttles accounts whose errors exceed 5% of total requests — a
   * limit a retry loop can breach while well under the request cap.
   */
  maxErrorRate: number

  /** If this file exists, nothing is written. A human's stop button. */
  killSwitchPath?: string
}

export const DEFAULT_GUARDS: GuardConfig = {
  dryRun: true,
  maxWritesPerRun: 10,
  maxErrorRate: 0.05,
}

export type RunState = 'running' | 'succeeded' | 'failed' | 'aborted'

/**
 * One scheduled wake-up, and the budget it is allowed to spend.
 *
 * Every state-changing call asks `checkWriteAllowed()` first. A run that
 * half-finishes leaves a row saying so, rather than leaving the question to be
 * reconstructed from a transcript.
 */
export class Run {
  readonly id: string
  readonly agent: string
  readonly kind: string
  readonly config: GuardConfig

  #db: Db
  #now: () => Date
  #writesUsed = 0
  #fileExists: (path: string) => boolean

  constructor(
    db: Db,
    spec: { id: string; agent: string; kind: string },
    config: Partial<GuardConfig> = {},
    deps: { now?: () => Date; fileExists?: (path: string) => boolean } = {},
  ) {
    this.#db = db
    this.id = spec.id
    this.agent = spec.agent
    this.kind = spec.kind
    this.config = { ...DEFAULT_GUARDS, ...config }
    this.#now = deps.now ?? (() => new Date())
    this.#fileExists = deps.fileExists ?? existsSync

    this.#db.run(
      `INSERT INTO runs (id, agent, kind, state, dry_run, started_at) VALUES (?, ?, ?, 'running', ?, ?)`,
      [this.id, this.agent, this.kind, this.config.dryRun ? 1 : 0, this.#now().toISOString()],
    )
  }

  get writesUsed(): number {
    return this.#writesUsed
  }

  get writesRemaining(): number {
    return Math.max(0, this.config.maxWritesPerRun - this.#writesUsed)
  }

  /**
   * Throws unless one more state-changing call is permitted right now.
   *
   * `errorRate` comes from the provider's rate limiter, so the error budget is
   * evaluated against real traffic rather than a guess.
   */
  checkWriteAllowed(operation: string, errorRate = 0): void {
    const killSwitch = this.config.killSwitchPath
    if (killSwitch !== undefined && this.#fileExists(killSwitch)) {
      throw new GuardError(
        `Kill switch present at ${killSwitch} — refusing ${operation}. Delete the file to resume.`,
        'kill-switch',
      )
    }

    if (this.config.dryRun) {
      throw new GuardError(
        `Dry run: ${operation} was not sent. Set dryRun: false to write for real.`,
        'dry-run',
      )
    }

    if (this.#writesUsed >= this.config.maxWritesPerRun) {
      throw new GuardError(
        `Run ${this.id} has used its budget of ${this.config.maxWritesPerRun} writes; ` +
          `refusing ${operation}. Raising this cap is a decision about how much the shop publishes ` +
          'at once, not a technical knob.',
        'write-budget',
      )
    }

    if (errorRate > this.config.maxErrorRate) {
      throw new GuardError(
        `Error rate ${(errorRate * 100).toFixed(1)}% exceeds the ${(
          this.config.maxErrorRate * 100
        ).toFixed(0)}% budget; refusing ${operation} rather than risking a throttle.`,
        'error-budget',
      )
    }
  }

  /** Call after a write is actually sent. */
  recordWrite(): void {
    this.#writesUsed++
    this.#db.run('UPDATE runs SET writes_used = ? WHERE id = ?', [this.#writesUsed, this.id])
  }

  finish(state: Exclude<RunState, 'running'>, note?: string): void {
    this.#db.run('UPDATE runs SET state = ?, note = ?, ended_at = ? WHERE id = ?', [
      state,
      note ?? null,
      this.#now().toISOString(),
      this.id,
    ])
  }
}

/**
 * Reads guard settings from the environment.
 *
 * Every default is the safe one. A missing variable can only ever make the
 * system more cautious, never less — the unsafe settings must be typed out.
 */
export function guardsFromEnv(env: NodeJS.ProcessEnv = process.env): GuardConfig {
  const killSwitchPath = env.FACTORY_KILL_SWITCH
  return {
    dryRun: env.FACTORY_LIVE !== '1',
    maxWritesPerRun: positiveInt(env.FACTORY_MAX_WRITES) ?? DEFAULT_GUARDS.maxWritesPerRun,
    maxErrorRate: DEFAULT_GUARDS.maxErrorRate,
    ...(killSwitchPath === undefined ? {} : { killSwitchPath }),
  }
}

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
