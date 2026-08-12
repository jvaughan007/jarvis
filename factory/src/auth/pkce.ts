import { createHash, randomBytes } from 'node:crypto'

export interface Pkce {
  verifier: string
  challenge: string
  /** Etsy requires this to be exactly `S256`. */
  method: 'S256'
}

/**
 * Etsy mandates PKCE and states `code_challenge_method` "must always be the
 * value S256". The verifier must be 43–128 characters drawn from
 * `[A-Za-z0-9._~-]`.
 *
 * 32 random bytes in base64url is 43 characters — the minimum length, and its
 * alphabet is a subset of the permitted set.
 */
export function createPkce(entropy: () => Buffer = () => randomBytes(32)): Pkce {
  const verifier = base64url(entropy())
  return {
    verifier,
    challenge: base64url(createHash('sha256').update(verifier).digest()),
    method: 'S256',
  }
}

const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/

export function isValidVerifier(verifier: string): boolean {
  return VERIFIER_PATTERN.test(verifier)
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
