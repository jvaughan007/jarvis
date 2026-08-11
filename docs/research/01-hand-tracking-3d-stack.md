# Jarvis Research 01 — Hand-Tracked 3D Interface Stack (2025–2026)

*Researched 2026-08-10. All npm versions verified against the live registry that day.*

## Comparison matrix

| Path | Hardware cost | Maturity | Dev effort | Wow-factor | Reach |
|---|---|---|---|---|---|
| Webcam + MediaPipe + Three.js | $0 (any Mac) | High (MediaPipe hit 1.0) | Medium — you build the interaction feel | High | Anyone with a webcam |
| WebXR on Quest 3/3S | $299 (Quest 3S) | High | Low-Medium with @react-three/xr | Very high | Headset owners only |
| Apple Vision Pro | $3,499 | Native excellent; Safari WebXR VR-only/partial | High | Highest | Tiny |
| Mouse/trackpad fallback | $0 | Fully mature | Lowest | Low alone; essential insurance | Everyone |

**Decision for this project: webcam path (Josh confirmed), with mouse fallback baked in. Architecture keeps a door open for WebXR later via an input-abstraction layer.**

## Path 1 — Webcam on a Mac (CHOSEN)

- Use **`@mediapipe/tasks-vision@1.0.1`** (`HandLandmarker`: 21 landmarks/hand, 2 hands; `GestureRecognizer`: built-in Closed_Fist, Open_Palm, Pointing_Up, Thumb_Up/Down, Victory). The old `@mediapipe/hands` legacy packages are deprecated/frozen. **Do NOT use `handsfree` (dead since 2021) or `fingerpose` (dead).**
- Rendering: `three@0.185.1`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`.
- Runs fully client-side (WASM + GPU delegate), `detectForVideo()` per rAF frame; 30–60 FPS on Apple Silicon.

### Honest performance numbers
- Inference ~16–33 ms/frame; ~24 ms hand localization at ~95.7% avg precision.
- **End-to-end perceived latency 80–150 ms** (webcam capture + inference + smoothing). Magical, but not fast-physics-grade.
- **Pinch (thumb-tip↔index-tip distance) is the reliable primitive** (~95%+ in decent light). Use hysteresis: pinch-on at d<0.04, pinch-off at d>0.07 (normalized by hand size).
- **Depth (z) is the weakness** — MediaPipe z is relative and noisy. Standard trick: estimate depth from apparent hand size (e.g., WRIST↔MIDDLE_FINGER_PIP screen distance → z). Expect "2.5D".
- **Smoothing is mandatory**: One-Euro filter or `MathUtils.damp` on landmarks, else jitter.

### Key reference projects
1. [collidingScopes/threejs-handtracking-101](https://github.com/collidingScopes/threejs-handtracking-101) — minimal Three.js + MediaPipe starting point.
2. [Cai3ra/webcam-3D-handcontrols](https://github.com/Cai3ra/webcam-3D-handcontrols) + [Codrops tutorial (Oct 2024)](https://tympanus.net/codrops/2024/10/24/creating-a-3d-hand-controller-using-a-webcam-with-mediapipe-and-three-js/) — the full recipe: landmark 9 as cursor, wrist↔PIP distance for depth, middle-finger MCP↔TIP < 0.35 for fist/grab, AABB collision for drag-drop. Closest published thing to "Jarvis grab" on webcam.
3. [NafisRayan/ThreeJS-Hand-Control-Panel](https://github.com/NafisRayan/ThreeJS-Hand-Control-Panel).
4. [Bandinopla's two-hand rotate/scale write-up](https://medium.com/@pablobandinopla/use-hand-gestures-to-control-three-js-99842d66e8ad).

## Path 2 — Quest 3S WebXR (future phase, not now)

- Quest 3S $299 is sufficient; full-color passthrough; WebXR Hand Input (25 joints/hand).
- `@react-three/xr@6.6.30` + `@react-three/handle@6.6.30` give grab/move/rotate/scale for hands, controllers, AND mouse from one codebase; Meta's IWER emulator lets you dev without the headset.
- Caveat: palm-pinch is reserved by the Quest system menu. HTTPS required.
- Examples: [pmndrs/xr examples/handle](https://github.com/pmndrs/xr/blob/main/examples/handle/app.tsx), [stewdio/handy.js](https://github.com/stewdio/handy.js) (100+ poses), three.js `webxr_xr_handinput_*` examples.

## Path 3 — Vision Pro (skip)

- Native (RealityKit + `HandTrackingProvider`, 27 joints @ 90Hz with prediction API) is superb but $3,499 + Swift lift.
- Safari WebXR: `immersive-vr` only (no AR/passthrough as of visionOS 26); skeletal hands behind a user-toggled feature flag. Gaze+pinch "transient-pointer" does work with R3F pointer events — treat as a bonus target someday.

## Path 4 — Mouse fallback (ship in every build)

Reasons: camera failure modes (lighting, permissions, taped-over cams), precision (mouse sub-mm/~10ms vs pinch ~cm/100ms), gorilla-arm fatigue after 60–90s. Nearly free via R3F pointer events + drei `OrbitControls`.

**Winning architecture: input-abstraction layer.** Scene consumes `{cursor ray, grab boolean, secondary-hand transform}`; providers = (a) MediaPipe hand, (b) XR hand (later), (c) mouse.

## Gesture vocabulary (Ultraleap XR guidelines + field practice)

Minimal proven set (keep ≤4–5 gestures):
- **Pinch** (thumb+index) = select/grab — primary verb, most reliable.
- **Open palm** = release / neutral / panic-drop-everything.
- **Fist** = whole-object coarse grab (gate with ~150 ms dwell on webcam).
- **Two-hand pinch** = scale (distance between pinch points) + rotate (vector between them). Cap min/max, damp.
- **Point/poke** = UI buttons only.

Rules: hysteresis + debounce on every gesture; state machine IDLE→HOVER→GRABBED→RELEASED with the object anchored to hand transform at grab time (store offset, don't re-target per frame); continuous visual feedback (cursor, hover highlight, grab color change, pinch-strength indicator); physical-over-symbolic (direct manipulation needs no tutorial); interactions at chest height, short sessions.

## Exploded view / break-apart-reassemble patterns

### Tier 1 — Part-based explode (what we want: grab-a-part)
- Author GLTF/GLB as parts hierarchy (Blender: separate named objects). `useGLTF` preserves nodes.
- On load, store `userData.originalPosition/quaternion` per part — ground truth for reassembly.
- Explosion vector per part: `normalize(partCenter(world) − modelCentroid)`; exploded target = `original + dir * explodeFactor * weight`. Radial, axis-aligned, or hand-authored variants.
- **Drive with one scalar `explodeAmount` (0→1)** so slider, two-hand pull-apart gesture, or voice command all drive the same state: `part.position.lerpVectors(original, exploded, amount)`.
- Tween home with `maath/easing.damp3` in `useFrame` (interruptible, physical) or gsap@3.15.0 / @tweenjs/tween.js@25.0.0; stagger for drama.
- Grabbed part detaches from tween system (target = hand); on release, snap-back within threshold reads best.
- Worked example: [DevDojo exploded drill in R3F](https://devdojo.com/post/axiome/exploded-view-of-a-3d-model-using-react-three-fiber).

### Tier 2 — Shader shatter (no part hierarchy needed; can't grab pieces)
Per-triangle centroid + random direction attributes, displace by progress. [Codrops Exploding 3D Objects](https://tympanus.net/codrops/2019/03/26/exploding-3d-objects-with-three-js/), [MidhunSureshR/ModelExplosion](https://github.com/MidhunSureshR/ModelExplosion).

### Tier 3 — Physics (rapier impulses, kinematic reassembly) — highest wow, most tuning.

Pro tips: world-space `Box3().getCenter()` before parenting tricks; pivot-group wrap if GLTF has baked transforms; keep explode state in one zustand store so gesture/mouse/voice stay in sync.
