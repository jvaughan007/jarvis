# factory — the deterministic core

The part of the agent factory that is **not** an agent.

An Etsy store on a schedule has a hard core that must be idempotent,
rate-limit-aware, retryable and auditable: OAuth refresh, listing creation,
inventory and price sync, order → fulfilment, anything touching money. A
language model is the wrong executor for that. When a scheduled run
half-completes and re-fires, you want a job row and a dedupe key — not a model
re-reading a transcript and guessing.

So this is ordinary code with a real datastore. Agents call it; they do not
reimplement it. See `../docs/harness-decision.md`.

## Running it

No build step and no native dependencies. Node 24+ strips the types and ships
SQLite in core, so this directory can be zipped and handed to someone without a
toolchain.

```bash
npm install     # test tooling only — the source itself has no dependencies
npm test
npm run typecheck
```

## What is here

| Module | Responsibility |
|---|---|
| `store/db.ts` | SQLite handle and migrations. The only file that knows the driver. |
| `store/schema.ts` | Migrations, applied in order, tracked by `user_version`. |
| `store/writeLedger.ts` | At-most-once execution for every state-changing call. |
| `net/rateLimiter.ts` | Sliding-window limiter that corrects itself from response headers. |
| `auth/pkce.ts` | PKCE verifier and S256 challenge. |
| `auth/tokenStore.ts` | Durable OAuth credentials. |
| `auth/etsyAuth.ts` | Etsy's authorization and refresh loop. |
| `safety/guards.ts` | Dry-run, write budget, error budget, kill switch. |
| `errors.ts` | Typed errors, including whether a failed call may have taken effect. |

## The four decisions worth knowing

### A failed write is not automatically retryable

Errors carry an `applied` flag. `'no'` means the request provably never reached
the provider — a locally-refused rate limit, a DNS failure. Those retry freely.

`'maybe'` means the outcome is unknown: a timeout, a dropped connection, a 5xx.
**`'maybe'` is the default everywhere**, including for bugs in our own code,
which could have thrown either side of the call. A write that ends `'maybe'`
goes to `indeterminate` and **blocks its own retry** until a human checks the
provider and calls `reconcile()`.

That is deliberately inconvenient. The alternative is a storefront with two of
everything.

### Rate limits are learned, not configured

Etsy no longer publishes numeric quotas — the widely-cited "10,000/day, 10/sec"
figures are not in current documentation. Real limits are readable only from
your own portal page and from `x-limit-per-second` / `x-remaining-this-second` /
`x-limit-per-day` / `x-remaining-today`. The configured values in
`ETSY_WINDOWS` are conservative placeholders that the first response overwrites,
not a claim about Etsy's actual quota.

Printify's limits *are* published, so those are configured. Note its unusual
one: **errors must stay under 5% of total requests**, which a retry loop can
breach while comfortably under the request cap. Hence the error budget guard.

### The refresh token rotates, and losing it means a human at a browser

Etsy issues a new refresh token on every refresh and kills the old one
immediately. Crash between receiving it and persisting it and the shop is
locked out with no automated recovery.

So credentials are committed to the transactional store **before** the access
token is handed to any caller, and concurrent refreshes are collapsed into one
request — two agents refreshing at once would have the second response retire
the first agent's brand-new token.

Refresh runs on a schedule, not lazily on 401. The refresh token's own 90-day
window is tracked, and `needsAttentionSoon()` raises a flag with two weeks left,
so the reconnect is scheduled rather than discovered at 2am.

### Everything defaults to not writing

`dryRun` is **true** unless `FACTORY_LIVE=1`. Every other environment default is
the cautious one — a missing variable can only make the system safer, never
riskier.

The per-run write cap is a **compliance control**, not just a runaway-loop
guard. Etsy's API terms prohibit facilitating listings "including but not
limited to mass-produced items," and enforcement arrives as silent visibility
throttling before it arrives as a ban. A low cap is the shape of a shop that
stays inside that line.

```bash
FACTORY_LIVE=1              # off by default; typing this is a deliberate act
FACTORY_MAX_WRITES=10       # per run
FACTORY_KILL_SWITCH=/path   # if this file exists, nothing is written
```

## What is deliberately missing

**There is no Etsy listing-creation path, and there will not be one.** Printify
holds the Etsy connection; its publish call is what creates the listing.
Creating one ourselves as well is the duplicate-listing footgun in this stack.
See `../docs/etsy-printify-operating-rules.md`.

Still to build: the Printify client, the Etsy read client, the order/listing
state machine, and the MCP server that exposes all of it to agents.

## Credentials

Nothing secret belongs in this directory or in the repository. Credentials come
from the environment of the machine running the factory, and OAuth tokens live
in the SQLite store, which is gitignored along with every `*.db` and `*.sqlite`.
See `../SECURITY.md`.
