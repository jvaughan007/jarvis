# Agent Harness — Recommendation

*Researched 2026-08-11. Note the gap in §4: the OpenClaw and Hermes research
specifically did not complete.*

## Requirements this has to satisfy

(a) a handful of long-lived specialist agents · (b) scheduled autonomous work
with no human watching · (c) calling third-party REST APIs (Etsy, Printify) ·
(d) structured telemetry a 3D dashboard can consume · (e) progressive-disclosure
skills, `FACTORY.md → agent → skill` · (f) surviving crashes overnight

## Three things changed in 2025–26

1. **`SKILL.md` became an open cross-vendor standard** ([agentskills.io](https://agentskills.io/)),
   now implemented by ~45 products. The progressive-disclosure pattern Josh
   described is **portable**, not locked to any one vendor.
2. **Anthropic shipped first-class cron** — Managed Agents scheduled deployments.
3. **Durable execution went mainstream** — LangGraph 1.2, Temporal, Vercel
   Workflows, Inngest, DBOS, Mastra all ship it.

## Recommendation

### ① Claude Managed Agents — scheduled deployments

The only option where **all six requirements are first-party and cohesive**, with
no orchestrator to write.

- **(b) Scheduling:** `POST /v1/deployments` with POSIX cron + IANA timezone,
  per-run dollar budget, and a manual `/run` for testing. ⚠️ Jitter up to 15% of
  the interval (max 9 min) — don't build a downstream deadline on the timestamp.
  ⚠️ DST is literal wall-clock: spring-forward times are **skipped**, fall-back
  times **fire twice**. Avoid 1–3 AM local.
- **(c) Credentials — the standout feature.** Vault `environment_variable`
  credentials are stored by Anthropic, appear in the agent's sandbox as an
  **opaque placeholder**, and the real secret is substituted **at egress**,
  scoped to allowed hosts. **Code running in the sandbox cannot exfiltrate the
  Etsy or Printify key, even under prompt injection.** For an autonomous agent
  holding live store credentials, nothing else here solves this as well.
- **(d) Telemetry:** HMAC-signed webhooks (`deployment_run.*`,
  `session.status_*`, `session.usage`) plus an SSE event stream plus a queryable
  `deployment_runs` table with typed errors. Push-based, which is exactly what
  the 3D factory wants.
- **(a) Multi-agent:** a coordinator roster of 1–20 versioned agents, each with
  its own model. Put QUARRY's reading-heavy work on Haiku 4.5 and KILN's
  judgement on a bigger model.
- **(e) Skills:** `skills[]` on the agent, **or** mount a GitHub repo and it
  auto-loads `.claude/skills/` at session start — so skills stay in git. ⚠️
  Scanned once at session start; mid-session pushes aren't picked up. ⚠️ Anyone
  who can commit to that repo can inject agent instructions — treat
  `.claude/skills/` as part of the trust boundary.
- **(f) Durability:** auto-reschedules on transient errors, persistent sandbox
  and event history, automatic compaction, and `budget_reached` **pauses**
  rather than terminating.

**Costs and caveats:** it's beta; not eligible for zero-data-retention or a
HIPAA BAA (fine for an Etsy store, disqualifying for regulated clients); Claude
only; and session runtime bills at **$0.08/hour** on top of tokens — so sleep
between stages as separate sessions rather than one long-running one.

⚠️ **Operational trap worth knowing now:** an archived environment, vault, or
subagent silently **pauses** the deployment; archiving the primary agent
**permanently archives** it. Monitor `deployment.paused` webhooks or the factory
quietly stops running.

### ② Temporal + Claude Agent SDK — if lock-in matters

The strongest durability and the only genuinely complete scheduler: overlap
policy (what happens when run N+1 fires while N is still going — a real concern
for multi-hour agent runs), **backfill** (replay missed windows after an
outage — nobody else has this), pause/unpause, and jitter. Pair it with the
Claude Agent SDK, which has the reference implementation of skills and the best
OTel story (subagent spans nest under the parent, so the whole delegation tree
is one trace).

Cost: you operate Temporal, and determinism discipline is a real learning curve.

### ③ Mastra — if TypeScript-first

The only *single* framework that natively ships all six. Apache-2.0,
agentskills.io-compliant, cron with IANA timezones, `DurableAgent` snapshots.

⚠️ **Their own docs warn:** recovery re-runs the agentic loop from the last
snapshot, **re-issuing LLM calls and re-executing tool calls**. For an agent
that creates Etsy listings, that is a duplicate-listing bug waiting to happen.

### Not recommended

**CrewAI** — no scheduler at all, checkpoint bugs still open, ~2 releases/week
of churn. **n8n as the agent brain** — its Agents feature is Preview and queue
mode isn't supported, though it's an excellent *scheduler*. **OpenAI Agents SDK**
or **Microsoft Agent Framework** — neither schedules, and neither beats the
Claude SDK when the model is Claude.

### The honest baseline: cron + scripts

For a single-operator store this is legitimate and often the right first
version. Cron for timing, one Postgres table as the run ledger, `tenacity` for
backoff. **It beats CrewAI outright.** Pair it with the Claude Agent SDK and you
get skills, subagents and OTel with cron doing the timing. Migrate the moment
you write your second checkpoint-and-resume helper.

---

## Non-negotiables regardless of harness

- **Idempotency keys on every Etsy and Printify write.** Any durable system
  replays. A retried listing creation without a dedupe key is a duplicate
  listing on your account. Keep a `(run_id, design_hash) → listing_id` table and
  check before creating.
- **Respect published rate limits.** Etsy publishes per-day and per-second
  headers and asks for exponential backoff on 429. Printify: 600 req/min global,
  200 per 30 min for publishing, and — easy to miss — **errors must stay under
  5% of total requests**.
- **Own the OAuth refresh loop.** Etsy v3 uses OAuth 2.0 with PKCE and
  refreshable tokens. This is the single most likely thing to break an
  unattended overnight run.
- **Gate the publish step.** A max-listings-per-run cap and a dry-run mode that
  writes intended listings to a table without calling Etsy. Even "no human in
  the loop" wants a kill switch.

## Cost control

- **Prompt caching is the biggest lever** — cache reads are ~0.1× input price.
  Minimums are not monotonic across models, so verify `cache_read_input_tokens`
  is non-zero rather than assuming.
- **Tier the models.** Reading-heavy research on the cheap tier; judgement and
  copy on the expensive one.
- **Cap spend structurally.** Managed Agents budgets are platform-enforced
  pre-request gates — the session pauses rather than overrunning. Prompting an
  agent to be frugal is not a control.
- **Batch the non-urgent.** Design briefs and listing copy are
  latency-insensitive — the Batches API is 50% off.

---

## OpenClaw vs Hermes — answered

Both are real, substantial, actively developed, and neither is disqualifying.
They are the same species of tool: a local daemon, `SKILL.md` skills, channel
adapters, cron, and subagents. Hermes even ships an OpenClaw importer.

| | **OpenClaw** | **Hermes Agent** |
|---|---|---|
| Repo | `openclaw/openclaw` (~386k ★) | `NousResearch/hermes-agent` (~229k ★) |
| Licence / language | MIT, TypeScript, OpenClaw Foundation | MIT, Python, Nous Research |
| Config | `~/.openclaw/openclaw.json` (JSON5) | `~/.hermes`, CLI-driven |
| Agents | `agents.entries.<id>` — own workspace, persona files, model, **per-agent auth in separate SQLite DBs**, per-agent tool allow/deny | subagents for parallel work |
| Skills | `SKILL.md`, six discovery roots, per-agent allowlists, **per-skill secret injection** | `SKILL.md` (agentskills.io standard); **authors and improves its own skills from experience** |
| Scheduling | **`openclaw automations`** — cron/interval/one-shot/event, per-agent targeting, four session lanes, **SQLite-persisted run history**, auto-disable after 10 consecutive failures | built-in cron, natural-language defined |
| Sandboxing | **opt-in** | **seven backends** — local, Docker, SSH, Singularity, Modal, Daytona, Vercel Sandbox |
| Providers | 40+, with failover chains and key rotation on 429 | Nous Portal, OpenRouter, OpenAI, Anthropic, custom |
| Versioning | CalVer, multiple releases/week | **0.x**, releases every 1–2 weeks |

**OpenClaw's scheduler is the more serious piece of engineering for this job** —
per-agent targeting, persisted run history, and auto-disable on repeated failure
are all things you would otherwise build yourself.

### ⚠️ The security caveat that matters here specifically

OpenClaw's docs are candid: it assumes **"one trusted operator boundary per
gateway (single-user, personal-assistant model)"** — explicitly *not* hostile
multi-tenant isolation. Their stated threat model is that the assistant "can
execute arbitrary shell commands, read/write files, access network services, and
send messages to anyone." **Sandboxing and tool-denial are opt-in**, and
prompt-injection-only findings without a policy bypass are classified as *not*
vulnerabilities.

That is a reasonable stance for a personal assistant. **It is a sharper risk
here**, because this agent reads customer messages and scraped web content —
untrusted input — while holding live Etsy and Printify credentials. If OpenClaw
runs the store, sandboxing and tool-deny lists must be turned on deliberately,
and credentials should go through a proxy such as `Infisical/agent-vault` rather
than plain env vars. Hermes' Docker/Modal backends are the safer default if that
trade bothers you.

### The recommendation — and it makes the harness choice less load-bearing

**Do not build the store as free-form agents on either harness.** Not a maturity
objection — a shape objection. An Etsy store on a schedule has a hard core that
must be **idempotent, rate-limit-aware, retryable and auditable**: OAuth refresh,
listing creation, inventory and price sync, order → fulfilment, money-touching
state. An LLM is the wrong executor for those. When a scheduled run half-completes
and re-fires, you want a job row and a dedupe key — not a model re-reading a
transcript and guessing.

**Three layers:**

1. **Deterministic core, in code.** Etsy client, Printify client, and the
   order/listing state machine as ordinary code with a real datastore and
   idempotency keys. Expose it as an **MCP server**.
2. **Agents for judgement only.** QUARRY, KILN, ECHO earn their keep on the
   genuinely fuzzy work — research, design prompts, listing copy, QA of
   generated art, customer-message triage. Non-determinism is a feature there.
3. **Harness as scheduler and front door.** OpenClaw automations wake the
   pipeline, target the right agent, and deliver results to Slack or Telegram
   for the approval gate.

**Why this resolves the tension cleanly:** the MCP server is consumed natively by
OpenClaw, Hermes, *and* Claude Code. So Josh can run the factory on OpenClaw —
which is the right business call, since it makes the demo a live advertisement
for what he installs for clients — without betting the pipeline on it. The same
core survives if the ecosystem shifts, and OpenClaw was called something else
entirely a year ago, so it plausibly will.

**Decision: OpenClaw as scheduler and operator front door. Deterministic core as
an MCP server. Agents for judgement only.**

⚠️ **Pin the version.** CalVer with multiple releases per week, on a machine
running a storefront — never track `@latest`.
