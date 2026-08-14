# Where this project stands

*Updated 2026-08-14. **Read this first and read it alone.** It exists so a fresh
session can get oriented in one file instead of loading a dozen. Everything
below links to detail — follow a link only when the task actually needs it.*

---

## What this is, in five lines

Josh Vaughan ("Josh The AI Guy") is building an **agent factory**: an explorable
overhead RTS-style 3D view where named AI agents visibly work in their own rooms
— backed by **real autonomous businesses**, starting with an Etsy
print-on-demand store. The 3D view is a sales asset for his courses and
consulting. The store is a real business, not a prop.

**Josh's standing rule: nothing faked.** Every demo is a live capture of a
genuinely working system. A factory view with nothing behind it is a
screensaver, and he would know.

---

## Reading order — and what to skip

| If you are… | Read | Skip |
|---|---|---|
| Getting oriented | this file only | everything else |
| Writing store/API code | `etsy-printify-operating-rules.md`, `../factory/README.md` | the legal and image-rights docs |
| Working on designs or prompts | `image-generation-rights.md` | the API docs |
| Answering "can we do X legally?" | `legal-risk-and-compliance.md` | the rest |
| Opening/administering the shop | `etsy-shop-setup.md` | the rest |
| Touching agent roles | `agent-roster.md` | the rest |
| Choosing a harness | `harness-decision.md` | the rest |

**Do not read `docs/research/01..04`** unless specifically chasing the
hand-tracking or Unreal-vs-Three.js history. They are superseded background from
the pre-pivot project and are large.

**Do not re-read the transcript.** Everything durable is in these files.

---

## Built and working

**`factory/` — the deterministic core.** 54 tests, typecheck clean, no build
step, no native dependencies (Node strips types, SQLite is in core). Write
ledger with at-most-once execution, header-adaptive rate limiter, Etsy OAuth
refresh with committed-before-use rotation and single-flight, guards defaulting
to writing nothing. See `../factory/README.md`.

**`app/` + `server/` — Phase 1/2 of the *old* concept.** Hand tracking and voice
work; the hologram scene is visually primitive and Josh will not demo it. The
input layers are reusable for a factory view. The hologram scene is not.

---

## Not built

Printify client · Etsy client · order/listing state machine · MCP server ·
trademark screening · any agent · the 3D factory itself.

---

## The blocker

**Trademark screening.** No product carrying a word, name or slogan ships until
KILN can screen it. It guards the only risk **nobody indemnifies** — every image
provider's IP indemnity excludes trademark claims arising from selling
merchandise.

Shape is known: local index from USPTO bulk data at `data.uspto.gov/bulkdata`
(note `bulkdata.uspto.gov` is **dead**), plus keyed TSDR lookups, screening
Classes 25/16/21/18. The search UI is behind bot protection and is not
scrapeable. It can only ever be triage — a human signs off on anything with text
on it.

---

## Decisions locked

- **Generate images on Google Cloud Vertex AI**, paid tier, GA models. Only
  provider indemnifying output *and* training data. Midjourney is disqualified —
  its terms ban automated tools.
- **We create the Etsy listing**, using Printify's generic API channel, because
  Etsy has no AI-disclosure field and `production_partner_ids` is settable at
  creation. Never both pipelines.
- **The AI disclosure is template-injected**, never model-authored.
- **OpenClaw as scheduler and front door; deterministic core as an MCP server;
  agents for judgement only.**
- **KILN needs a human creative stage** — prompt-only output is not
  copyrightable, so it is undefendable.
- **QUARRY may not touch the Etsy API** for research. Josh runs Marketplace
  Insights searches by hand; QUARRY reasons over the results.
- **Shop entity: sole proprietor on Josh's SSN.**
- **Shop name: `BrambleKiln`** — see below.

---

## Shop name — chosen, NOT yet cleared

**`BrambleKiln`.** 11 characters, alphanumeric, within Etsy's 4–20 limit.
`bramblekiln.com` verified open by DNS on 2026-08-14 (checked against controls —
a nonsense string reads open, `google.com` reads taken).

Chosen for clearance first: an unusual compound has far lower collision risk
than names built on high-traffic branding words like "Ink". Warm and native to
Etsy's aesthetic, mugs are a core POD product so *kiln* is an asset rather than a
mismatch, and it ties to the KILN agent for the course narrative.

Fallbacks, all domain-open as of 2026-08-14: **FernKiln**, **LarkAndLoam**,
**VellumKiln**, **QuillAndLoam**.

> ⚠️ **The trademark screen was NOT completed.** Justia returns 403 to automated
> fetching, USPTO's search UI is behind AWS WAF, and this session's web-search
> budget was exhausted. **This is the first task of the next session.**
>
> Three checks, roughly five minutes:
> 1. `tmsearch.uspto.gov` — search the literal, filter to **live** marks, check
>    Classes 25, 16, 21, 18. Any live similar mark in those classes → use a
>    fallback.
> 2. Google the phrase in quotes — catches common-law users the register misses.
> 3. Search Etsy — it rejects duplicate shop names at signup anyway.
>
> Screen the top two so there is a ready fallback mid-signup. If it clears, take
> the `.com` the same day.

---

## What only Josh can do

1. **Open the Etsy shop.** Needs his ID, bank, card, SSN. Full checklist with
   the traps in `etsy-shop-setup.md` — the load-bearing ones are: **opt out of
   Offsite Ads immediately** (15% by default, mandatory forever above
   $10k/365d), **shop language is permanent**, and **enter the SSN during
   onboarding** or the shop suspends at $500 in sales.
2. **Register Printify as a production partner** in Shop Manager. There is **no
   API** for this — `getShopProductionPartners` is GET-only. Blocks the Etsy
   client end-to-end.
3. **Register the Seller App** at `etsy.com/developers`. No waiting period, no
   sales minimum, approved in minutes once the shop is open.
4. **Decide what the human creative stage in KILN looks like** in his hands —
   editing, composition, his own drawn elements. A workflow question, not a code
   one, and it determines whether designs are assets or public domain.
5. **Get a real `sk-ant-api…` key** if the old voice demo is ever revived. The
   current `sk-ant-oat…` OAuth token is rate-limited to unusable.

---

## Open questions worth an answer

- **Ask Etsy in writing** whether the ML/analytics clause reaches our own
  first-party shop data. The terms offer written authorisation as the escape
  hatch. Constrains how much order history an agent may reason over.
- **EUIPO and WIPO coverage** for non-US trademarks.
- **The Etsy set-up fee amount** — Etsy publishes no figure anywhere; the
  widely-repeated "$15" has zero primary-source support. Visible in-flow.

---

## Working notes for the next session

- **Model:** Josh directed Sonnet or Haiku over Opus for the app's LLM.
- **Security is a standing gate.** Before any push to the public repo
  (`github.com/jvaughan007/jarvis`), scan for credentials and personal data.
  Nothing secret has ever been committed; keep it that way. See `../SECURITY.md`.
- **No Marvel or movie references in UI copy.** Josh is not a fan and asked for
  a tutorial rather than assumed knowledge.
- **Verify tools before trusting them.** Two screening runs in this project
  returned confidently wrong results — macOS `whois` reports the `.com` TLD
  record rather than the domain, and `timeout` does not exist on macOS. Always
  run a known-good and known-bad control first.
- **Etsy and most legal sources 403 automated fetchers.** Use Wayback `id_`
  (raw) captures and record snapshot dates.
