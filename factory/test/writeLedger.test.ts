import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDatabase, type Db } from '../src/store/db.ts'
import { WriteLedger } from '../src/store/writeLedger.ts'
import { KeyReuseError, NeedsReconciliationError, RemoteError } from '../src/errors.ts'
import { hashPayload } from '../src/hash.ts'

let db: Db
let ledger: WriteLedger
let now: number

beforeEach(() => {
  db = openDatabase(':memory:')
  now = Date.parse('2026-08-12T09:00:00Z')
  ledger = new WriteLedger(db, () => new Date(now))
})

afterEach(() => db.close())

const spec = { key: 'run1:designA:create-listing', operation: 'etsy.createListing' }

describe('first execution', () => {
  it('runs the effect and returns its result', async () => {
    const result = await ledger.once({ ...spec, request: { title: 'Moon Mug' } }, async () => ({
      listingId: 1234,
    }))

    expect(result).toEqual({ listingId: 1234 })
  })

  it('records the write as succeeded', async () => {
    await ledger.once({ ...spec, request: { title: 'Moon Mug' } }, async () => ({ listingId: 1234 }))

    expect(ledger.inspect(spec.key)?.state).toBe('succeeded')
  })
})

describe('replay with the same payload', () => {
  it('returns the recorded result without running the effect again', async () => {
    let calls = 0
    const effect = async () => {
      calls++
      return { listingId: 1234 }
    }

    await ledger.once({ ...spec, request: { title: 'Moon Mug' } }, effect)
    const replayed = await ledger.once({ ...spec, request: { title: 'Moon Mug' } }, effect)

    expect(calls).toBe(1)
    expect(replayed).toEqual({ listingId: 1234 })
  })

  it('does not care about key order within the payload', async () => {
    let calls = 0
    const effect = async () => {
      calls++
      return { listingId: 1234 }
    }

    await ledger.once({ ...spec, request: { title: 'Moon Mug', price: 22 } }, effect)
    await ledger.once({ ...spec, request: { price: 22, title: 'Moon Mug' } }, effect)

    expect(calls).toBe(1)
  })
})

describe('replay with a different payload', () => {
  it('refuses rather than returning the wrong cached result', async () => {
    await ledger.once({ ...spec, request: { title: 'Moon Mug' } }, async () => ({ listingId: 1234 }))

    await expect(
      ledger.once({ ...spec, request: { title: 'Sun Mug' } }, async () => ({ listingId: 9999 })),
    ).rejects.toThrow(KeyReuseError)
  })
})

describe('a failure that provably never reached the provider', () => {
  it('is retryable', async () => {
    const request = { title: 'Moon Mug' }

    await expect(
      ledger.once({ ...spec, request }, async () => {
        throw new RemoteError('rate limited locally', { provider: 'etsy', applied: 'no' })
      }),
    ).rejects.toThrow('rate limited locally')

    expect(ledger.inspect(spec.key)?.state).toBe('failed')

    const retried = await ledger.once({ ...spec, request }, async () => ({ listingId: 1234 }))
    expect(retried).toEqual({ listingId: 1234 })
  })

  it('counts attempts across retries', async () => {
    const request = { title: 'Moon Mug' }
    const fail = async () => {
      throw new RemoteError('nope', { provider: 'etsy', applied: 'no' })
    }

    await expect(ledger.once({ ...spec, request }, fail)).rejects.toThrow()
    await expect(ledger.once({ ...spec, request }, fail)).rejects.toThrow()

    expect(ledger.inspect(spec.key)?.attempts).toBe(2)
  })
})

describe('a failure that may have taken effect', () => {
  it('blocks the retry instead of risking a duplicate', async () => {
    const request = { title: 'Moon Mug' }

    await expect(
      ledger.once({ ...spec, request }, async () => {
        throw new RemoteError('socket hang up', { provider: 'etsy', applied: 'maybe' })
      }),
    ).rejects.toThrow('socket hang up')

    expect(ledger.inspect(spec.key)?.state).toBe('indeterminate')

    await expect(ledger.once({ ...spec, request }, async () => ({ listingId: 1234 }))).rejects.toThrow(
      NeedsReconciliationError,
    )
  })

  it('treats an unrecognised error as possibly applied', async () => {
    await expect(
      ledger.once({ ...spec, request: {} }, async () => {
        throw new TypeError('undefined is not a function')
      }),
    ).rejects.toThrow(TypeError)

    expect(ledger.inspect(spec.key)?.state).toBe('indeterminate')
  })
})

describe('a crash mid-write', () => {
  // A process killed between marking the write and hearing back leaves this.
  const stranded = (requestHash: string) =>
    db.run(
      `INSERT INTO writes (key, operation, state, request_hash, attempts, created_at, updated_at)
       VALUES (?, ?, 'in_flight', ?, 1, ?, ?)`,
      [spec.key, spec.operation, requestHash, '2026-08-12T08:00:00.000Z', '2026-08-12T08:00:00.000Z'],
    )

  it('leaves the row in_flight, and the next attempt refuses to guess', async () => {
    stranded(hashPayload({ title: 'Moon Mug' }))

    await expect(
      ledger.once({ ...spec, request: { title: 'Moon Mug' } }, async () => ({})),
    ).rejects.toThrow(NeedsReconciliationError)
  })

  it('reports the stranded write even when the payload has also changed', async () => {
    // Both problems are real, but the orphan on the provider is the one that
    // has to be settled first — a key-reuse message would misdirect the fix.
    stranded(hashPayload({ title: 'Something else entirely' }))

    await expect(
      ledger.once({ ...spec, request: { title: 'Moon Mug' } }, async () => ({})),
    ).rejects.toThrow(NeedsReconciliationError)
  })
})

describe('reconciliation', () => {
  it('can record that the write did land, and replays that result afterwards', async () => {
    const request = { title: 'Moon Mug' }
    await expect(
      ledger.once({ ...spec, request }, async () => {
        throw new RemoteError('timeout', { provider: 'etsy', applied: 'maybe' })
      }),
    ).rejects.toThrow()

    ledger.reconcile(spec.key, { applied: true, result: { listingId: 4321 } })

    let calls = 0
    const replayed = await ledger.once({ ...spec, request }, async () => {
      calls++
      return { listingId: 0 }
    })

    expect(calls).toBe(0)
    expect(replayed).toEqual({ listingId: 4321 })
  })

  it('can record that the write did not land, freeing it to retry', async () => {
    const request = { title: 'Moon Mug' }
    await expect(
      ledger.once({ ...spec, request }, async () => {
        throw new RemoteError('timeout', { provider: 'etsy', applied: 'maybe' })
      }),
    ).rejects.toThrow()

    ledger.reconcile(spec.key, { applied: false })

    const retried = await ledger.once({ ...spec, request }, async () => ({ listingId: 1234 }))
    expect(retried).toEqual({ listingId: 1234 })
  })

  it('refuses to reconcile a write that never needed it', async () => {
    await ledger.once({ ...spec, request: {} }, async () => ({ listingId: 1 }))

    expect(() => ledger.reconcile(spec.key, { applied: false })).toThrow(/not awaiting reconciliation/)
  })
})

describe('pending', () => {
  it('lists everything blocked on a human', async () => {
    await expect(
      ledger.once({ key: 'a', operation: 'etsy.createListing', request: {} }, async () => {
        throw new RemoteError('timeout', { provider: 'etsy', applied: 'maybe' })
      }),
    ).rejects.toThrow()
    await ledger.once({ key: 'b', operation: 'etsy.createListing', request: {} }, async () => ({}))

    expect(ledger.pending().map((row) => row.key)).toEqual(['a'])
  })
})
