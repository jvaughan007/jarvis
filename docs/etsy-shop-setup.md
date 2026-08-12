# Opening the Etsy Shop — Checklist

*Researched 2026-08-12 from Etsy's own policy and help pages (Wayback `id_`
captures where Etsy's bot protection blocks direct fetching) plus the live
developer docs and IRS. Snapshot dates in the source notes at the bottom.
No third-party corroboration was possible — the session's search budget was
exhausted — so treat single-sourced claims accordingly.*

---

## Four things to get right before you touch the form

### 1. Opt out of Offsite Ads on day one

**New shops are enrolled automatically at 15%, and you must actively opt out.**
Shop Manager → Settings → Offsite Ads → *Opt out*.

Why it matters on a print-on-demand margin:

| | Opted out | Left on (attributed order) |
|---|---|---|
| Sale price | $25.00 | $25.00 |
| Printify cost | −$12.00 | −$12.00 |
| Listing fee | −$0.20 | −$0.20 |
| Transaction fee 6.5% | −$1.63 | −$1.63 |
| Processing 3% + $0.25 | −$1.00 | −$1.00 |
| Offsite Ads 15% | — | **−$3.75** |
| **Left** | **$10.17 (41%)** | **$6.42 (26%)** |

There is **no budget control** — "Offsite Ads don't have a budget setting" — and
the attribution window is 30 days, covering *any* order from your shop after one
click, not just the advertised item. The only cap is $100 per attributed order.

> ⚠️ **The opt-out is temporary by design.** Once the shop passes **$10,000 in
> sales over any 365-day period**, Offsite Ads become **mandatory for the
> lifetime of the shop** at 12%, and the earlier opt-out permanently stops
> applying — even if sales later fall back below. Plan the pricing model around
> a 12% ad fee eventually being unavoidable.

### 2. Shop language is permanent

Chosen at step three of onboarding, before you have thought about it. Etsy:
"You won't be able to change it later." Translations can be added; the base
language cannot be changed. **English.**

Also at that step: shop **currency**. If it differs from your bank's currency
Etsy adds a **2.5% conversion fee** — so USD.

### 3. The shop name is effectively permanent, whatever the help page implies

Etsy says you may change it "as often as you like **before** you open your
shop," and documents no numeric limit afterwards — but it also never says the
limit is unlimited, and the phrasing implies a constraint it declines to state.
Historically there was a five-change-then-review cap; that is unconfirmed for
2026.

What *is* documented, and is the real cost of renaming:

- A **"name changed" icon shows next to the shop for 45 days**, on the shop
  page, profile, and search results.
- Shop icon, banner, announcement and About text must all be updated by hand.
- Old URLs redirect, so links survive.

And two one-way doors worth knowing:

- **A name used by an open shop can never be reused** — not by anyone, not even
  after that shop closes, and not by you if you once used it on another account.
- A name can be **unavailable while appearing free** in search, because it
  belongs to a username or a closed shop.
- **Holding the trademark does not free up a taken name.** Etsy: "filing a
  notice of intellectual property infringement will not free up the shop name
  for your use."

Constraints: **4–20 characters, letters and numbers only, no spaces or
punctuation**, not already in use, not infringing. Capitalise to separate words
— `InkAndAlder`. It becomes `etsy.com/shop/<name>`.

**Your username is separate and can never be changed at all.** Pick it as
carefully as the shop name.

### 4. Enter the taxpayer ID during onboarding, not later

You chose sole proprietor on your SSN, which Etsy accepts. **The Legal Name
field must be your individual legal name as it appears on the Social Security
card** — not a business or shop name. The name on the connected bank account
must match it.

> ⚠️ **Skipping this suspends the shop at $500.** Etsy reminds you at $250, and
> "if you don't have valid taxpayer details on file and exceed **$500 in sales**
> in a calendar year, your shop will be suspended until you add these details."
> Enter it during signup and it never comes up.

**1099-K threshold: $20,000 *and* 200+ transactions** — both required, federally.
Confirmed as the current standing rule on the IRS site. Several **states set
lower thresholds**, and either trigger issues the form. Note gross sales on a
1099-K include shipping, refunds, processing fees, sales tax and cancelled
orders — it is not profit.

---

## Have these to hand before starting

- **A government photo ID and a phone for a selfie.** Identity verification runs
  through a third party, **Persona**, and is a hard gate before storefront
  setup. It requires an ID photo and a matching selfie.
- **Bank account details** — connected via **Plaid** for US sellers.
- **A credit or debit card** for Etsy's fees. A non-reloadable prepaid card
  cannot be the only card on file.
- **An authenticator app.** Two-factor is required, not optional.
- **A desktop browser.** The first step cannot be done in the Etsy app.

---

## The sequence

1. `etsy.com/sell` → **Get started**. Desktop browser.
2. Create or sign into the Etsy account. Same account buys and sells.
3. Onboarding questionnaire — residence, business experience.
4. **Shop preferences** — language, country, currency, time commitment.
   ⚠️ *Language is permanent. Currency should be USD.*
5. **Shop name.** Held for you while you finish. ⚠️ *See §3.*
6. **Identity verification** via Persona — ID photo plus selfie.
7. **Payment and billing** — bank via Plaid, card on file.
8. **Two-factor authentication.**
9. **Open your shop.** A one-time, non-refundable set-up fee is authorised on
   the card during onboarding and charged once the shop is live.
10. **Immediately: opt out of Offsite Ads.**

**A listing is not required to open.** Etsy's current documented flow is draft
shop → billing → publish; adding products comes after. *(Documented, not
empirically walked — Etsy blocks automated access, so the older "stock your
shop" step may still appear. Harmless either way.)*

---

## Fees, in full

| Fee | Amount | Notes |
|---|---|---|
| Set-up fee | **Amount not published** | One-time, non-refundable, varies by country, sometimes waived. Shown in-flow before you confirm. |
| Listing | **$0.20** | Per listing, expires after 4 months, **auto-renews at $0.20 by default** whether or not it sold. Multi-quantity re-charges $0.20 after each sale. |
| Transaction | **6.5%** | Of item price **plus shipping and gift wrap**. US: does **not** apply to sales tax. |
| Payment processing | **3% + $0.25** | US. On the total including tax and shipping. |
| Offsite Ads | **15%**, or **12%** above $10k | See §1. |
| Currency conversion | 2.5% | Only if listing currency ≠ bank currency. |
| Regulatory operating fee | **Not applicable in the US** | UK, EU, India, Türkiye, Vietnam, Canada only. |
| Etsy Plus | $10/month | **Not needed** — see below. |

**Do not buy Etsy Plus for Marketplace Insights.** The free tier gives **15
keyword searches per week**, which is ample for the human-run research loop.
Etsy Plus only makes it unlimited. Its other contents are 15 listing credits and
$5 of ad credit per month, both expiring monthly.

Past-due balances must be paid within **15 days** of the monthly statement or
Etsy "may suspend your selling privileges."

---

## Then, before any product goes up

**Register Printify as a production partner.** Etsy.com only — this cannot be
done in the Seller app, and **there is no API for it**. Shop Manager → Settings
→ *Partners you work with* → *Add a new production partner*.

- Name, plus a toggle for whether buyers see it. If hidden, supply a public
  descriptive title such as "Apparel printer."
- **Location** — must be chosen from the type-ahead list.
- **About production partner** — public text describing the arrangement.

Buyers see this in the shop's About section. It is mandatory: "We require
sellers using production assistance to transparently share this information on
the applicable listings."

**Then set shipping locations to Printify's location, not your home address.**
Easy to miss, and it is a policy requirement.

**Create a processing profile** covering **Printify's production time plus
handoff**, not your own packing time. Shop Manager → Shipping settings →
*Shipping profiles & processing*. Label it *Made to order*.

Three traps in processing times:

- Processing starts **the day after** purchase, not the day of.
- **No processing time means no ship-by date shown** — and it is contagious: one
  item without one removes the ship-by date from the entire order.
- Processing time governs **when a buyer may open a case and leave a review**.
  Understating it costs you twice.

Editing a processing profile cascades to every listing using it.

---

## API access — available immediately

Good news for the build: **a Seller App has no waiting period and no sales
minimum.** Eligibility is "any seller with an active Etsy shop in good standing
who doesn't already have an active app," and "eligible sellers are approved
within minutes, with no manual review queue."

It is scoped to your own shop only — which is exactly what the factory needs,
and which independently prevents anyone building competitor scraping into it.

Register at `etsy.com/developers` → *Create a seller app*.

> Etsy never defines "good standing" for shops anywhere — the phrase is used and
> left undefined. The documented ways to lose it are suspension, a policy
> violation, a past-due balance, or missing taxpayer details. A newly opened,
> unflagged shop should qualify at once.

⚠️ **An app with no successful API call for six consecutive months may have its
access suspended.** Worth a heartbeat call if the build goes quiet.

---

## Sources

Etsy [Fees & Payments Policy](https://www.etsy.com/legal/fees/) (capture
2026-08-04, self-dated Feb 13 2026) · [How to Open an Etsy Shop](https://help.etsy.com/hc/en-us/articles/115015672808-How-to-Open-an-Etsy-Shop)
(2025-10-13) · [How to Change Your Shop Name](https://help.etsy.com/hc/en-us/articles/115015710568-How-to-Change-Your-Shop-Name)
(2025-10-30) · [Payment Processing Fees](https://help.etsy.com/hc/en-us/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy)
(2025-11-18) · [How Etsy's Offsite Ads Work](https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work)
(2026-07-28) · [Etsy Plus](https://help.etsy.com/hc/en-us/articles/360001589928-What-is-Etsy-Plus)
(2025-10-07) · [Marketplace Insights](https://help.etsy.com/hc/en-us/articles/35122361353239-How-Do-I-Use-Etsy-s-Marketplace-Insights-Tool)
(2025-10-13) · [1099-K](https://help.etsy.com/hc/en-us/articles/360000336447-What-Do-I-Need-to-Know-About-My-1099-K-Tax-Form)
(2026-02-04) · [Legal Name & Taxpayer Info](https://help.etsy.com/hc/en-us/articles/360000337047-How-to-Update-Your-Legal-Name-and-Taxpayer-Information)
(2025-08-11) · [Working with Production Partners](https://help.etsy.com/hc/en-us/articles/360000336547-Working-with-Production-Partners-on-Etsy)
(2026-07-21) · [Processing Times & Profiles](https://help.etsy.com/hc/en-us/articles/115015588087-How-to-Set-Processing-Times-Processing-Profiles-and-Ship-By-Dates)
(2025-10-25) · [Etsy Open API docs](https://developers.etsy.com/documentation/)
(live 2026-08-12) · [IRS Form 1099-K](https://www.irs.gov/businesses/understanding-your-form-1099-k)
(live 2026-08-12)

## Not verified

- **The set-up fee amount.** Etsy publishes no figure and no country list. The
  commonly repeated "$15" has **zero primary-source support**. It is displayed
  before you confirm it.
- **Whether post-open name changes are capped.** No limit documented; the
  wording implies one exists.
- **"Shop in good standing"** — never defined by Etsy for shops.
- **Tax year 2026 1099-K threshold** stated explicitly. The IRS confirms
  $20,000/200+ is the current standing rule, but neither page says "2026."
- **Whether onboarding still forces a first listing.** Documented as not
  required; could not walk the live flow.
- **Printify's connection mechanics** — no Etsy source covers them.
