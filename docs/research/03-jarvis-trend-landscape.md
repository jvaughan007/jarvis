# Jarvis Research 03 — The "I Built Jarvis" Trend: Who's Doing It, With What, and What's Real

*Researched 2026-08-10. Covers the 2024–2026 wave on X/TikTok/YouTube.*

## Trend-defining creators and their real stacks

- **Concept Bytes (TikTok, ~3.1M followers) — "HoloMat"**: projector-on-a-mat + overhead camera, Python + MediaPipe with ChArUco calibration, GPT-4 Turbo + Vision. NOT a hologram — a calibrated top-down projection filmed from the flattering angle. Partial code: [Concept-Bytes/Holomat](https://github.com/Concept-Bytes/Holomat); full guides paywalled on Patreon (V1→V3). GitHub issue #1: "Where can I buy a Holomat?" — demand proof.
- **Huw Prosser (TikTok 1M+, self-reported 80M+ views)**: custom Python ML pipeline, self-trained TTS, LLM command routing; candid that low-latency voice is the hard ongoing part. Parlayed audience into Blooware Technologies.
- **Waterloo "Jarvis" (ishaan1013/jarvis)**: the canonical web-stack Jarvis — OpenCV + MediaPipe @ ~60Hz → Flask + Socket.IO → Next.js + Three.js (pmndrs), Web Speech API + ElevenLabs, Pepper's Ghost acrylic rig. Fully open: [github.com/ishaan1013/jarvis](https://github.com/ishaan1013/jarvis). Got Ishaan an OpenCV Live appearance → Vercel (v0.dev); teammate landed at Firefly with it as portfolio anchor.
- **collidingScopes / Alan (@measure_plan)**: most prolific open-source creator; browser-only Three.js + MediaPipe demos, 10M+ claimed views; monetized via funwithcomputervision.com ($10/$99). Fork targets: [threejs-handtracking-101](https://github.com/collidingScopes/threejs-handtracking-101), [shape-creator-tutorial](https://github.com/collidingScopes/shape-creator-tutorial).
- **Torin Blankensmith**: co-author of the free GPU [MediaPipe TouchDesigner plugin](https://derivative.ca/community-post/tutorial/face-hand-pose-tracking-more-touchdesigner-mediapipe-gpu-plugin/68278) powering the Instagram "hands sculpting particles" wave; monetizes via Patreon master classes.

**Stack census:** overwhelming majority = **Three.js + MediaPipe in the browser** (that's WHY the trend exploded — zero install). Physical rigs = projector + Python/OpenCV or Pepper's Ghost. XR = Unity + Quest 3 passthrough ([xrdevrob/QuestCameraKit](https://github.com/xrdevrob/QuestCameraKit)). Unity + Leap Motion is legacy; webcam MediaPipe killed the extra hardware.

## Second-brain branch

- **Softspace → Spaceframe** (Quest 3 spatial knowledge management) — years of demos on X → Meta Quest Store launch.
- **Obsidian 3D graph plugins** ("New 3D Graph" Rust+WASM 50k nodes @60fps; InfraNodus) power the viral "my second brain as a neural network" clips. Fact-check: viral posts overstate — it's a static link viz, not AI memory.
- [Obsidian-hologram-tracker](https://github.com/fvanlookeren-bit/Obsidian-hologram-tracker) — vault as Jarvis-style 3D net + webcam tracking.
- Bolt.new uses recreating these demos as content marketing — the genre is a proven attention asset.

## The visual recipe (remarkably consistent)

1. Near-black scene (#000–#0a0f1e) — glow pops, jitter hides.
2. Cyan/teal primary + orange accents (the Iron Man holotable pair).
3. UnrealBloomPass (threshold ~0.1) / `@react-three/postprocessing` Bloom.
4. Fresnel rim "made of light" shader — canonical lesson: Bruno Simon's [Three.js Journey Hologram Shader](https://threejs-journey.com/lessons/hologram-shader).
5. Scanlines + occasional glitch/chromatic aberration.
6. Wireframe/blueprint edge overlays.
7. 10K–50K particle fields attracted to hand landmarks (palm=expand, fist=shatter, pinch=grab).
8. HUD rings/arcs/reticles (flat billboards, not geometry).
9. **Webcam PIP with the MediaPipe skeleton overlay** — proof-of-liveness is part of the aesthetic.

Asset shortcuts: [ektogamat/threejs-vanilla-holographic-material](https://github.com/ektogamat/threejs-vanilla-holographic-material) (drop-in, R3F version exists), Shadertoy ports, [HUDS+GUIS](https://www.hudsandguis.com/) FUI reference archive, Jayse Hansen (the actual Iron Man HUD designer) breakdowns.

## Reality check — what's real vs. staged

**Real and forkable today:** MediaPipe in-browser at 21 landmarks/hand, 30–60Hz, on-device; pinch/palm/fist driving particles and models; bloom/hologram shaders; Web Speech + ElevenLabs voice; LLM function-calling ("load the engine model").

**Smoke and mirrors:**
- "Hologram" is a lie in nearly every demo (Pepper's Ghost or projector table shot from the one angle that works).
- Depth/z is weak (hand-size heuristics); demos avoid showing depth precision.
- Fragile edge cases edited out: hands crossing, crossed fingers, fast motion, holding objects.
- **Gesture vocabulary is tiny**: pinch + palm + fist. Apparent richness ("break apart the engine") = 2–3 gestures triggering pre-authored animations on a pre-segmented GLTF. The model was BUILT to explode. The gesture triggers the animation; it doesn't compute it. ← This is the trick to copy, not a limitation to apologize for.
- Voice segments often post-produced; multi-second latency cut in editing.
- Dark rooms + locked camera angles + bloom do heavy lifting.
- Gorilla-arm fatigue means none are daily-driver interfaces; demos run 60–90s.

**Rule of thumb:** browser + webcam + one hand pinch/rotate on a glowing model = real, forkable today. "Floating in mid-air / understands anything instantly / assembled itself" = staging.

## Business value paths (documented, in order of evidence)

1. **Paid tutorials/Patreon** (Concept Bytes, collidingScopes, Blankensmith) — strongest evidence.
2. **Portfolio → job/credibility** (Waterloo team → Vercel, Firefly, OpenCV Live).
3. **Product launch** (Softspace/Spaceframe → Quest Store; Huw → Blooware).
4. **Audience → agency/consulting leads** (Bolt.new buying into the format proves it's a sales asset).

**Implication for Josh:** a 60–90 second "watch me break apart this model with my hands and talk to it" clip is cheap to build from public repos, reliably stops the scroll, and is exactly the demo-as-sales-asset play. The differentiator vs. the trend: pointing it at the PROSPECT'S business data, not a stock model.
