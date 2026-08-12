import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, type Window } from '../src/net/rateLimiter.ts'
import { RemoteError } from '../src/errors.ts'

/**
 * A clock the test drives by hand. `sleep` jumps time forward instead of
 * waiting, so the suite runs instantly and deterministically.
 */
function fakeClock() {
  let t = 1_000_000
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms
    },
    advance: (ms: number) => {
      t += ms
    },
    get time() {
      return t
    },
  }
}

let clock: ReturnType<typeof fakeClock>

beforeEach(() => {
  clock = fakeClock()
})

const perSecond: Window = { name: 'per-second', limit: 3, intervalMs: 1000 }

function limiter(windows: Window[] = [perSecond], maxWaitMs = 60_000) {
  return new RateLimiter('test', windows, { now: clock.now, sleep: clock.sleep, maxWaitMs })
}

describe('within the limit', () => {
  it('admits calls without delay', async () => {
    const rl = limiter()
    const started = clock.time

    await rl.acquire()
    await rl.acquire()
    await rl.acquire()

    expect(clock.time).toBe(started)
  })
})

describe('at the limit', () => {
  it('waits for the oldest call to age out', async () => {
    const rl = limiter()
    const started = clock.time

    for (let i = 0; i < 4; i++) await rl.acquire()

    expect(clock.time).toBe(started + 1000)
  })

  it('spreads a burst across windows rather than dropping it', async () => {
    const rl = limiter()

    for (let i = 0; i < 7; i++) await rl.acquire()

    // 3 immediately, 3 after 1s, 1 after 2s.
    expect(clock.time).toBe(1_002_000)
  })
})

describe('two windows at once', () => {
  it('respects whichever binds first', async () => {
    const rl = limiter([
      { name: 'per-second', limit: 10, intervalMs: 1000 },
      { name: 'per-minute', limit: 4, intervalMs: 60_000 },
    ])

    for (let i = 0; i < 5; i++) await rl.acquire()

    expect(clock.time).toBe(1_060_000)
  })
})

describe('when the wait would be unreasonable', () => {
  it('refuses, and marks the call as never sent so it can be retried', async () => {
    const rl = limiter([{ name: 'per-day', limit: 1, intervalMs: 86_400_000 }], 5_000)
    await rl.acquire()

    await expect(rl.acquire()).rejects.toThrow(RemoteError)
    await expect(rl.acquire()).rejects.toMatchObject({ applied: 'no' })
  })
})

describe('provider headers', () => {
  it('replaces the configured limit with the reported one', async () => {
    const rl = limiter()
    rl.observe(new Headers({ 'x-limit-per-second': '10', 'x-remaining-this-second': '10' }))

    const started = clock.time
    for (let i = 0; i < 10; i++) await rl.acquire()

    expect(clock.time).toBe(started)
  })

  it('trusts the provider over our own tally when it says we have less left', async () => {
    const rl = limiter()

    // We think nothing is used; Etsy says only one slot remains this second.
    rl.observe(new Headers({ 'x-limit-per-second': '3', 'x-remaining-this-second': '1' }))

    const started = clock.time
    await rl.acquire()
    expect(clock.time).toBe(started)

    await rl.acquire()
    expect(clock.time).toBe(started + 1000)
  })

  it('honours retry-after', async () => {
    const rl = limiter()
    rl.observe(new Headers({ 'retry-after': '30' }))

    const started = clock.time
    await rl.acquire()

    expect(clock.time).toBe(started + 30_000)
  })

  it('ignores headers it does not understand', () => {
    const rl = limiter()
    expect(() =>
      rl.observe(new Headers({ 'x-limit-per-second': 'lots', 'x-remaining-today': '' })),
    ).not.toThrow()
  })
})

describe('the error budget', () => {
  it('tracks the share of calls that failed', async () => {
    const rl = limiter([{ name: 'per-second', limit: 100, intervalMs: 1000 }])

    for (let i = 0; i < 20; i++) {
      await rl.acquire()
      rl.recordOutcome(i < 19)
    }

    // Printify throttles above 5%; one in twenty is exactly at the line.
    expect(rl.errorRate).toBeCloseTo(0.05)
  })

  it('is zero before anything has run', () => {
    expect(limiter().errorRate).toBe(0)
  })
})
