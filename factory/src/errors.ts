/**
 * Whether a failed remote call can be safely retried.
 *
 * `'no'` means the request provably never reached the provider — a rate-limit
 * refusal made locally, a DNS failure, a request the provider rejected as
 * malformed before acting on it. Those are safe to retry.
 *
 * `'maybe'` means the outcome is unknown: a timeout, a dropped connection after
 * the bytes went out, a 5xx. The listing may exist. Retrying blind is how a
 * storefront ends up with two of everything.
 *
 * `'maybe'` is the default everywhere. A call is only downgraded to `'no'` by
 * code that can actually prove it.
 */
export type Applied = 'no' | 'maybe'

export class RemoteError extends Error {
  readonly applied: Applied
  readonly status: number | undefined
  readonly provider: string

  constructor(
    message: string,
    options: { provider: string; applied: Applied; status?: number; cause?: unknown },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'RemoteError'
    this.provider = options.provider
    this.applied = options.applied
    this.status = options.status
  }
}

/** A write key was reused with a different payload. Always a bug in the caller. */
export class KeyReuseError extends Error {
  readonly key: string
  readonly operation: string

  constructor(key: string, operation: string) {
    super(
      `Write key "${key}" was already used for operation "${operation}" with a different payload. ` +
        'Write keys must be derived from the payload — reusing one with different content ' +
        'would return the wrong cached result.',
    )
    this.name = 'KeyReuseError'
    this.key = key
    this.operation = operation
  }
}

/**
 * A previous attempt at this write left the outcome unknown. Someone has to
 * look at the provider and say what actually happened before it can run again.
 */
export class NeedsReconciliationError extends Error {
  readonly key: string
  readonly operation: string
  readonly state: string

  constructor(key: string, operation: string, state: string) {
    super(
      `Write "${key}" (${operation}) is ${state}: an earlier attempt may have taken effect. ` +
        'Check the provider and resolve it with reconcile() before retrying.',
    )
    this.name = 'NeedsReconciliationError'
    this.key = key
    this.operation = operation
    this.state = state
  }
}

/** A guard refused the write: dry-run, budget exhausted, or the kill switch. */
export class GuardError extends Error {
  readonly guard: string

  constructor(message: string, guard: string) {
    super(message)
    this.name = 'GuardError'
    this.guard = guard
  }
}
