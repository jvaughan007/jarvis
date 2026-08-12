import type { StoredToken, TokenStore } from './tokenStore.ts'
import { createPkce, type Pkce } from './pkce.ts'
import { RemoteError } from '../errors.ts'

export const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'
export const ETSY_AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect'

/** Etsy access tokens last an hour; renew with this much left. */
const RENEW_MARGIN_MS = 5 * 60_000

/** Refresh tokens last 90 days. Warn well before that becomes a lockout. */
const REFRESH_TOKEN_LIFETIME_DAYS = 90
const REAUTH_WARNING_DAYS = 14

export interface EtsyAuthConfig {
  clientId: string
  redirectUri: string
  /** Ask for everything on day one — adding a scope later needs a browser. */
  scopes: string[]
}

export interface EtsyAuthDeps {
  fetch?: typeof globalThis.fetch
  now?: () => Date
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export class ReauthorizationRequiredError extends Error {
  constructor(reason: string) {
    super(
      `Etsy requires interactive re-authorization: ${reason}. ` +
        'Run the connect flow in a browser — no automated recovery is possible.',
    )
    this.name = 'ReauthorizationRequiredError'
  }
}

/**
 * Etsy's OAuth 2.0 + PKCE flow, with the refresh loop that keeps an unattended
 * run alive.
 *
 * Two behaviours here are load-bearing and easy to get wrong:
 *
 * 1. **Rotation.** Every refresh returns a *new* refresh token and kills the
 *    old one. The new credentials are committed to the store before the access
 *    token is handed to a caller, so a crash cannot lose them.
 * 2. **Single flight.** Two agents hitting an expired token concurrently would
 *    both refresh, and the second response would invalidate the first's token —
 *    the first agent then holds a credential that has already been retired.
 *    Concurrent callers share one refresh.
 */
export class EtsyAuth {
  static readonly PROVIDER = 'etsy'

  #store: TokenStore
  #config: EtsyAuthConfig
  #fetch: typeof globalThis.fetch
  #now: () => Date
  #inFlight: Promise<StoredToken> | null = null

  constructor(store: TokenStore, config: EtsyAuthConfig, deps: EtsyAuthDeps = {}) {
    this.#store = store
    this.#config = config
    this.#fetch = deps.fetch ?? globalThis.fetch
    this.#now = deps.now ?? (() => new Date())
  }

  /** Step one of the browser flow. Keep the verifier — `exchangeCode` needs it. */
  startAuthorization(pkce: Pkce = createPkce()): { url: string; pkce: Pkce; state: string } {
    const state = createPkce().verifier.slice(0, 24)
    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.#config.redirectUri,
      scope: this.#config.scopes.join(' '),
      client_id: this.#config.clientId,
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: pkce.method,
    })

    return { url: `${ETSY_AUTHORIZE_URL}?${params}`, pkce, state }
  }

  /** Step two: trade the redirect's `code` for tokens, and persist them. */
  async exchangeCode(code: string, verifier: string): Promise<StoredToken> {
    return this.#requestToken({
      grant_type: 'authorization_code',
      client_id: this.#config.clientId,
      redirect_uri: this.#config.redirectUri,
      code,
      code_verifier: verifier,
    })
  }

  /**
   * A usable access token, refreshing first if it is expired or nearly so.
   *
   * Call this before every request rather than caching the string — the whole
   * point is that the refresh is invisible to callers.
   */
  async accessToken(): Promise<string> {
    const stored = this.#store.read(EtsyAuth.PROVIDER)
    if (!stored) throw new ReauthorizationRequiredError('no stored credentials')

    if (stored.expiresAt.getTime() - this.#now().getTime() > RENEW_MARGIN_MS) {
      return stored.accessToken
    }

    return (await this.refresh()).accessToken
  }

  /** Forces a refresh. Concurrent callers share one in-flight request. */
  async refresh(): Promise<StoredToken> {
    if (this.#inFlight) return this.#inFlight

    this.#inFlight = this.#doRefresh().finally(() => {
      this.#inFlight = null
    })
    return this.#inFlight
  }

  async #doRefresh(): Promise<StoredToken> {
    const stored = this.#store.read(EtsyAuth.PROVIDER)
    if (!stored?.refreshToken) {
      throw new ReauthorizationRequiredError('no refresh token stored')
    }

    return this.#requestToken({
      grant_type: 'refresh_token',
      client_id: this.#config.clientId,
      refresh_token: stored.refreshToken,
    })
  }

  async #requestToken(body: Record<string, string>): Promise<StoredToken> {
    let response: Response
    try {
      response = await this.#fetch(ETSY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
      })
    } catch (cause) {
      throw new RemoteError('Etsy token endpoint unreachable', {
        provider: 'etsy',
        applied: 'maybe',
        cause,
      })
    }

    const payload = (await response.json().catch(() => ({}))) as TokenResponse

    if (!response.ok || !payload.access_token) {
      const detail = payload.error_description ?? payload.error ?? `HTTP ${response.status}`
      // A rejected grant means the stored refresh token is dead. No amount of
      // retrying fixes that; say so plainly rather than looping overnight.
      if (response.status === 400 || response.status === 401) {
        throw new ReauthorizationRequiredError(detail)
      }
      throw new RemoteError(`Etsy token request failed: ${detail}`, {
        provider: 'etsy',
        applied: 'maybe',
        status: response.status,
      })
    }

    const now = this.#now()
    const token: StoredToken = {
      accessToken: payload.access_token,
      // Etsy always returns a fresh refresh token; fall back defensively rather
      // than storing null and locking ourselves out.
      refreshToken: payload.refresh_token ?? this.#store.read(EtsyAuth.PROVIDER)?.refreshToken ?? null,
      expiresAt: new Date(now.getTime() + (payload.expires_in ?? 3600) * 1000),
      scopes: this.#config.scopes,
    }

    // Committed before the caller can act on it. This ordering is the whole
    // defence against a crash losing a rotated refresh token.
    this.#store.save(EtsyAuth.PROVIDER, token, now)

    return token
  }

  /**
   * Days before the stored refresh token ages out and a human has to
   * reconnect. Negative means it already has.
   */
  daysUntilReauthorization(): number | undefined {
    const stored = this.#store.read(EtsyAuth.PROVIDER)
    if (!stored?.refreshToken || !stored.updatedAt) return undefined

    const deadline = stored.updatedAt.getTime() + REFRESH_TOKEN_LIFETIME_DAYS * 86_400_000
    return (deadline - this.#now().getTime()) / 86_400_000
  }

  /** True when the reconnect should be scheduled rather than discovered. */
  needsAttentionSoon(): boolean {
    const days = this.daysUntilReauthorization()
    return days !== undefined && days < REAUTH_WARNING_DAYS
  }
}
