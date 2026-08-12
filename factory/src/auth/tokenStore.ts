import type { Db } from '../store/db.ts'

export interface StoredToken {
  accessToken: string
  refreshToken: string | null
  /** Absolute expiry of the access token. */
  expiresAt: Date
  scopes: string[]
  /**
   * When these credentials were written. The refresh token's own 90-day clock
   * restarts here, so this is what says how long until a human must reconnect.
   */
  updatedAt?: Date
}

interface TokenRow {
  provider: string
  access_token: string
  refresh_token: string | null
  expires_at: string
  scopes: string
  updated_at: string
}

/**
 * Durable home for OAuth credentials.
 *
 * These live in the transactional store rather than a JSON file for one
 * reason: Etsy issues a **new refresh token with every refresh**, and the old
 * one dies the moment the new one is minted. A process that crashes between
 * receiving the new token and persisting it is locked out and needs a human at
 * a browser. `save()` commits synchronously, and callers must commit before
 * using the access token they were handed.
 */
export class TokenStore {
  #db: Db

  constructor(db: Db) {
    this.#db = db
  }

  read(provider: string): StoredToken | undefined {
    const row = this.#db.get<TokenRow>('SELECT * FROM oauth_tokens WHERE provider = ?', [provider])
    if (!row) return undefined

    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
      scopes: row.scopes === '' ? [] : row.scopes.split(' '),
      updatedAt: new Date(row.updated_at),
    }
  }

  save(provider: string, token: StoredToken, now: Date = new Date()): void {
    this.#db.transaction(() => {
      this.#db.run(
        `INSERT INTO oauth_tokens (provider, access_token, refresh_token, expires_at, scopes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (provider) DO UPDATE SET
           access_token  = excluded.access_token,
           refresh_token = excluded.refresh_token,
           expires_at    = excluded.expires_at,
           scopes        = excluded.scopes,
           updated_at    = excluded.updated_at`,
        [
          provider,
          token.accessToken,
          token.refreshToken,
          token.expiresAt.toISOString(),
          token.scopes.join(' '),
          now.toISOString(),
        ],
      )
    })
  }
}
