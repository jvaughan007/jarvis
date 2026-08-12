# Etsy & Printify — Verified Operating Rules

*Researched 2026-08-12 from Etsy's legal pages, Seller Handbook, developer docs
and API Terms of Use, plus developers.printify.com. Etsy's `www` and `help`
hosts return 403 to automated fetchers, so policy text was read from Wayback
`id_` (raw) captures; capture dates are noted per claim. Research notes, not
legal advice.*

**Headline: none of this is prohibited, and Etsy's AI stance is unusually
permissive and has been stable for over a year.** But three findings change the
architecture, and one of them cuts a planned agent off at the knees.

---

## The three findings that change the plan

### ① Printify creates the Etsy listing. We do not.

This is the most consequential correction. Printify holds the Etsy OAuth
connection; `POST /v1/shops/{shop_id}/products/{id}/publish.json` causes
*Printify's* integration to create the listing on Etsy. Published products carry
an `external_id` linking back.

**So the write path for a POD product is Printify-only.** Calling Etsy's
`createDraftListing` for the same product produces a duplicate listing — the
classic footgun in this stack.

Consequences that are easy to miss:

- **The AI-disclosure sentence has to live in the *Printify* product
  description**, because that is the text that lands in Etsy's `description`
  field. Writing it into an Etsy listing after the fact is a second write on a
  record Printify believes it owns.
- **The Etsy production-partner assignment is Etsy-side and Printify does not
  set it.** That step is ours — via Shop Manager or the Etsy API against the
  listings Printify created. *(Flagged unverified — see below.)*
- The Etsy API's role shrinks to reads, order/transaction data, and
  post-publish listing metadata. It is not the product-creation path.

### ② The API Terms forbid using Etsy data for analytics or ML

Verbatim from [API Terms of Use](https://www.etsy.com/legal/api) §5, Prohibited
Behavior (capture 2026-08-01):

> "Use the Etsy API to collect, scan, or otherwise request Etsy content for
> purposes of **analytics, machine learning, training artificial intelligence
> models**, licensing, or content removal, **unless expressly authorized in
> writing by Etsy**."

Plus a broad anti-scraping clause covering "automated systems or browser
extensions to access, analyze, or scrape the Etsy Site, the Etsy API or any
Etsy data... unless expressly authorized in writing by Etsy."

**This guts QUARRY as designed.** An agent that reads competitor listings
through the Etsy API to find demand is squarely inside the prohibited purpose.
Whether it also covers feeding *your own* shop's data to an LLM is unclear and
untested — the clause says "Etsy content" with no carve-out for your own. That
ambiguity is the single largest open legal question in this project.

**What QUARRY has to become:** demand research sourced from *outside* the Etsy
API. Public search-trend data, keyword tools that hold their own licences,
social signal, seasonal calendars, first-party sales history from our own
Printify and payment records. It may not be an Etsy-API scraper, which is what
the reference build's research agent effectively is.

This lands on top of the copyright constraint already recorded in
`legal-risk-and-compliance.md` — QUARRY was already barred from touching
competitor *artwork*. It is now also barred from mining competitor *listings*
through the API.

### ③ The real volume risk is the mass-production clause, not the AI policy

Also §5: the terms forbid facilitating listings "incompatible with Etsy's
Creativity Standards... **including but not limited to mass-produced items**."

Volume is not numerically capped. *Character* is. A shop publishing a moderate
number of genuinely distinct, human-reviewed, properly-disclosed designs is
inside policy. A shop auto-publishing thousands of prompt-permuted variants is
inside the letter of the AI policy and outside the letter of this one.

Enforcement is discretionary and partly unappealable ("Etsy's decision... shall
be final and binding"), and arrives as **silent visibility throttling before it
arrives as a ban** — Etsy reserves the right to "limit the visibility of your
shop, listings or ads." You can be losing before you know you are being
enforced against.

---

## What is permitted, confirmed

### AI-generated designs — allowed, disclosure mandatory

[Creativity Standards](https://www.etsy.com/legal/creativity/) (capture
2026-07-31; page stamped "Last updated on Jun 10, 2025") lists
**"Seller-prompted AI creations"** as a legitimate sub-category of *Designed by
a seller*:

> "Creations that were generated using AI tools... based on a seller's original
> prompts. **Sellers must disclose within their listing description if an item
> is created with the use of AI.**"

The [Seller Policy](https://www.etsy.com/legal/sellers/) ("Last updated on Jun
9, 2026") repeats it as a requirement. Every item must "incorporate a human
touch."

**There is no structured AI field in the Etsy API.** The disclosure is free text
in the description body, so the automation has to write the sentence itself.

**Stability check:** the Creativity Standards body is byte-identical between an
Oct 2025 and a Jul 2026 capture, and the Seller Handbook's
[AI stance article](https://www.etsy.com/seller-handbook/article/1275449912004)
is unchanged between 2024 and 2026 captures. Etsy does say it is "periodically
reevaluating" — stable, not guaranteed. WHETSTONE watches this page.

**Prohibited:** selling AI prompt bundles on their own. Prompts *may* be
included alongside the finished artwork.

### Print-on-demand — allowed. Dropshipping is not.

Printify is named by Etsy as an example production partner, alongside Printful
and Gooten
([help article](https://help.etsy.com/hc/en-us/articles/360000336547-Working-with-Production-Partners-on-Etsy),
capture 2026-07-21).

Requirements to list POD legitimately:

1. **The design must be yours.** AI-prompted by you counts. Vendor templates do
   not — "choosing from a manufacturer's templates doesn't count as
   seller-designed" is a listed removal reason.
2. **Register the partner** in Shop Manager → Settings → Partners you work with.
3. **Attach it to each applicable listing.** Per-listing, not merely shop-level.
4. **Set shipping-from to the partner's location**, accurately.
5. **Disclose AI separately** — a distinct obligation from the partner
   disclosure. Both apply.

Dropshipping is banned outside craft and party supplies. The line between lawful
POD and unlawful dropshipping is **whose design it is**.

### Two removal reasons that bite AI-POD sellers hardest

| Reason | Why it applies here |
|---|---|
| "The same item is available elsewhere online" | Generic AI output converges. Two sellers prompting the same trend ship near-identical work. |
| "Wasn't designed by the seller" | Covers vendor templates and resold pre-existing designs. |

Neither is about AI. Both are the highest-frequency killers.

---

## The API, concretely

### Access tier: Seller App

Three tiers. **Seller App** covers your own shop only and is approved "within
minutes, with no manual review queue." Personal and Commercial require manual
review with **no published SLA**. For "agents run my own shop," Seller App is
the answer — do not pursue Commercial unless shipping a product to other
sellers.

Declare the automation honestly in the Application Purpose; approval is granted
against that stated purpose.

### Draft → review → activate is the compliance spine

`createDraftListing` creates a **draft**; publishing requires at least one image
and is a deliberate second step. **Use that gate.** It maps exactly onto what
Etsy's rules actually require — creative judgement and truthful disclosure, both
human acts — and converts most of the risk surface into a reviewable queue.

This is the same approval gate already in the agent roster, now with a policy
reason rather than only a quality reason.

### Rate limits are read, not assumed

Etsy **no longer publishes default numeric quotas**. The widely-cited
"10,000/day, 10/sec" figures are not in current documentation. Limits are QPS
plus QPD on a 24-hour sliding window, applied per API key, and readable only
from your own portal page and from response headers:

| Header | Meaning |
|---|---|
| `x-limit-per-second` | QPS allocation |
| `x-remaining-this-second` | Left this second |
| `x-limit-per-day` | QPD allocation |
| `x-remaining-today` | Left in the sliding window |
| `retry-after` | Seconds to wait, sent on breach |

Breach returns 429. QPS is evaluated before QPD.

**So the rate limiter must be adaptive — driven by these headers — not
configured with hardcoded constants.** Anything hardcoded is guessing at a
number Etsy declines to publish.

Creating extra API keys to raise the ceiling is explicitly prohibited.

### OAuth 2.0 + PKCE — and the trap that will break an overnight run

- PKCE **mandatory**, `code_challenge_method` must be `S256`. Verifier 43–128
  chars from `[A-Za-z0-9._~-]`.
- Access token: **1 hour**. Refresh token: **90 days**.
- **`x-api-key` is required on every call in addition to `Authorization:
  Bearer`.** A 401 with a valid token is usually a missing API key.
- Access tokens are user-prefixed (`{user_id}.{token}`) — not opaque blobs.
- Adding a scope later requires full re-consent in a browser. **Request the
  complete scope set on day one.**

> ⚠️ **Refresh tokens rotate.** Every refresh grant returns a *new* refresh
> token. Crash between receiving it and persisting it and you are locked out,
> needing a human at a browser. **Persist the new token atomically before the
> old one is discarded** — write-then-swap, never in-memory-then-write. This is
> the single most likely thing to break an unattended run, and it is silent.

Refresh on a schedule, well inside the window — not lazily on 401. A process
idle beyond 90 days is dead regardless. Truly unattended-forever is not
achievable by design; there needs to be a written re-auth runbook.

### Housekeeping obligations

- Display: *"The term 'Etsy' is a trademark of Etsy, Inc. This Application uses
  Etsy's API, but is not endorsed or certified by Etsy."*
- Don't display listing content more than **6 hours** staler than Etsy's own.
- An app with no successful call for **6 consecutive months** may be suspended.
- Request the minimum data needed; no unrelated operations in the app.

## Printify, concretely

| | |
|---|---|
| Auth | Personal Access Token (single account, **valid one year** — diarise the rotation) or OAuth 2.0 for multi-merchant apps |
| Global limit | 600 requests/minute |
| Catalog API | 100/minute per integration, per account |
| **Publishing** | **200 requests per 30 minutes** |
| **Error budget** | **Errors must stay under 5% of total requests** |

That error budget is unusual and worth instrumenting: a buggy retry loop can get
you throttled while comfortably under the request cap. It is a reason to fail
closed rather than retry hard.

Printify renders mockups server-side from uploaded print files, so mockup
generation is not our problem. Publish is followed by
`publishing_succeeded` / `publishing_failed` callbacks.

---

## How this binds the build

**The deterministic core (`factory/`)**

- Etsy client is **read + post-publish metadata only**. No listing creation.
- Printify client owns product creation and publish. Publish is the single
  guarded write path.
- Rate limiting is **header-driven and adaptive**, per provider, per key.
- Printify's 5%-error budget means errors are tracked as a first-class metric,
  not just logged.
- Token storage writes the rotated refresh token **inside the same transaction**
  that retires the old one, and commits before the new access token is used.
- A max-writes-per-run cap exists to serve the mass-production clause, not just
  as a kill switch.

**QUARRY** — may not source demand research from the Etsy API. Rebuild around
off-Etsy signal and first-party data. This is a rewrite of its brief, not a
tweak.

**KILN** — must emit the AI-disclosure sentence into the *Printify* product
description, and retain provenance showing the prompts were Josh's, because the
policy permits "seller-prompted" AI specifically.

**LEDGER** — must attach the production partner and correct shipping-from on
Etsy for every listing Printify creates, and must never call
`createDraftListing` for a POD product.

**The human gate is non-delegable.** Authoring the creative direction, reviewing
and publishing each listing, verifying the disclosure is present, registering
production partners, customer service, and periodic OAuth re-consent all
require Josh. That is not a limitation of the build — it is what makes the shop
compliant.

---

## Hard don'ts

- ❌ Sell AI prompt bundles.
- ❌ Pull Etsy API data into analytics, ML, or an LLM pipeline.
- ❌ Mass-publish undifferentiated prompt-permuted variants.
- ❌ Dropship anything outside craft and party supplies.
- ❌ List vendor templates as your own designs.
- ❌ Create extra API keys to raise the rate ceiling.
- ❌ Double-publish through both Printify and the Etsy API.

## Still unverified

1. **Listing Image Requirements** — 403 on both live and archive. The Creativity
   Standards mention "limited exceptions for... items made with production
   partner assistance," which suggests Printify-generated mockups are
   acceptable as listing images, but the exact wording is unconfirmed. Confirm
   before relying on vendor mockups as the only images.
2. **Whether Printify sets any Etsy production-partner metadata.** Believed not
   — meaning the step is entirely ours — but developers.printify.com did not
   serve the Etsy-specific integration section.
3. **Our actual QPS/QPD numbers**, readable only from the Developer Portal app
   page once an app exists.
4. **Whether the ML/analytics clause covers first-party shop data.** Untested,
   and it constrains how much of our own Etsy data an agent may reason over.
   Worth asking Etsy in writing — the clause offers written authorisation as
   the escape hatch.

Item 4 is worth a real answer before LEDGER reasons over Etsy order data.
