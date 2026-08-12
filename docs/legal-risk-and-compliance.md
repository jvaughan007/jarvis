# Legal Risk — Read This Before Building the Store

*Researched 2026-08-11 from primary sources: US Code, Supreme Court and Circuit
opinions via the Caselaw Access Project, the Copyright Office Compendium, and
Prof. Eric Goldman's empirical work on Schedule A litigation. Research notes,
not legal advice.*

---

## The finding that should change the plan

**There is an industrialised mass-litigation business aimed precisely at small
online sellers, and Etsy sellers are core targets.** It is called the **Schedule
A / "SAD Scheme"**, and it is the single largest risk in this project — larger
than Etsy's policies, larger than the design question.

**Scale** (Prof. Eric Goldman's census, June 2025, replicated independently
against CourtListener's RECAP API):

| | |
|---|---|
| Total cases ever filed | **7,700** |
| Total defendants named | **1.5 million+** |
| Share filed in Chicago (N.D. Ill.) | **88%** |
| Cases filed 2024 → 2025 | 1,934 → ~2,749 |
| 2026 YTD (through Aug 11) | ~1,930 nationally — **still running at 2025 pace** |

**How it works.** A rights-holder sues hundreds or thousands of online sellers at
once, listing them on a *sealed* "Schedule A." Before anyone is served, they get
an **ex parte** temporary restraining order — no notice, no hearing — and
marketplaces and payment processors freeze the accounts. Most defendants never
even learn they were sued. The Seventh Circuit's own description calls it a
flood that "swamped" the district courts.

**What it does to a real small seller** — these are documented cases, not
hypotheticals:

- **Nicol Harness** sold **18 handmade tumblers for $380**. A Chicago court
  entered a **$250,000 default judgment** against her. $5,500 — her primary
  income — was locked in her Amazon account. She never knew she'd been sued:
  service went to the spam folder of a rarely-used email account. Luke Combs,
  whose IP was being enforced, found out from a local news segment, called her
  personally and sent $11,000 of his own money.
- **Carl Puckett**, a disabled veteran, sold **one used commemorative plate he
  bought at Goodwill for about $30**. Etsy and PayPal froze his accounts and
  Etsy took his **~$86,000 of non-infringing inventory offline**. Only $355 was
  actually in the frozen balance. Settlement demand: **$7,500**. He refused,
  litigated alone, and lost his shop.
- ***Powell v. Schedule A***: **$155,000 frozen** over a product the defendant
  made **$32.30** on — roughly **4,800×** the actual profit.

**Why the freeze is the weapon, not the judgment.** A TRO is supposed to last
14 days. Marketplaces routinely maintain freezes **indefinitely**, and the whole
storefront goes dark — not just the accused listing. Judge Ranjan (W.D. Pa.)
wrote it plainly: *"the reason for the ex parte TRO motion in Schedule A cases is
to generate settlement leverage, as settlements appear to be reached based on a
percentage of the frozen accounts."*

**Statutory damages make the threat credible.** 15 U.S.C. § 1117(c) allows
**$1,000–$200,000 per counterfeit mark per type of goods**, and up to
**$2,000,000 per mark if wilful**. Even innocent defendants face a floor.

**The courts are pushing back — but slowly, and it hasn't stopped.** Judge Kness
stayed every Schedule A case on his docket and concluded in *Eicher Motors* (Aug
2025) that "the Schedule A mechanism should no longer be perpetuated in its
present form." The Seventh and Second Circuits held in 2025–26 that **email
service on Chinese defendants violates the Hague Convention**, likely voiding
hundreds of judgments. Sanctions have landed on plaintiff firms for
judge-shopping. But filings in 2026 are running at 2025's pace, and a
plaintiff-side bar association (SAFE) formed in 2025 specifically to defend the
model.

### What this means concretely

1. **A trademark complaint does not need to be *correct* to destroy the shop.**
   Both documented sellers above were arguably not infringing at all. The freeze
   came first.
2. **Diversify off a single marketplace early.** A frozen Etsy account takes
   every listing with it, including the innocent ones.
3. **Never put a word, phrase, name, character, logo, or slogan on a product
   without a trademark search.** Text is where POD sellers get killed, and
   `KILN` must treat any text element as a hard gate — see below.
4. **Don't hold large balances in the marketplace account.** Sweep revenue out
   on a schedule. Frozen balances are the settlement leverage.
5. **Budget for the possibility.** The realistic bad outcome is not a lawsuit
   you fight; it's a frozen account and a $7,500 demand you can't economically
   refuse.

---

## Copyright: where the line actually is

The reference creator says on camera that his agents "go steal these designs"
and make "a brand new version of the original." **That is the behaviour most
likely to generate the complaint that triggers everything above.** Here is the
actual doctrine.

### Independent creation is a complete defense

*Rentmeester v. Nike*, 883 F.3d 1111 (9th Cir. 2018):

> "**Proof of copying by the defendant is necessary because independent creation
> is a complete defense to copyright infringement. No matter how similar the
> plaintiff's and the defendant's works are, if the defendant created his
> independently, without knowledge of or exposure to the plaintiff's work, the
> defendant is not liable for infringement.**"

This is the whole ballgame, and it is why **QUARRY must never hand KILN someone
else's artwork.** The moment a competitor's design file enters the design
process, the complete defense is gone and you're arguing about degree.

### Ideas, subjects and styles are free. Expression isn't.

- **17 U.S.C. § 102(b)**: no protection for any "idea, procedure, process,
  system, method of operation, concept, principle, or discovery."
- ***Franklin Mint*** (3d Cir. 1978): two paintings of a cardinal on apple
  blossom by the same artist did not infringe. "**Since copyrights do not protect
  thematic concepts, the fact that the same subject matter may be present in two
  paintings does not prove copying**." Quoting Holmes: "**Others are free to copy
  the original. They are not free to copy the copy.**"
- ***Satava v. Lowry*** (9th Cir. 2003): you cannot own jellyfish with
  tendril-like tentacles, bright colours, or vertical swimming — those are how
  jellyfish are. Standard elements are free.
- **Style is not registrable at all.** Copyright Office Compendium § 310.2: the
  Office "will not look for any particular style of creative expression."

**So: same trend, same holiday, same joke, same aesthetic — all lawful.** Drawn
from scratch, with your own composition, palette, type and layout.

### What is *not* lawful

- **Tracing, auto-tracing, recolouring, or restyling someone's image.** That is
  prima facie a derivative work under § 106(2).
- **"I transformed it" is a much weaker defense since 2023.** *Warhol v.
  Goldsmith*, 598 U.S. 508: "**if an original work and secondary use share the
  same or highly similar purposes, and the secondary use is commercial, the
  first fair use factor is likely to weigh against fair use**." Selling a
  decorative image of X, where the original was a decorative image of X, is the
  same purpose plus commercial. Warhol himself lost.
- **Copying someone's *selection and arrangement*** of otherwise-free elements
  (*Knitwaves*, *Boisson*, *Satava*). You can use a pumpkin and a moon; you
  cannot reproduce their particular assembly of them.
- **The danger stack** is *Steinberg v. Columbia Pictures*: same subject **and**
  same viewpoint **and** same composition **and** same colour devices **and**
  same lettering treatment. Individually free; stacked, it lost.

### Two habits worth more than any policy

1. **Keep dated, layered source files and reference boards.** Independent
   creation is a *complete* defense, and provenance is how you prove it. Every
   design KILN produces should retain its brief, its prompts, its iterations,
   and a timestamp. **This is a system requirement, not a nicety.**
2. **Register commercially meaningful designs within three months of first
   publication** (17 U.S.C. § 412). Miss that window and statutory damages and
   attorney's fees are off the table — you'd be limited to actual damages, which
   on a $22 shirt is less than a demand letter costs. Also *Fourth Estate*
   (2019): you cannot even file suit until a certificate actually issues.

---

## How this binds the agents

These stop being style preferences and become hard constraints in the skill files.

**QUARRY**
- Outputs **demand signals only** — search terms, volume, competition density,
  seasonality, price bands, gaps.
- **Never** stores, passes on, or references a competitor's image file.
- Must emit an explicit *do-not-imitate* list with every brief.

**KILN**
- Works only from a written brief. Never from a reference image of a competitor
  product.
- **Hard gate on all text.** Any word, phrase, name or slogan requires a
  trademark screen before it can reach a product. This is where POD sellers get
  destroyed, and it is a categorical block, not a judgement call.
- Retains full provenance per design: brief, prompts, iteration history,
  timestamps, and the model used.
- Refuses anything referencing a real brand, character, team, band, film, or
  public figure — no exceptions, no "parody" reasoning.

**LEDGER**
- Sweeps revenue out of the marketplace balance on a schedule.
- Watches for policy notices, IP complaints, and account flags, and escalates
  them to a human **immediately** rather than handling them.
- Tracks a registration queue: which designs are earning enough to be worth
  registering, and whether the three-month window is still open.

**WHETSTONE**
- Monitors Etsy and Printify policy pages and API changelogs for changes.
- Tracks the Schedule A landscape, which is moving fast — the Hague-service
  rulings and *Eicher Motors* are both from the last twelve months.

---

## Nobody will insure you against the risk on this page

Resolved 2026-08-12, and it belongs here rather than only in the image-rights
notes. **Every AI image provider that offers an IP indemnity excludes trademark
claims arising from selling merchandise.** Google Cloud's carve-out — "the
allegation is based on a trademark-related right as a result of Customer's use
of such Generated Output in trade or commerce" — is matched almost word for word
by OpenAI's.

So the Schedule A exposure described above is the one risk **no provider covers,
on any tier, at any price.** Indemnity protects against the copyright question
(what did the model train on). The trademark question — does this design carry a
word, name, logo or character somebody owns — is carried entirely by us.

**That makes KILN's trademark screen the highest-value control in the system.**
It was already a hard gate on legal grounds. It is now also the only thing
standing between the shop and the failure mode that actually destroys shops.

## And a pure prompt-to-product design cannot be defended anyway

Also resolved 2026-08-12: purely AI-generated images are **not copyrightable**,
and prompts alone — however elaborate — do not supply enough human control.
*Thaler v. Perlmutter* settled the human-authorship requirement and the Supreme
Court **denied certiorari on 2 March 2026**.

This undercuts the registration advice above unless the workflow changes. The
three-month § 412 window is irrelevant if there is nothing registrable to file.
KILN needs a genuine human creative stage — substantive editing, composition, or
Josh's own drawn or photographed material — for a design to be an asset rather
than something anyone may copy. Full analysis and the registration mechanics are
in `image-generation-rights.md`.

---

## The damages multiplier is `marks × product types`, not units sold

*Added 2026-08-12.* This is the number that makes the risk concrete, and it is
not intuitive.

**15 U.S.C. § 1117(c)** statutory damages are elected **per counterfeit mark,
per type of goods**: $1,000–$200,000 non-wilful, up to **$2,000,000 per mark if
wilful**. § 1117(b) separately mandates treble damages plus attorney's fees for
intentional use of a known counterfeit mark.

***H-D U.S.A. v. SunFrog***, 311 F. Supp. 3d 1000 (E.D. Wis. 2018) shows the
arithmetic on a print-on-demand operation: **$19,200,000 = $300,000 × 64
mark-and-goods-type combinations.** SunFrog's own evidence that total infringing
sales were under $250,000 did not reduce it.

**Three designs infringing two marks across six Printify product types is
twelve combinations before a single unit ships.** Volume of *listings* drives
the exposure, not volume of *sales* — which is precisely the thing an automated
pipeline scales.

And § 1116(d)(1)(B)(i) attaches counterfeit status to a mark registered for
such goods "**whether or not the person against whom relief is sought knew such
mark was so registered.**" Innocence is not a defence. What decides whether you
face the $2M tier is simply **whether the mark is registered in the class
covering your product** — Class 25 (clothing), 16 (posters, stationery), 21
(mugs, drinkware), 18 (bags). Those four classes are the axis any screening
system should be built around.

Two further doctrinal points that closed off defences POD sellers rely on:

- **Disclaimers do not work, and can make it worse.** *Smack Apparel*, 550 F.3d
  at 483–84: a disclaimer will not "disabuse consumers of a mistaken belief that
  the Universities sponsored, endorsed or were otherwise affiliated with the
  t-shirts," and a consumer "could believe that Smack's logo merely indicated
  that it was a licensee." Quoting *A.T. Cross*: the addition is "an
  aggravation, and not a justification." A line in a listing description is not
  conspicuous, and the garment itself carries no disclaimer at all.
- **Parody got much weaker in 2023.** *Jack Daniel's Props. v. VIP Products*,
  599 U.S. 140: when a mark is used "as a designation of source for the
  infringer's own goods, the *Rogers* test does not apply." A front-of-shirt
  graphic is generally the thing being sold, so there is no cheap First
  Amendment dismissal — just a full jury question on confusion. For a shop with
  four figures of revenue, that is the difference between a defence and a
  default.

## Trademark screening: what can actually be built

*Endpoint status verified 2026-08-12.*

| Resource | Status |
|---|---|
| `tmsearch.uspto.gov` | Live, but an Angular app behind AWS WAF bot protection. **No public JSON API. Not scrapeable.** |
| `api.uspto.gov/api/v1/trademarks/search` | 403 — needs an Open Data Portal API key |
| `tsdrapi.uspto.gov/…/casestatus/sn{serial}/info.json` | 401 — live, per-serial, needs `USPTO-API-KEY` |
| `data.uspto.gov/bulkdata` | Live — **bulk data moved here** |
| `bulkdata.uspto.gov` | **Dead.** Any guide pointing here is stale. |

**Buildable:** a local index from the bulk XML — serial, mark literal,
international class, goods and services, status, owner — answering "is this
exact literal live in Class 25?", plus keyed TSDR lookups for status. That is a
real, ownable piece of infrastructure and the right shape for KILN's gate.

**But it is triage, never clearance**, and the false-negative surface is why:

1. **Common-law rights need no registration** — § 1125(a) claims are invisible
   to every register.
2. **§ 1057(c) constructive use.** Once a mark registers, its *filing date*
   confers nationwide priority. An intent-to-use application filed today is
   unpublished, unsearchable, and already defeats your use.
3. **Foreign priority** — Paris Convention (6 months) and Madrid extensions
   predate anything a US search sees.
4. **Design marks and colour schemes** have no literal to match at all.
5. **The legal test is likelihood of confusion on related goods**, not exact
   string match. A Class 41 registration can still support a claim against a
   Class 25 shirt; it simply is not *counterfeiting*.

> ⚠️ **A conflict worth knowing before buying a screening service.** Per Prof.
> Sarah Fackrell's 2025 Schedule A review, **Corsearch** — a major clearance
> vendor — acquired "Edison IP" in 2024, which appears to operate as a finders
> firm for prospective Schedule A plaintiffs. The clearance-search vendor
> category now overlaps with the plaintiff-recruitment side of the same
> litigation machine. POD-niche checkers are thin wrappers over register data;
> treat any green light as "no obvious red flag," never as clearance.

**So the gate is: automated screen narrows the field, a human signs off on
anything bearing text, and designs carrying a word, name or slogan are the
minority of what the shop makes rather than its staple.**

## Provenance is what makes an appeal possible

Etsy's listing-appeal form asks the seller to:

> "Write out the individual steps you take to make, design, handpick, or source
> your item. **List everyone involved in your business, including anyone you
> outsource your production process to.** Upload any photos or supporting
> documents that showcase your listing's process."

Appeals are narrow — Creativity Standards removals only, after 15 July 2025, a
90-day window, one per listing. **Without a provenance log, an appeal is a
story. With one, it is evidence.** That is the practical argument for KILN
retaining brief, prompts, model and version, timestamps, every human edit, the
approver, and the screening result — over and above the copyright-registration
argument already made above.

Worth pairing with a structural control: **the generation pipeline should be
incapable of ingesting a competitor's listing image.** Enforced in code, as an
allowlist of provenance sources — not as a policy an agent is asked to follow.

---

## Still unverified

1. ~~Etsy's AI-disclosure and production-partner policy~~ — **answered**, see
   `etsy-printify-operating-rules.md`. AI is permitted with mandatory
   in-description disclosure; POD is permitted with the production partner
   registered *and attached per listing*.
2. ~~Etsy API terms on automated listing creation~~ — **answered**, and the
   finding was a surprise: **Printify creates the Etsy listing, not us.** The
   Etsy API also forbids using its data for analytics or ML, which forces a
   rewrite of QUARRY.
3. ~~Printify API limits and publishing rules~~ — **answered**. Note the 5%
   error budget.
4. ~~Image-generator commercial-use terms~~ — **answered**, see
   `image-generation-rights.md`. Generate on Vertex AI, paid tier.
5. ~~Automated trademark screening tooling~~ — **partly answered**; see the
   endpoint table above. A USPTO bulk-data index plus keyed TSDR lookups is
   buildable and is the right shape. What remains open is **EUIPO and WIPO
   Global Brand Database coverage** for non-US marks, and whether any commercial
   vendor is worth paying for given the Corsearch conflict noted above.
6. **Whether Etsy's ML/analytics clause reaches our own first-party shop data.**
   Untested. It constrains how much of our own Etsy order history an agent may
   reason over, and the terms offer written authorisation as the escape hatch —
   so it is worth simply asking Etsy.

**The original gate — "do not start listing products before 1, 2 and 4 are
answered" — is now satisfied.** The replacement gate is item 5: no product
carrying text, a name, or a slogan ships until there is a real trademark screen,
because that is the uninsured risk.
