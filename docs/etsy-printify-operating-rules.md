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

### ① Who creates the Etsy listing depends on the channel type — pick one, deliberately

*Corrected 2026-08-12 after a third research pass. An earlier version of this
document said flatly that Printify always creates the listing. That is true for
one of the two connection types and false for the other, and the difference
decides how half the core is built.*

| Connection | Who creates the Etsy listing | What `publish` does |
|---|---|---|
| **Native Etsy connection** | **Printify.** It holds the Etsy OAuth link and pushes `title`, `description`, `tags`, `images`, `variants` itself. | Creates the live listing on Etsy. |
| **Generic "API" sales channel** | **We do**, through Etsy's `createDraftListing`. | Only **locks** the product. Printify's own docs: "you need to create it manually on your store from the data you can obtain from the product resource, or develop a system to automate that." |

**Running both against the same product is the duplicate-listing footgun.** The
decision is which single pipeline owns a listing, and it has to be made before
the Printify client is written.

**Recommendation: the generic API channel, with us creating the draft.** Three
reasons, all of them compliance rather than preference:

1. **Deterministic AI disclosure.** Etsy's OpenAPI spec has **no AI field at
   all** — no `ai_generated`, no "artificial intelligence" anywhere in it. The
   mandatory disclosure is free text in `description`. If Printify owns the
   description, the disclosure has to survive a round trip through a system
   that has no concept of the obligation. If we own it, we inject it from a
   template and can refuse to publish without it.
2. **`production_partner_ids` is settable at creation** on Etsy's
   `createDraftListing`. Owning the call means the partner is attached in the
   same operation, not bolted on afterwards.
3. **Draft state is a real gate.** `createDraftListing` produces a draft;
   draft → active is a separate `updateListing` call. That is the human
   approval point, given to us by the API rather than invented.

Either way, one step is **hard human-in-the-loop and has no API**:
`getShopProductionPartners` is **GET-only**. A human must add Printify in Shop
Manager → Settings → *Partners you work with*, once, before any agent can
reference the partner id. Not a preference — there is no endpoint.

Printify's other Etsy-specific surface: `sales_channel_properties` supports
`free_shipping` and `personalisation`, and the `shipping_template` publishing
property is "used by Etsy and Amazon sales channels only."

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

- **One pipeline owns a listing, and it is ours.** Printify on the generic API
  channel for product and mockup assembly; Etsy `createDraftListing` for the
  listing itself, so disclosure and production partner are set in the same call
  that creates it. Never both.
- **The AI disclosure is template-injected, never model-authored.** There is no
  API field for it, so a deterministic template is the only guarantee it is
  present. A listing payload without it does not publish.
- **A listing payload with an empty `production_partner_ids` is rejected**
  before it reaches Etsy.
- Publish is the single guarded write path, behind the draft → human → active
  gate.
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

## Mockups are allowed — with a distinction that matters

*Resolved 2026-08-12.* The [Listing Image Requirements](https://www.etsy.com/legal/policy/listing-image-requirements/253962679005)
carve-out is explicit, and it is narrower than "POD is fine":

> "If you create an original design (such as artwork or a pattern) that a
> production partner **prints onto a base item** (like a t-shirt or mug), **you
> may use a stock photo mockup** to illustrate the end product."

But where a partner *manufactures* the item itself — furniture, a garment, a
book — "use a **real photo** of the physical end product."

**So: a design printed on a blank is mockup-eligible; an item made to our design
is not.** Printify's rendered mockups are legitimate listing images for the
printed-design-on-base-item case, which is the whole business. Do not generalise
it further.

One more, for personalised listings: **the first image must show a finished
customised item** — never a blank, never "Your Text Here."

## Demand research has a sanctioned source

Also resolved: Etsy runs **Marketplace Insights** in Shop Manager — real Etsy
search data, most-searched keywords, terms with high buyer interest and low
listing counts, 30-day trends, competitive price and view data. **15 free
keyword searches per week**, unlimited on Etsy Plus.

**It is desktop and mobile web only, with no API — human-operated by design.**

That is QUARRY's legitimate demand signal. An agent may act on what a human
pulls; it may not pull it. Combined with the API ban on analytics and ML, the
shape is clear: Josh runs the keyword searches, QUARRY reasons over the results
alongside off-Etsy signal and our own first-party sales history.

## Still unverified

1. **Our actual QPS/QPD numbers**, readable only from the Developer Portal once
   an app exists. The docs' worked example shows `x-limit-per-second: 150` and
   `x-limit-per-day: 100000` — an example, not an allocation, which is exactly
   why the limiter reads the headers.
2. **Whether the ML/analytics clause covers first-party shop data.** Untested,
   and it constrains how much of our own Etsy order history an agent may reason
   over. The clause offers written authorisation as the escape hatch, so the
   answer is available simply by asking Etsy. Worth doing before LEDGER reasons
   over order data.
3. **Etsy's enforcement volume** — no public statistics exist on Creativity
   Standards or AI-related removals, so there is no base rate to reason from.

## Smaller findings worth keeping

- **Webhooks exist** for `order.paid`, `order.canceled`, `order.shipped`,
  `order.delivered`, signed with `webhook-id` / `webhook-timestamp` /
  `webhook-signature` over `id.timestamp.raw_body`, with retries. Push beats
  polling for the factory's order flow and for the 3D view's live numbers.
- **Listing enums for POD:** `who_made: someone_else` (with the partner
  declared), `when_made: made_to_order`, `is_supply: false`, `type: physical`.
- **Printify token lifetimes:** Personal Access Token **1 year**; OAuth access
  tokens **6 hours** with refresh. Both need the same alerting the Etsy 90-day
  refresh window gets.
- **Printify requires a `User-Agent` header** on every request and **sends no
  CORS headers** — server-side only, which suits an agent backend and rules out
  ever calling it from the browser.
- **Etsy publishes a read-only docs MCP server** at `https://mcp.api.etsycloud.com/mcp`,
  no API key needed. Useful while building the integration; it does not call the
  API.
- **Dormancy:** an app with no successful call in six months may be suspended,
  and listing content may not be displayed more than six hours staler than
  Etsy's own.
