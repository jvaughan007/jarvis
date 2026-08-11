# Jarvis Research 04 — Unreal Engine vs Three.js: Architecture Decision

*Researched 2026-08-11, against the actual target machine: Mac Studio, M1 Max, 32 GB.*

## Verdict

**Do not port to Unreal on this Mac.** Not because Unreal is bad — because of a
specific and unusually bad intersection of four facts for *this* project on
*this* hardware. Each one alone would be survivable.

## The four blockers

**1. Webcam capture in the macOS Unreal editor has been broken since UE 5.3 and
is still broken in mid-2026.** Selecting a webcam either crashes or exposes only
the audio device with an empty video menu; macOS never prompts for camera
permission. Reported March 2024, still open July 2025. The workaround is to
develop against packaged, signed builds only — sign and launch on every
iteration. That is the slowest possible inner loop, and it is the loop this
entire project lives in.

**2. The M1 cliff — this machine is hardware-locked out of the marquee
features.** Metal SM6 requires 64-bit atomic min/max, which is Apple8-family
silicon (A15 / M2) and newer. **Any M1, including M1 Max and M1 Ultra, cannot
run Nanite, Virtual Shadow Maps, or — since 5.8 removed the SM5 fallback —
Lumen.** This is permanent and cannot be patched.

**3. Every off-the-shelf MediaPipe→Unreal plugin is Windows-only.** MediaPipe4U
(the only serious one) has no macOS support and none planned; it also ships a
license file that expires every 30–60 days on the free tier. The others are
abandoned. On Apple Silicon the only route is piping landmarks from a separate
Python process over OSC/UDP.

**4. Pixel Streaming on Apple Silicon is documented but not dependable.** There
is an open, unanswered June 2026 bug where the stream connects, reports healthy
FPS and network stats, and the browser shows a flat colour. That is precisely
the failure mode that ruins a live demo: everything says it is working.

## The surprise: Unreal's flagship features are inert on holographic content

- **Nanite does not support translucent materials at all.** Glowing translucent
  panels are exactly the case it cannot handle.
- **Lumen GI does not work properly through translucency**, and a scene lit by
  its own emissive surfaces has almost no bounce light to compute anyway.
- **Virtual Shadow Maps: irrelevant** — holograms cast no shadows by design.

So the two features you adopt a ~100 GB engine for are the two you lose on day
one for this genre, on top of already being locked out by the M1.

## What Three.js gained while nobody was looking

WebGPU **shipped in Safari 26** (Sept 2025) and is enabled by default across
macOS Tahoe, iOS 26 and visionOS 26 — WebKit's own words: *"WebGPU supersedes
WebGL on macOS, iOS, iPadOS, and visionOS."* That was the multi-year blocker and
it is gone. Three.js r185 now ships, in core: clustered lighting (hundreds of
dynamic lights), volumetric lighting examples, and TSL post-processing nodes for
bloom, god rays, SSGI, SSR, depth of field, chromatic aberration, and temporal
upsampling. Plus `HTMLTexture` — a live HTML element as a texture, which for a
data-driven dashboard is a genuinely unmatched capability.

## Where the visual jump actually comes from

**The renderer was never the constraint. The art pipeline is.** The highest
quality-per-hour move available:

model in Blender → bake full path-traced GI, AO and emission in **Cycles** into
lightmaps → export glTF (meshopt + KTX2) → load in Three.js.

Blender's glTF export set and Three.js's import set are now **the same set** —
clearcoat, transmission, iridescence, sheen, anisotropy all survive the trip
intact. That has not historically been true. Baked Cycles lighting gives
offline-quality lighting at real-time cost, which substantially closes the Lumen
gap for a mostly-static scene.

**Unreal → glTF → Three.js is a trap.** UE's exporter bakes materials flat,
turns view-dependent expressions into static images, and supports no Nanite,
Lumen, Niagara, or Blueprints. Everything that makes an Unreal render look good
is exactly what the exporter drops. UE5 also cannot export to web at all —
HTML5 was removed in UE 4.24 and never restored.

## Calibration point

**The people who designed the actual Iron Man HUDs did not use a game engine.**
Cantina Creative did *Iron Man 3*'s 100+ interface shots in Cinema 4D. Jayse
Hansen — the literal designer of the Iron Man and Avengers HUDs — works in After
Effects, Cinema 4D and Illustrator. The bottleneck for this look is design
language, not engine mastery.

## Licensing

**$0 owed, no paperwork, in every realistic scenario** — building it, demoing
it, posting video of it, billing consulting hours, or delivering a bespoke build
work-for-hire. Royalties only start above $1M lifetime revenue per product; the
$1,850/seat licence only applies above $1M annual company revenue.

Three things worth knowing anyway:
- Unreal is **source-available, not open source**. Say it that way to a client.
- **§6(c) forbids combining Unreal with GPL code**, so Unreal and Blender cannot
  be mixed at the *code* level. Asset-level mixing (model in Blender → export →
  import) is the normal pipeline and is fine.
- **§6(e) prohibits using the engine as training input to a generative AI
  program.** For an AI consultant this is the least obvious and most relevant
  clause in the document.

## Learning curve, honestly

~40–60 hours to something that runs and looks decent. ~150–250 hours to
something client-ready. The engineering half is fast; the motion-design half is
where the time goes, and Unreal does not shorten it.

## If Unreal anyway — the viable configuration

Legitimate reasons exist (learning it for future client work, virtual
production, a client who names it). The route that works is
**Windows + NVIDIA, native app, MediaPipe in Python → OSC → Blueprints.**
Not Mac, not browser. Pin to UE 5.7, not 5.8.

Derisk in one day before committing: package an empty project with a webcam
Media Player and confirm you can get camera frames in a *packaged signed build*
on macOS. If you cannot, stop there — three weeks earlier than you otherwise
would.

## Wildcard worth knowing about

**TouchDesigner** hits this use case dead centre and runs natively on Apple
Silicon, with a free, open-source, GPU-accelerated, *actively maintained*
MediaPipe plugin — the only maintained Mac-native hand-tracking integration in
any of these ecosystems. Node-based, no code for the visual layer. Downsides:
commercial licence cost, different mental model, and it does not deploy to a
browser. Worth pricing if the demo will always be a local kiosk.
