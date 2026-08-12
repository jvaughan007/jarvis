/**
 * Migrations are applied in order and tracked with SQLite's `user_version`.
 * Never edit a migration that has shipped — append a new one.
 */
export const MIGRATIONS: readonly string[] = [
  // 1 — the write ledger.
  //
  // Every call that changes state on Etsy or Printify gets a row here *before*
  // the call is made. This is what stands between a retried run and a duplicate
  // listing on a live storefront.
  `
  CREATE TABLE writes (
    key           TEXT PRIMARY KEY,
    operation     TEXT NOT NULL,
    state         TEXT NOT NULL CHECK (state IN ('in_flight', 'succeeded', 'failed', 'indeterminate')),
    request_hash  TEXT NOT NULL,
    result_json   TEXT,
    error         TEXT,
    attempts      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX writes_by_state ON writes (state, updated_at);
  CREATE INDEX writes_by_operation ON writes (operation, created_at);
  `,

  // 2 — OAuth tokens, one row per provider.
  //
  // Etsy's refresh loop is the single most likely thing to break an unattended
  // overnight run, so the tokens live in the same transactional store as
  // everything else rather than in a stray JSON file.
  `
  CREATE TABLE oauth_tokens (
    provider       TEXT PRIMARY KEY,
    access_token   TEXT NOT NULL,
    refresh_token  TEXT,
    expires_at     TEXT NOT NULL,
    scopes         TEXT NOT NULL DEFAULT '',
    updated_at     TEXT NOT NULL
  );
  `,

  // 3 — run ledger. One row per scheduled wake-up, so a half-finished run is
  // visible as a half-finished run rather than inferred from a transcript.
  `
  CREATE TABLE runs (
    id           TEXT PRIMARY KEY,
    agent        TEXT NOT NULL,
    kind         TEXT NOT NULL,
    state        TEXT NOT NULL CHECK (state IN ('running', 'succeeded', 'failed', 'aborted')),
    dry_run      INTEGER NOT NULL,
    writes_used  INTEGER NOT NULL DEFAULT 0,
    note         TEXT,
    started_at   TEXT NOT NULL,
    ended_at     TEXT
  );
  CREATE INDEX runs_by_started ON runs (started_at DESC);
  `,
]
