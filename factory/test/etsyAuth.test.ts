import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDatabase, type Db } from '../src/store/db.ts'
import { TokenStore } from '../src/auth/tokenStore.ts'
import { EtsyAuth, ReauthorizationRequiredError } from '../src/auth/etsyAuth.ts'
import { createPkce, isValidVerifier } from '../src/auth/pkce.ts'
import { createHash } from 'node:crypto'

let db: Db
let store: TokenStore
let now: number

/** Records every call, and replies with whatever the test queued. */
function stubFetch(replies: Array<{ status?: number; body: unknown }>) {
  const calls: Array<Record<string, string>> = []
  const fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(Object.fromEntries(new URLSearchParams(String(init?.body ?? ''))))
    const reply = replies.shift() ?? { status: 500, body: {} }
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch

  return { fetch, calls }
}

const config = {
  clientId: 'test-client',
  redirectUri: 'https://localhost/callback',
  scopes: ['listings_r', 'transactions_r'],
}

beforeEach(() => {
  db = openDatabase(':memory:')
  store = new TokenStore(db)
  now = Date.parse('2026-08-12T09:00:00Z')
})

afterEach(() => db.close())

function auth(fetch: typeof globalThis.fetch) {
  return new EtsyAuth(store, config, { fetch, now: () => new Date(now) })
}

function seedToken(overrides: Partial<{ expiresInMs: number; refreshToken: string | null }> = {}) {
  store.save(
    'etsy',
    {
      accessToken: 'old-access',
      refreshToken: overrides.refreshToken === undefined ? 'old-refresh' : overrides.refreshToken,
      expiresAt: new Date(now + (overrides.expiresInMs ?? 3600_000)),
      scopes: config.scopes,
    },
    new Date(now),
  )
}

describe('PKCE', () => {
  it('produces a verifier Etsy will accept', () => {
    for (let i = 0; i < 50; i++) expect(isValidVerifier(createPkce().verifier)).toBe(true)
  })

  it('derives the challenge as S256 of the verifier', () => {
    const pkce = createPkce()
    const expected = createHash('sha256')
      .update(pkce.verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    expect(pkce.challenge).toBe(expected)
    expect(pkce.method).toBe('S256')
  })

  it('puts the challenge, not the verifier, in the authorization URL', () => {
    const { url, pkce } = auth(stubFetch([]).fetch).startAuthorization()
    const params = new URL(url).searchParams

    expect(params.get('code_challenge')).toBe(pkce.challenge)
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(url).not.toContain(pkce.verifier)
  })

  it('requests every scope up front, since adding one later needs a browser', () => {
    const { url } = auth(stubFetch([]).fetch).startAuthorization()
    expect(new URL(url).searchParams.get('scope')).toBe('listings_r transactions_r')
  })
})

describe('exchanging the authorization code', () => {
  it('persists the tokens', async () => {
    const { fetch, calls } = stubFetch([
      { body: { access_token: '123.access', refresh_token: 'refresh-1', expires_in: 3600 } },
    ])

    await auth(fetch).exchangeCode('the-code', 'the-verifier')

    expect(calls[0]).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      code_verifier: 'the-verifier',
    })
    expect(store.read('etsy')?.accessToken).toBe('123.access')
  })
})

describe('the refresh loop', () => {
  it('reuses a token that is still comfortably valid', async () => {
    seedToken({ expiresInMs: 3600_000 })
    const { fetch, calls } = stubFetch([])

    expect(await auth(fetch).accessToken()).toBe('old-access')
    expect(calls).toHaveLength(0)
  })

  it('refreshes before expiry rather than after, so no call fails first', async () => {
    seedToken({ expiresInMs: 60_000 })
    const { fetch, calls } = stubFetch([
      { body: { access_token: 'new-access', refresh_token: 'refresh-2', expires_in: 3600 } },
    ])

    expect(await auth(fetch).accessToken()).toBe('new-access')
    expect(calls[0]?.grant_type).toBe('refresh_token')
  })

  it('persists the rotated refresh token, discarding the retired one', async () => {
    seedToken({ expiresInMs: 0 })
    const { fetch } = stubFetch([
      { body: { access_token: 'new-access', refresh_token: 'refresh-2', expires_in: 3600 } },
    ])

    await auth(fetch).accessToken()

    // Etsy kills the old refresh token the moment it mints the new one, so
    // keeping the old one around would be keeping a dead credential.
    expect(store.read('etsy')?.refreshToken).toBe('refresh-2')
  })

  it('commits the new credentials before handing the access token out', async () => {
    seedToken({ expiresInMs: 0 })
    let storedAtHandoff: string | null | undefined
    const { fetch } = stubFetch([
      { body: { access_token: 'new-access', refresh_token: 'refresh-2', expires_in: 3600 } },
    ])

    const token = await auth(fetch).accessToken()
    storedAtHandoff = store.read('etsy')?.refreshToken

    // A crash the instant after this returns must not lose the rotation.
    expect(token).toBe('new-access')
    expect(storedAtHandoff).toBe('refresh-2')
  })

  it('collapses concurrent refreshes into one request', async () => {
    seedToken({ expiresInMs: 0 })
    const { fetch, calls } = stubFetch([
      { body: { access_token: 'new-access', refresh_token: 'refresh-2', expires_in: 3600 } },
    ])
    const subject = auth(fetch)

    // Two agents waking at once. A second refresh would retire the first
    // agent's brand-new token before it ever gets used.
    const [a, b, c] = await Promise.all([
      subject.accessToken(),
      subject.accessToken(),
      subject.accessToken(),
    ])

    expect(calls).toHaveLength(1)
    expect([a, b, c]).toEqual(['new-access', 'new-access', 'new-access'])
  })
})

describe('when the refresh token is dead', () => {
  it('asks for a human instead of retrying overnight', async () => {
    seedToken({ expiresInMs: 0 })
    const { fetch } = stubFetch([{ status: 400, body: { error: 'invalid_grant' } }])

    await expect(auth(fetch).accessToken()).rejects.toThrow(ReauthorizationRequiredError)
  })

  it('says so when there are no credentials at all', async () => {
    const { fetch } = stubFetch([])
    await expect(auth(fetch).accessToken()).rejects.toThrow(ReauthorizationRequiredError)
  })

  it('treats a server error as retryable rather than terminal', async () => {
    seedToken({ expiresInMs: 0 })
    const { fetch } = stubFetch([{ status: 503, body: {} }])

    await expect(auth(fetch).accessToken()).rejects.toThrow(/token request failed/)
    await expect(auth(fetch).accessToken()).rejects.not.toThrow(ReauthorizationRequiredError)
  })
})

describe('the 90-day lockout clock', () => {
  it('counts down from the last refresh', () => {
    seedToken()
    expect(auth(stubFetch([]).fetch).daysUntilReauthorization()).toBeCloseTo(90)
  })

  it('raises a flag with two weeks to go', () => {
    seedToken()
    const subject = auth(stubFetch([]).fetch)

    expect(subject.needsAttentionSoon()).toBe(false)
    now += 80 * 86_400_000
    expect(subject.needsAttentionSoon()).toBe(true)
  })
})
