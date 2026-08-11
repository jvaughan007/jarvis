# Concept v2 — The Agent Factory

*Scope change proposed 2026-08-11, from two reference videos by
[@androoagi](https://www.tiktok.com/@androoagi). Replaces the "glowing hologram
of an AI agent system" concept entirely.*

## The reference, in the creator's own words

> "You are looking at a living, breathing, interactive ecosystem that I built for
> my AI agents so that I could gamify my entire life and all my businesses…
> within this little ecosystem, we built these two **factory rooms** that run
> autonomous businesses."

Reference videos (transcripts pulled in full, 2026-08-11):

| Video | Reach | What it shows |
|---|---|---|
| ["How to start your own autonomous etsy store"](https://www.tiktok.com/@androoagi/video/7624221990563351839) (4:19) | 156K plays, 9.7K likes, 5.4K saves | The build guide — agents, tools, and the room layout |
| ["Skynet is Coming"](https://www.tiktok.com/@androoagi/video/7649946755928165663) (5:31) | 87K plays, 3.5K likes | The full environment tour across both factories |

**Note the tag on the first one: `#openclaw`.** This creator is building on the
same framework Josh installs for clients. This is not borrowing an unrelated
aesthetic — it is a visualisation layer for the exact product Josh already sells.

## What the environment actually contains

**Spatial structure**
- An overhead, explorable space — the creator calls it a "space dungeon"
- Divided into **factory rooms**, one per autonomous business
- Each agent has its own area within a room ("Nova hangs out in his little
  research lab")
- Objects in the world are interactive and open dashboards in place

**Named agents with distinct roles and personalities** — this is central, not decoration:

| Agent | Role | Tooling named |
|---|---|---|
| **Nova** | Research — studies well-performing Etsy products and stores all day | — |
| **Forge** | Design — creates the products, lists them | Printify, Nano Banana Pro (Gemini), GPT images |
| **Pixel** | Media — "pumps out TikToks all day", curates slideshows, helps the YouTube channel | — |
| **Vibes** | Music — a DJ agent "on the station" | — |
| "Mr. Ultron" | Appears to be the orchestrator | — |

**Objects that carry meaning**
- A **conveyor belt** representing the Etsy store — clickable, shows live
  revenue and order count, and the store can be managed from it
- Per-business revenue displayed in-world ($12K / $5.4K / $900 across three
  stores; ~$4K on a Fiverr thumbnail service; ~$200 on game assets)
- An **approve / reject feedback station** — the creator ran a few hundred
  approve-or-reject rounds to train the design agent, and left the mechanism in
  the world

**Businesses represented as rooms:** Etsy stores, Fiverr thumbnail service, game
asset sales, Medium affiliate articles, a software factory that mines Reddit for
problems to solve, and a music station.

## Why this concept is stronger than the hologram

- **Legible on sight.** Anyone understands "rooms where workers do jobs." Nobody
  understood six glowing spheres without narration.
- **It has narrative.** You can *watch labour happen*. There is something to
  look at for more than five seconds.
- **Demoable by construction.** Click a room, a dashboard opens. That is the
  demo, built into the concept.
- **It maps to money.** Each room is a revenue stream, so the visual doubles as
  a business dashboard.
- **It scales.** New business, new room. The hologram had no growth story.
- **On-brand.** Josh sells OpenClaw agent installs. This is a picture of that.

## The hard part is not the 3D

The reference is compelling because **it is real**. The conveyor belt links to an
actual Etsy store with actual revenue. Watching agents work is only interesting
if the agents are actually working.

Josh's stated standard — no faked interaction, everything filmed live — applies
here with more force than it did to hand tracking. A factory view with nothing
behind it is a screensaver, and he would know it.

**So this pivot expands scope from "build a 3D demo" to "build a 3D demo *and*
run at least one genuinely autonomous business behind it."** That second half is
the larger project, and it is the half that makes the first half worth anything.

The original motivation was an autonomous Etsy store, so this is a return to the
real goal rather than a detour.

## Tone

The reference creator's persona is deliberately abrasive — the second video
opens by calling the viewer an imbecile and describes agents as "minion slaves."
That is his engagement strategy. Josh sells to business owners and wants to sell
courses; a competent, slightly wry operator reads better to that audience than
contempt does. **Take the format, not the voice.**

## What this does to the engine question

It makes it easier, and it points further away from Unreal:

- **Stylised low-poly, not photoreal.** Unreal's remaining advantages (Lumen,
  Nanite) were already inert for holograms; they are equally inert here, and
  this look is well within Three.js's reach.
- **Character animation becomes central**, which is Blender's home turf —
  rigging, skinning, idle and work loops, exported as glTF. That strengthens the
  case for Blender, which was already the decided win.
- **Dashboards and live data binding become central**, which is the web's home
  turf. Pulling an Etsy or Printify API and rendering revenue in a panel is
  native here and a plugin-and-a-bridge in Unreal.
- **`HTMLTexture`** (three.js r184+) renders a live HTML element as a texture —
  real dashboards on in-world surfaces.

## Open questions before anything gets built

1. **Which single business runs first?** Etsy is the obvious answer — it was the
   original motivation, and it is the one with a proven reference path.
2. **Real agents first, or the room first?** Recommendation: a working agent
   with no visualisation beats a beautiful room with nothing inside it.
3. **How many agents at launch?** The reference says three is the minimum that
   works: research → design → media.
4. **Names and personalities.** The reference uses Nova, Forge, Pixel, Vibes.
   Josh needs his own cast; they become brand assets and course characters.
5. **Camera and control.** Fixed isometric, orbiting overhead, or walkable?
6. **What of the current repo survives?** The gesture and voice layers are
   reusable input methods for a factory view. The hologram scene is not.
