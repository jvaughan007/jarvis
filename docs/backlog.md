# Jarvis — Backlog

Ordered by what stands between today and a demo Josh would actually run in
front of a prospect.

**Current honest status: NOT demo-ready.** The machinery works — hands, voice,
scene control. The *look* does not hold up. Josh's read on 2026-08-11: "this
doesn't really look like a Jarvis, and it looks really, really primitive. I
definitely wouldn't demo this at all." That is the correct call and it is the
blocking item below.

---

## Direction decided 2026-08-11

Three calls from Josh that constrain everything below:

1. **The art moves to Unreal Engine 5 + Blender.** Three.js is fine but authoring
   animation by hand-writing GLSL is the wrong tool next to Sequencer, Niagara,
   and Unreal's material editor. Throwing away existing render code is accepted.
   (Royalty threshold is $1M — irrelevant at this scale. Unreal is free-to-use
   and source-available, though not open source in the way Blender is.)

2. **The audience shifted.** This is a showcase piece that sells the school and
   courses, not just a one-to-one sales prop. Looking exceptional *is* the job.

3. **It must genuinely work — no faked interaction.** Josh explicitly refuses to
   animate a hand interaction and present it as real. Everything shown is a live
   capture of a working system, filmed with OBS / TikTok Studio / iPhone, or
   streamed live.

**What #3 forces:** real-time rendering and real-time hand tracking. No offline
renders, no baked animation standing in for input. So the Unreal route means
Unreal renders while MediaPipe tracks in a separate process and pipes landmarks
in — that bridge is now a required build item, not an optional one.

**New constraint from the capture method:** the machine has to run Unreal, the
tracking process, *and* OBS simultaneously at a good framerate. Performance
headroom is a real design input, not an afterthought.

**Target machine:** Mac Studio, Apple M1 Max (24-core GPU), 32 GB unified
memory, macOS Tahoe 26.5.2. Treat this as the performance budget, not a
minimum spec.

Two consequences that follow from it being a *desktop*:

- **Sustained rendering is fine.** A Mac Studio doesn't thermally throttle the
  way a MacBook Pro does under a long Unreal session or a live stream. For this
  workload that matters more than the raw core count.
- **The in-person laptop demo cannot run on this machine.** The original premise
  — open a laptop at a networking table — needs separate hardware, or drops in
  favour of filmed and streamed content. Consistent with the pivot, but it means
  the live-at-a-table scenario is no longer covered by anything we own.

**Art direction:** Josh will supply reference images and links rather than have
this guessed at. Collect those before building.

---

## P0 — Visual overhaul (blocks every demo)

**The problem.** What's on screen is six glowing spheres, two thin circles, and
a dust field. It reads as a physics diagram, not a hologram. Phase 1 built the
structure and skipped the craft: roughly a third of the reference aesthetic got
implemented, at low intensity.

**What's missing**, measured against the aesthetic breakdown in
[`research/03-jarvis-trend-landscape.md`](research/03-jarvis-trend-landscape.md):

| Missing | Why it matters |
|---|---|
| **Fresnel / rim shader** | The single biggest one. It's what makes an object read as *projected light* rather than a shaded plastic ball. Currently the parts are ordinary emissive spheres. |
| **Scanlines** | Horizontal moving stripes across every surface. The instant visual shorthand for "hologram". Not implemented at all. |
| **Grid floor** | A receding, fading grid gives the projection somewhere to *be*. Right now everything floats in undifferentiated black with no sense of space or scale. |
| **Chromatic aberration + grain + vignette** | Makes it look filmed rather than rendered. Bloom alone is doing all the work today. |
| **A real core** | The centrepiece is a sphere with a wireframe over it. It should be the most interesting object on screen — nested counter-rotating rings, inner energy, visible depth. |
| **Data flow on the links** | The connection lines are static. Particles travelling core-ward would make the system look *alive* and running. |
| **Instrument HUD chrome** | No corner brackets, no reticles, no readouts, no targeting frames. The 2D layer is plain buttons on black. |
| **Typography** | Currently system fonts, which is the dead giveaway of an unfinished interface. Needs a distinctive technical pairing, **vendored locally** so it survives a venue with no wifi. |
| **Depth and atmosphere** | One thin fog setting. Needs layered depth so the scene has foreground, subject, and distance. |

**Approach when we build it:** aim at *military-grade tactical projection*
rather than glossy superhero UI — an aircraft carrier's combat display rendered
in light. That direction is more distinctive than the usual cyan-Marvel look and
suits selling operational systems to business owners.

**Constraint to respect:** every asset vendored locally. No CDN fonts, no
external anything — the demo has to run on captive venue wifi.

**Rough size:** a solid focused session. Mostly new shader material, a grid
floor, a post-processing stack, a HUD overlay layer, and a restyle of the 2D
chrome. No architectural change — the interaction layer underneath is fine.

---

## P1 — Get a real API key

`ANTHROPIC_API_KEY` on Josh's machine currently holds `sk-ant-oat01-…`, the
Claude Code login token. It authenticates but is rate-limited to unusable, and
expires on its own schedule. Needs a dedicated key from console.anthropic.com.
Five minutes; see [`voice-setup.md`](voice-setup.md). Until then, voice only runs
in `JARVIS_MOCK=1` rehearsal mode.

---

## P2 — Gesture feel on real hardware

Thresholds, smoothing, and how far a hand travels per unit of explode were tuned
against simulated input, never Josh's actual hands in his actual lighting. All
one-line constants in `gestures/stateMachine.ts` and `input/useHandTracking.ts`.
Needs one session of him using it and saying what feels wrong.

---

## P3 — Phase 3: the prospect's own business

Specced in [`superpowers/specs/2026-08-10-jarvis-design.md`](superpowers/specs/2026-08-10-jarvis-design.md),
not built. Ingest a folder of notes about a prospect into a 3D knowledge graph
they can see and Jarvis can answer questions about. This is the actual closer —
but it's worth nothing until P0 makes the thing look credible.

---

## Later / nice to have

- **Recording mode** — hide all UI chrome for clean vertical video capture for social.
- **Better voice** — swap browser speech synthesis for kokoro-js (runs in-browser, free, much better voice) or ElevenLabs.
- **Quest 3 / WebXR** — the input layer was built to accept a third provider; real hand depth would be a genuine step up. Only worth it if a client asks.
- **Per-client theming** — recolour the scene to a prospect's brand for a meeting.
