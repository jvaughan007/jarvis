# Image Generation — Rights, Ownership and Indemnity

*Researched 2026-08-12 from providers' own terms documents (plus Wayback
captures for hosts that block automated fetching). Every quoted clause is from
the provider's own text, not secondary commentary. Research notes, not legal
advice.*

**Decision: generate through Google Cloud Vertex AI (Imagen / Gemini) on a paid
tier.** It is the only provider that indemnifies both the output *and* the
training data. Reasoning below, then the two findings that change how KILN has
to work.

---

## The two findings that change the build

### ① No provider will defend you on the risk that actually threatens the shop

Every indemnity offer here carves out the same thing. Google Cloud, verbatim:

> "(4) the allegation is based on a **trademark-related right as a result of
> Customer's use of such Generated Output in trade or commerce**"

OpenAI's is identical in substance:

> "(v) the claim alleges violation of **trademark or related rights based on
> Customer's or its End Users' use of Output in trade or commerce**"

**Selling a shirt is use in trade or commerce.** So the Schedule A mass-litigation
risk documented in `legal-risk-and-compliance.md` — 7,700 cases, 1.5M
defendants, the frozen-account weapon — is precisely the risk that *no image
provider indemnifies*, on any tier, at any price.

Indemnity buys protection against the *copyright* claim (did the model eat
someone's portfolio). It buys nothing against the *trademark* claim (does the
design carry a word, name, logo or character someone owns). That second one is
what takes shops down.

**This makes KILN's trademark screen the single most load-bearing control in the
system.** It was already a hard gate for legal reasons; it is now also the one
risk we are carrying entirely ourselves.

Two more universal exclusions worth knowing: coverage dies if you "knew or
should have known" the output was likely infringing, and if you disabled or
bypassed safety filters.

### ② A pure prompt-to-product design cannot be defended against copycats

The US Copyright Office's position is now settled law. **Thaler v. Perlmutter**,
130 F.4th 1039 (D.C. Cir. 2025), affirmed that the Copyright Act requires a
human author; the **Supreme Court denied certiorari on 2 March 2026**. It is
unappealable.

From [Copyright and Artificial Intelligence, Part 2: Copyrightability](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf)
(USCO, January 2025):

> - "**Copyright does not extend to purely AI-generated material**, or material
>   where there is insufficient human control over the expressive elements.
> - **Based on the functioning of current generally available technology,
>   prompts do not alone provide sufficient control.**
> - Human authors are entitled to copyright... in the **creative selection,
>   coordination, or arrangement** of material in the outputs, or **creative
>   modifications** of the outputs."

Elaborate prompts do not cure this. The Office draws on joint-authorship
doctrine: "the provision of detailed directions, without influence over how
those directions are executed, is insufficient."

| Workflow | Registrable? |
|---|---|
| Prompt → download → print | **No.** |
| Very long, very detailed prompt → print | **No.** Detail doesn't cure lack of control. |
| Meaningful creative edits to the output | **Yes** — as to your edits. |
| Composition assembled from several elements | **Yes** — the selection, coordination and arrangement. |
| Your own drawing or photo fed in, perceptible in the output | **Yes** — as to your perceptible contribution. |

**So a prompt-only pipeline ships products that are in the public domain the
moment they exist.** Anyone may copy them, and the three-month registration
window in `legal-risk-and-compliance.md` becomes moot because there is nothing
registrable to file.

**KILN therefore needs a human creative layer, not just a generator.**
Substantive editing, composition from multiple elements, or integration of
Josh's own drawn or photographed material — and the process documented, because
registration requires describing the human contribution and *"AI-generated
content that is more than de minimis must be explicitly excluded"* from the
claim. Failing to disclose can invalidate the registration.

Note what stays fully protectable regardless: **the brand name and logo
(trademark), and the listing photography.** For many POD sellers those turn out
to be the real defensible assets, which argues for investing in brand rather
than treating designs as the moat.

---

## Provider comparison

| Provider | Sell on merch? | Owns output | Indemnity to you | Disclosure / mark | Gate |
|---|---|---|---|---|---|
| **Vertex AI** (Imagen, Gemini) | Yes | You | **Output + training data** | SynthID, invisible | Paid tier, GA model |
| **Adobe Firefly** | Yes (non-beta) | You | Qualifying (enterprise) plans only | Content Credentials, must not remove | Enterprise for indemnity |
| **OpenAI API** | Yes | You | Output only | C2PA metadata | API tier — **not** ChatGPT Business |
| **Consumer Gemini app** | Yes | You | **None** | **Visible watermark** below Ultra | Ultra for a clean image |
| **Midjourney** | Paid only | You | **None — you indemnify them** | Public gallery by default | Pro/Mega above $1M revenue |
| **Stable Diffusion** | Yes | You | **None — you indemnify them** | Attribution if redistributing | **Licence terminates above $1M revenue** |
| **FLUX.1 [dev]** | ⚠️ **No** | — | None | — | Non-commercial model licence |
| **FLUX.1 [schnell]** | Yes | You | None | None | Apache 2.0, unrestricted |
| **Claude** | **Cannot generate images** | — | — | — | — |

### 🥇 Google Cloud Vertex AI — the recommendation

[Service Specific Terms §20](https://cloud.google.com/terms/service-terms):

> "**As between Customer and Google, Google does not assert any ownership rights
> in any new intellectual property created in the Generated Output.**"

> "**(i) Generated Output.** Google's indemnification obligations... also apply
> to allegations that an **unmodified** Generated Output... infringes a third
> party's Intellectual Property Rights.
> **(ii) Training Data.** Google's indemnification obligations... also apply to
> allegations that **Google's use of training data to create any Google
> Pre-Trained Model**... infringes a third party's Intellectual Property Rights."

**The training-data prong is the differentiator and nobody else offers it.** The
existential risk to a small seller was never that one design resembles one
artwork — it is a class action over how the model was built. Google absorbs
that.

It is also the only strong-indemnity option a solo seller can actually buy:
pay-as-you-go, no enterprise contract, unlike Adobe's and OpenAI's gates.

Conditions to keep coverage: use a **generally available** model, on a **paid**
service (free-of-charge use is excluded by definition), keep output
**unmodified** where you want maximum coverage, and don't disable safety
filters.

⚠️ **"Unmodified" is in direct tension with finding ②.** Maximum indemnity wants
untouched output; copyrightability wants substantive human editing. They cannot
both be maximised on the same asset. The resolution: accept that edited
designs carry the copyright risk ourselves and lean on the trademark screen and
originality discipline, because an unregistrable design is worthless as an asset
and the copyright exposure on original-brief work is low. Worth revisiting if
Google ever softens "unmodified."

### 🥈 Adobe Firefly — best provenance, no backstop for a solo seller

The only provider with a defensible clean-room training story:

> "we are training our initial commercial Firefly model on **Adobe Stock images,
> openly licensed content, and public domain content where copyright has
> expired**."

But indemnification is *"customers on qualifying plans"* — enterprise and Firefly
Services. An individual Creative Cloud plan gets **no** indemnity, and on
standard plans Adobe's general terms have you indemnifying *them*. Beta-labelled
features are carved out of commercial use entirely, so check the label before
printing.

Strong second choice, and worth using if the provenance story becomes a selling
point for the course.

### 🥉 OpenAI — but only via the API

Clean ownership assignment on every tier: *"We hereby assign to you all our
right, title, and interest, if any, in and to Output."* Output indemnity exists
— **for API customers, ChatGPT Enterprise, Edu and Healthcare only.**

> ⚠️ **ChatGPT Business is not covered.** The Service Terms define "Enterprise"
> as Enterprise, Edu and Healthcare, and list Business separately. Plus, Pro,
> Business and Free get nothing.

No training-data indemnity, and liability is capped at the greater of 12 months'
fees or **$100** — a fair signal of how much OpenAI is putting behind it.

Also note *"output may not be unique and other users may receive similar
output,"* and the assignment covers only your own output, not theirs.

### Ruled out

**Midjourney** — best-looking output, worst legal posture, and **disqualified
outright for this project by one clause**:

> "You may not use **automated tools** to access, interact with, or generate
> Assets through the Services."

That alone ends it for an agent pipeline. On top of that: no indemnity (you
indemnify them), a *"perpetual, worldwide, non-exclusive, sublicensable,
no-charge, royalty-free, irrevocable"* licence to everything you make that
survives termination, public-by-default remixing so competitors see designs
before they list, and a $1M company-revenue trigger that flips **ownership
itself**, not merely pricing.

**Stable Diffusion** — the Community Licence *"shall terminate"* once you or
affiliates exceed **$1M in annual revenue** — total company revenue, not
AI-derived — after which you must request a licence Stability may grant "in its
sole discretion." Weakest provenance (LAION-derived) and active artist
litigation. Commercial use also requires registering with Stability.

**FLUX.1 [dev]** — the most commonly misread licence in this space. §2(d) says
*"You may use Output for any purpose (including for commercial purposes)"*, but
§2(b) says *"You may only access, use, Distribute, or create Derivatives of the
FLUX.1 [dev] Model... for Non-Commercial Purposes,"* and §1(c) excludes
*"revenue-generating activity."* Running [dev] **in order to** produce sellable
artwork is a commercial use of the model and is not licensed. Use
**[schnell]** (Apache 2.0, unrestricted) or the paid BFL API instead.

**Consumer Gemini app** — the reference build uses "Nano Banana Pro" here, and
it does not survive contact with POD. Google's own launch post:

> "we will **maintain a visible watermark (the Gemini sparkle) on images
> generated by free and Google AI Pro tier users**... we will remove the visible
> watermark from images generated by **Google AI Ultra** subscribers and within
> the Google AI Studio developer tool."

A mug with the Gemini sparkle printed on it is not a product, and removing the
watermark breaches the terms. Consumer tier also carries no indemnity, and
Google takes a broad sublicensable licence back over your content. **Use Vertex
AI, not the Gemini app** — same family of models, entirely different legal
regime.

**Claude** generates no images at all — *"Claude is an image understanding model
only... it cannot generate, produce, edit, manipulate, or create images."* It
stays in the pipeline for prompt authoring, listing copy, and reviewing
generated art for problems.

---

## Rules that hold regardless of provider

1. **Never prompt toward a named artist, character, brand or trademark.** Every
   indemnity excludes claims you should have foreseen, and every one excludes
   trademark claims from selling merchandise.
2. **Never disable or bypass safety filters.** Universal exclusion.
3. **Marketplace rules are separate and stricter.** Provider permission is not
   platform permission — see `etsy-printify-operating-rules.md`.
4. **Provenance is a system requirement.** Registration demands a description of
   the human contribution and explicit exclusion of AI-generated material, so
   KILN retaining briefs, prompts, iterations and timestamps is what makes
   filing possible at all.

## How this binds the build

- **Generation goes through Vertex AI on a paid, GA model.** No Midjourney (its
  automation ban is disqualifying), no FLUX [dev], no consumer Gemini app.
- **KILN gains a human creative stage** between generation and print file.
  Prompt-only output is unregistrable and therefore undefendable.
- **KILN's trademark screen is the highest-value control in the system** — it
  guards the one risk nobody indemnifies.
- **Brand and listing photography are the durable assets.** Worth deliberate
  investment, since individual designs may not be protectable.
- **WHETSTONE watches** provider terms, the indemnified-services list, and
  *Allen v. Perlmutter* (D. Colo., cross-motions briefed February 2026, still
  pending) — the one live case that could move the copyrightability line.
