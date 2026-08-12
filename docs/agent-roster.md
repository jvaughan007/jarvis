# The Agent Roster

*Draft 2026-08-11. Harness recommendation pending research; everything here is
framework-agnostic.*

## Naming principle

**Each agent is named for the room it works in.** The name is the function is the
place. "Where does research happen?" *The Quarry.* "Who made this design?"
*Kiln.* No lookup table, nothing cute to explain, and it maps one-to-one onto
the factory concept — six agents, six rooms.

Deliberately distinct from the reference build (Nova / Forge / Pixel / Vibes) so
Josh's cast is his own.

| Agent | Room | One-line job |
|---|---|---|
| **FOREMAN** | The Office | The one you talk to. Delegates, reports, escalates. |
| **QUARRY** | The Quarry | Finds what's worth making. Demand research. |
| **KILN** | The Kiln | Makes the product. Design generation. |
| **LEDGER** | The Ledger | Runs the store. Listings, pricing, orders, revenue. |
| **ECHO** | The Broadcast | Drives traffic. Social content. |
| **WHETSTONE** | The Workshop | Keeps the others sharp. Maintains every skill. |

---

## FOREMAN — the orchestrator

**Room:** The Office. Where Josh stands when he opens the dashboard.

**Job.** The only agent with a conversation. Takes an instruction in plain
language, decides which agents to wake, sequences them, and reports back. Owns
escalation: anything needing a human decision surfaces here rather than being
silently guessed at.

**Runs:** on demand (voice or chat), plus a daily standup summary.

**Skills:** `delegation`, `status-reporting`, `escalation-rules`.

**Never:** designs, lists, or posts anything itself. It coordinates.

---

## QUARRY — demand research

**Room:** The Quarry. Digging for what is worth mining.

**Job.** Continuously answers *what should we make next?* Finds underserved
demand — search terms with volume and weak supply, seasonal runs, niches with
buyers but thin competition. Produces a ranked brief: the opportunity, the
evidence, the audience, and an explicit **originality constraint** naming what
must NOT be imitated.

**Runs:** scheduled, daily.

**Hands to:** KILN (a brief), LEDGER (keyword and pricing intelligence).

**Skills:** `marketplace-demand-research`, `keyword-analysis`,
`trend-detection`, `competitive-landscape` (measures the *gap*, never copies the
work).

> ⚠️ **QUARRY may not source research from the Etsy API.** Etsy's API Terms §5
> prohibit requesting Etsy content "for purposes of analytics, machine learning,
> training artificial intelligence models... unless expressly authorized in
> writing by Etsy," alongside a broad anti-scraping clause. An Etsy-API demand
> scraper — which is essentially what the reference build's research agent is —
> is squarely inside the prohibited purpose.
>
> **So QUARRY works off-Etsy:** public search-trend data, keyword tools holding
> their own licences, social signal, seasonal calendars, and our own first-party
> Printify and payment history. This is a rewrite of its brief, not a tweak.
> See `docs/etsy-printify-operating-rules.md`.

> ⚠️ The reference build has its research agent "steal these designs" from
> top sellers. **QUARRY is built to do the opposite**: it reports on demand and
> whitespace, and its output explicitly forbids derivative work. See
> `docs/legal-risk-and-compliance.md` for why this is non-negotiable.

---

## KILN — design and production

**Room:** The Kiln. Raw material fired into product.

**Job.** Turns a brief into original artwork and print-ready files at correct
specs. Generates concepts, self-critiques against a rubric, iterates, and
submits finalists for approval.

**Runs:** on a brief from QUARRY.

**Hands to:** LEDGER (approved artwork + print files), ECHO (mockups — Printify
renders these server-side, so KILN does not build them).

**Skills:** `design-brief-interpretation`, `image-generation-prompting`,
`print-file-preparation` (DPI, bleed, colour space, per-product templates),
`design-critique`, `originality-check`, `trademark-screening`.

**Generation runs on Google Cloud Vertex AI**, paid tier, GA models — the only
provider that indemnifies both the output and the training data, and the only
strong-indemnity option a solo seller can actually buy. Midjourney is
disqualified outright: its terms ban automated tools. See
`docs/image-generation-rights.md`.

**Three constraints that came out of the rights research:**

1. **A human creative stage is mandatory, not optional.** Purely AI-generated
   images are not copyrightable and prompts alone are legally insufficient
   (*Thaler*, cert. denied March 2026). A prompt-only pipeline ships products
   anyone may copy. KILN's output is a *candidate*; a design becomes an asset
   only after substantive human editing, composition, or integration of Josh's
   own material — and that work has to be documented, because registration
   requires describing the human contribution.
2. **The AI-disclosure sentence goes in the *Printify* product description**,
   because Printify is what creates the Etsy listing and that text is what lands
   in Etsy's description field. Adding it to the Etsy listing afterwards is a
   second write on a record Printify believes it owns.
3. **The trademark screen is the highest-value control in the entire system.**
   No image provider indemnifies trademark claims arising from selling
   merchandise — that carve-out is universal — so this risk is carried entirely
   in-house, and it is the risk that actually destroys shops.

**The approval gate.** Early on, every design goes to Josh as approve/reject —
this is how the reference creator trained his design agent, and it is the
mechanism that makes the output actually good. The gate stays in the world as a
station, and the accept rate is a visible metric. It relaxes as trust is earned;
it never fully disappears for anything trademark-adjacent.

---

## LEDGER — store operations

**Room:** The Ledger. Where the money is counted.

**Job.** Everything transactional. Creates and maintains listings (titles, tags,
descriptions, categories, attributes), sets and adjusts pricing, monitors
orders, tracks revenue per product, retires dead stock, and flags anything
needing a human — a policy notice, a takedown, an unhappy customer.

**Runs:** scheduled, several times daily.

**Hands to:** FOREMAN (numbers for the dashboard), ECHO (what's selling).

**Skills:** `marketplace-listing-optimization`, `pricing-strategy`,
`order-monitoring`, `revenue-reporting`, `policy-compliance-check`.

**Is the source of truth for the numbers on the conveyor belt in the 3D view.**

> ⚠️ **LEDGER must never call Etsy's `createDraftListing` for a POD product.**
> Printify holds the Etsy connection and its publish call creates the listing.
> Creating one ourselves as well is the duplicate-listing footgun in this stack.
>
> What LEDGER *does* own on the Etsy side: attaching the registered production
> partner to every listing Printify creates, and setting shipping-from to the
> partner's location. Both are per-listing, buyer-facing, and required — and
> Printify does not do them for us.

---

## ECHO — media and traffic

**Room:** The Broadcast.

**Job.** Turns products into content. Short-form video, slideshows, captions,
posting schedule. Also produces the behind-the-scenes footage of the factory
itself, which is the content that sells the course.

**Runs:** scheduled daily, plus on any new product launch.

**Skills:** `short-form-video-scripting`, `platform-native-formatting`
(per-platform, they differ and drift), `hook-writing`, `posting-cadence`,
`performance-review` (feeds winners back to QUARRY).

---

## WHETSTONE — skill maintenance

**Room:** The Workshop. Where the tools get sharpened.

**This is the agent Josh asked for, and it's the one that keeps the system from
quietly rotting.**

**Job.** Every skill in the system carries provenance — sources, an author-level
citation, and a `last_verified` date. WHETSTONE audits them on a schedule and:

- re-checks each skill's cited sources for changes (API deprecations, policy
  updates, pricing changes, algorithm shifts);
- scans for **new techniques, tools, and models** relevant to any skill in the
  roster;
- flags skills whose `last_verified` date has gone stale;
- **proposes** revisions with evidence — it never silently edits a skill in
  production;
- files a weekly report to FOREMAN: *what changed, what's now out of date, what
  we should adopt, what we should drop.*

**Runs:** weekly full audit; daily lightweight scan for breaking changes.

**Skills:** `source-verification`, `changelog-monitoring`,
`technique-discovery`, `skill-authoring-standard`, `deprecation-detection`.

**Why it earns its room:** an Etsy policy change, a Printify API version bump,
or a platform algorithm shift silently breaks revenue. Without WHETSTONE, the
first symptom is money stopping.

---

## How skills are structured

Mirrors the pattern Josh described — progressive disclosure, three layers:

```
FACTORY.md                    always loaded: what this system is, the cast,
                              the rules that bind everyone, escalation policy
  └── agents/kiln.md          loaded when Kiln wakes: its job, its boundaries,
                              which skills it may reach for and when
        └── skills/print-file-preparation.md
                              loaded only when that task is actually at hand
```

**Every skill file carries provenance.** Josh's standard — built on the most
current documentation and genuine domain expertise — becomes a required header,
not an aspiration:

```markdown
---
name: print-file-preparation
description: Prepare print-ready files at correct specs for a POD provider.
last_verified: 2026-08-11
sources:
  - https://…            # official provider spec
  - https://…            # authoritative practitioner reference
expertise_basis: >
  Named standards and named practitioners this is built on, so a reader can
  check the work rather than trust it.
review_interval: 30d
owner: WHETSTONE
---
```

`last_verified`, `sources`, and `review_interval` are what WHETSTONE audits.
A skill without them is treated as unverified and flagged.

---

## Build order (recommendation)

Josh's own standard — nothing faked — sets the order. A beautiful room with
nothing in it fails his rule on day one.

1. **LEDGER, read-only.** Connect to the store, pull real numbers. Smallest
   possible thing that is genuinely true.
2. **QUARRY.** Research is low-risk, high-value, and produces something to judge
   before anything is published.
3. **KILN + the approval gate.** This is where quality is won, and where Josh's
   taste gets encoded. Expect the training loop to take days, not hours.
4. **LEDGER, write.** Only once designs are consistently approved.
5. **ECHO.** Traffic matters only once there is something worth traffic.
6. **WHETSTONE.** As soon as there are three or more skills to keep current.
7. **The 3D factory.** Last. It visualises real work, so the work exists first.

FOREMAN comes into being gradually — it is the seam the others are wired into.
