import { createHash } from 'node:crypto'

/**
 * JSON with object keys in a fixed order, so that two payloads that differ only
 * in property order hash the same. Arrays keep their order — order is meaning
 * there.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)

  return `{${entries.join(',')}}`
}

export function hashPayload(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

/**
 * Builds the key that makes a write idempotent.
 *
 * The run id scopes it so a deliberate re-run of the same design on a later day
 * is a different write, while a *retry* within one run is the same write.
 */
export function writeKey(runId: string, operation: string, subject: unknown): string {
  return `${runId}:${operation}:${hashPayload(subject).slice(0, 16)}`
}
