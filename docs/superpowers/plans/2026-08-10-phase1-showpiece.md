# Jarvis Phase 1 — "The Showpiece" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser app on Josh's Mac where a holographic "AI Agent System" model can be grabbed, pulled apart, and reassembled with bare hands via the webcam — with mouse parity, a guided gesture tutorial, and a never-dies-on-stage fallback posture.

**Architecture:** Vite + React + React Three Fiber single-page app in `app/`. All inputs (MediaPipe hands, mouse) write to one zustand store + a mutable per-frame hand singleton; scene components animate toward store state with damped tweens. Gesture logic is pure functions + a state machine, fully unit-tested; visual layers are verified manually against a checklist.

**Tech Stack:** `three@~0.185`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `@react-three/postprocessing`, `zustand`, `maath`, `@mediapipe/tasks-vision@^1.0.1`, `vite`, `typescript`, `vitest`.

## Global Constraints

- Demo browser is Chrome; app runs from `localhost` (webcam requires secure context — localhost qualifies).
- MediaPipe WASM + model files are **vendored into `app/public/mediapipe/`** — no CDN at runtime (spec: "never dies on stage", no-network demo).
- Every gesture interaction has a mouse equivalent (spec §2).
- All shared interaction state lives in the zustand store (`explodeAmount` etc.); per-frame hand landmarks live in a mutable singleton, NOT in React state (spec §3, perf).
- Gesture vocabulary is exactly four: pinch=grab, open palm=release, fist(+dwell)=rotate, two-hand pinch=scale/pull-apart (spec §4.2). Hysteresis on every threshold.
- Hero model parts are **named**: `core`, `email`, `calendar`, `files`, `messaging`, `tasks` (spec §4.3/§4.5 — names are the LLM's address space in Phase 2).
- Palette: bg `#000005`, primary cyan `#00eaff`, amber accent `#ffb347`. Hot objects: `emissiveIntensity > 1`, `toneMapped: false`.
- Tutorial copy uses plain English (grab/drop/spin/pull apart) — no movie references (spec §4.2b).
- Commit after every green test cycle. Node ≥ 25 available; npm workspace-free (plain `app/` package).

## File Structure (all under `jarvis/`)

```
app/
├── index.html
├── package.json  vite.config.ts  tsconfig.json  vitest.config.ts
├── scripts/fetch-mediapipe.sh          # vendors wasm + hand_landmarker.task
├── public/mediapipe/                   # vendored runtime assets (gitignored? NO — commit, ~10MB, offline demo)
└── src/
    ├── main.tsx  App.tsx  styles.css
    ├── state/interactionStore.ts       # zustand store (the single source of truth)
    ├── input/handFrames.ts             # mutable per-frame hand data singleton
    ├── input/useHandTracking.ts        # MediaPipe wiring → handFrames + gesture events
    ├── input/HandPip.tsx               # webcam PIP + skeleton overlay canvas
    ├── gestures/detect.ts              # pure landmark math (pinch dist, palm, fist, hand scale)
    ├── gestures/stateMachine.ts        # GestureTracker: hysteresis, dwell, events
    ├── model/heroParts.ts              # part definitions (ids, home positions, colors)
    ├── model/explode.ts                # explode-vector math (pure)
    ├── scene/SceneRoot.tsx             # Canvas, fog, lights, bloom, environment
    ├── scene/HeroModel.tsx             # named parts, damped explode/rotate/scale/grab anims
    ├── scene/HudRings.tsx  scene/Particles.tsx
    ├── scene/HandCursor.tsx            # 3D cursors driven by handFrames + grab logic
    ├── ui/ControlsBar.tsx              # mouse-parity buttons (Explode/Assemble/Reset/Tutorial/Help)
    ├── ui/CheatSheet.tsx  ui/IdleHint.tsx
    └── tutorial/Tutorial.tsx  tutorial/steps.ts
docs/demo-checklist.md
```

---

### Task 1: Scaffold app + test runner

**Files:** Create `app/package.json`, `app/vite.config.ts`, `app/vitest.config.ts`, `app/tsconfig.json`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/styles.css`

**Interfaces:** Produces a running dev server (`npm run dev`) and test runner (`npm test`). `App` renders `<div id="app-root">` shell later tasks fill.

- [x] **Step 1: Scaffold**

`app/package.json` (exact):
```json
{
  "name": "jarvis-app",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "test": "vitest run", "test:watch": "vitest" },
  "dependencies": {
    "@mediapipe/tasks-vision": "^1.0.1",
    "@react-three/drei": "^10.7.8",
    "@react-three/fiber": "^9.7.0",
    "@react-three/postprocessing": "^3.0.4",
    "maath": "^0.10.8",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "three": "^0.185.0",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "@types/react": "^19.1.0", "@types/react-dom": "^19.1.0", "@types/three": "^0.185.0",
    "@vitejs/plugin-react": "^5.0.0", "typescript": "^5.6.0", "vite": "^7.1.0", "vitest": "^3.2.0"
  }
}
```

`vite.config.ts`: `export default defineConfig({ plugins: [react()] })`. `vitest.config.ts`: `defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'] } })`. `tsconfig.json`: strict, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`, `"types": ["vite/client"]`. `index.html`: dark bg inline style, `<div id="root">`, module script `/src/main.tsx`. `App.tsx` returns `<div id="app-root">JARVIS</div>` for now. `styles.css`: `html,body,#root{height:100%;margin:0;background:#000005;color:#9feaf5;font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;overflow:hidden}`.

- [x] **Step 2: Install & smoke-test** — `cd app && npm install && npm run build` → succeeds. Add trivial `src/smoke.test.ts` (`expect(1+1).toBe(2)`), `npm test` → 1 pass.
- [x] **Step 3: Commit** — `git add -A && git commit -m "feat: scaffold Vite+R3F app with vitest"`

### Task 2: Interaction store

**Files:** Create `app/src/state/interactionStore.ts`, Test `app/src/state/interactionStore.test.ts`

**Interfaces (Produces — later tasks rely on these exact names):**
```ts
export interface InteractionState {
  targetExplode: number            // 0..1 — what the scene damps toward
  grabbed: { partId: string; hand: number } | null
  hoveredPartId: string | null
  modelYaw: number; modelPitch: number
  modelScale: number               // clamp 0.5..2.5
  tutorialStep: number | null      // null = not running
  cheatSheet: boolean
  demoBanner: string | null        // Demo Mode messaging
  setTargetExplode(v: number): void            // clamps 0..1
  grab(partId: string, hand: number): void     // no-op if already grabbed by other hand
  release(): void
  setHovered(id: string | null): void
  rotateBy(dYaw: number, dPitch: number): void // pitch clamps ±1.2 rad
  scaleBy(f: number): void                     // multiplicative, clamped
  startTutorial(): void  advanceTutorial(): void  endTutorial(): void
  toggleCheatSheet(): void
}
export const useInteraction = create<InteractionState>()(...)
```

- [x] **Step 1: Failing tests** — clamp behavior (`setTargetExplode(1.7)`→1, `(-1)`→0), grab-then-grab-other-hand is a no-op, `release()` clears, `scaleBy` clamps to [0.5, 2.5], pitch clamp, tutorial step lifecycle (`startTutorial`→0, `advanceTutorial`→1, `endTutorial`→null). Use `useInteraction.getState()` directly (no React needed).
- [x] **Step 2: Run — fails (module missing).**
- [x] **Step 3: Implement** with `zustand/vanilla`-compatible `create()`; pure reducers, no side effects.
- [x] **Step 4: Run — passes.**
- [x] **Step 5: Commit** — `feat: interaction store with clamped actions`

### Task 3: Gesture landmark math (pure)

**Files:** Create `app/src/gestures/detect.ts`, `app/src/gestures/fixtures.ts`, Test `app/src/gestures/detect.test.ts`

**Interfaces (Produces):**
```ts
export type Landmark = { x: number; y: number; z: number }   // MediaPipe normalized image coords
export function handScale(lm: Landmark[]): number             // dist(wrist 0, middleMCP 9)
export function pinchRatio(lm: Landmark[]): number            // dist(thumbTip 4, indexTip 8) / handScale
export function isPalmOpen(lm: Landmark[]): boolean          // all 4 fingertips (8,12,16,20) farther from wrist than their PIPs (6,10,14,18) by >15%
export function isFist(lm: Landmark[]): boolean              // all 4 fingertips closer to wrist than their PIPs
export function cursorPoint(lm: Landmark[]): Landmark        // landmark 9 (stable palm-center proxy)
export function depthProxy(lm: Landmark[]): number           // handScale — bigger hand = closer
```

`fixtures.ts` holds three hand-shaped synthetic landmark arrays (`OPEN_HAND`, `FIST_HAND`, `PINCH_HAND`) — 21 points each, hand-authored plausible coordinates (open: fingertips extended above wrist; fist: tips curled near palm; pinch: thumb/index tips coincident, other fingers extended).

- [x] **Steps: failing tests → implement → pass → commit** (`feat: pure gesture landmark math`). Tests: `pinchRatio(PINCH_HAND) < 0.3`, `pinchRatio(OPEN_HAND) > 0.8`, `isPalmOpen(OPEN_HAND)===true`, `isPalmOpen(FIST_HAND)===false`, `isFist(FIST_HAND)===true`, `isFist(PINCH_HAND)===false`, `handScale` returns positive and scales linearly if all points doubled.

### Task 4: Gesture state machine

**Files:** Create `app/src/gestures/stateMachine.ts`, Test `app/src/gestures/stateMachine.test.ts`

**Interfaces (Produces):**
```ts
export type GestureEvent =
  | { type: 'pinchStart'; hand: number } | { type: 'pinchEnd'; hand: number }
  | { type: 'fistStart'; hand: number }  | { type: 'fistEnd'; hand: number }
  | { type: 'palmOpen'; hand: number }
  | { type: 'handLost'; hand: number }
export const PINCH_ON = 0.32, PINCH_OFF = 0.48, FIST_DWELL_MS = 150
export class GestureTracker {
  update(hands: (Landmark[] | null)[], tMs: number): GestureEvent[]
  isPinching(hand: number): boolean
  isFisting(hand: number): boolean
}
```

Rules encoded (spec §4.2): pinch hysteresis (on `< PINCH_ON`, off `> PINCH_OFF`); fist requires `isFist` sustained ≥150 ms before `fistStart`; hand disappearing emits `handLost` + implicit `pinchEnd`/`fistEnd` (never a stuck grab); `palmOpen` emits once per open (edge-triggered, re-arms after non-open frame).

- [x] **Steps: failing tests → implement → pass → commit** (`feat: gesture state machine with hysteresis and dwell`). Tests drive `update()` with fixture sequences + fake clock: pinch on/off hysteresis band (ratio 0.4 after pinchStart does NOT end pinch; 0.5 does), fist dwell (140 ms no event, 160 ms fires), hand loss during pinch emits pinchEnd+handLost, palmOpen edge-trigger fires once for 10 consecutive open frames.

### Task 5: Hero model data + explode math

**Files:** Create `app/src/model/heroParts.ts`, `app/src/model/explode.ts`, Test `app/src/model/explode.test.ts`

**Interfaces (Produces):**
```ts
// heroParts.ts
export interface PartDef { id: string; label: string; home: [number, number, number]; color: string; radius: number }
export const PARTS: PartDef[] = [
  { id: 'core',      label: 'Brain Core',   home: [0, 0, 0],        color: '#00eaff', radius: 0.55 },
  { id: 'email',     label: 'Email Agent',  home: [1.4, 0.5, 0],    color: '#00eaff', radius: 0.28 },
  { id: 'calendar',  label: 'Calendar',     home: [-1.3, 0.7, 0.4], color: '#ffb347', radius: 0.26 },
  { id: 'files',     label: 'Files',        home: [0.9, -0.9, 0.6], color: '#00eaff', radius: 0.26 },
  { id: 'messaging', label: 'Messaging',    home: [-1.0, -0.7, -0.6], color: '#ffb347', radius: 0.26 },
  { id: 'tasks',     label: 'Tasks',        home: [0.2, 1.2, -0.7], color: '#00eaff', radius: 0.24 },
]
// explode.ts
export function explodedPosition(home: [number,number,number], amount: number, factor?: number): [number,number,number]
// home + normalize(home) * amount * factor (default factor 1.6); core (zero vector) gets +Y drift * 0.4 * amount
```

- [x] **Steps: failing tests → implement → pass → commit** (`feat: hero part definitions and explode math`). Tests: amount 0 → home identical; amount 1 moves each non-core part outward along its home direction by `factor`; distance from origin strictly increases with amount; core special-case drifts +Y; part ids unique and match spec's six names.

### Task 6: Scene shell — Canvas, bloom, HUD rings, particles

**Files:** Create `app/src/scene/SceneRoot.tsx`, `app/src/scene/HudRings.tsx`, `app/src/scene/Particles.tsx`; Modify `app/src/App.tsx`

**Interfaces:** `SceneRoot` accepts `{children}` and provides: `<Canvas camera={{position:[0,0,6],fov:50}}>`, `color` bg `#000005`, `<fogExp2 args={['#000005', 0.06]}>`, ambient+point lights, `<EffectComposer><Bloom intensity={1.2} luminanceThreshold={0.15} mipmapBlur/></EffectComposer>`, drei `<OrbitControls makeDefault enablePan={false}/>`. `HudRings`: 3 concentric `<ringGeometry>` billboards at radii 2.6/3.1/3.6, additive material, opposing slow rotations in `useFrame`. `Particles`: 3000-point `THREE.Points` in a 12-unit sphere shell, size 0.02, additive cyan, slow drift.

- [x] **Steps: implement → manual verify (dev server: near-black scene, glowing rings rotating, particle field, orbit with mouse) → commit** (`feat: holographic scene shell with bloom, rings, particles`). No unit tests — visual layer; verification via browser + `npm run build` type-check.

### Task 7: HeroModel with damped animation

**Files:** Create `app/src/scene/HeroModel.tsx`; Modify `app/src/App.tsx`

**Interfaces (Consumes):** `PARTS`, `explodedPosition`, `useInteraction` (`targetExplode`, `grabbed`, `hoveredPartId`, `modelYaw/Pitch`, `modelScale`). **Produces:** each part is a `<mesh name={part.id}>` inside a `<group ref>`; module-level `export const partWorldPos: Map<string, THREE.Vector3>` refreshed each frame (consumed by HandCursor hit-testing in Task 9); grabbed part follows `grabTarget` (a module-level mutable `{pos: THREE.Vector3}|null` set by input layers).

Implementation core (in `useFrame((_, dt))`):
```tsx
explodeRef.current = damp(explodeRef.current, target.targetExplode, 6, dt)  // maath/easing style
for each part mesh:
  const target = grabbed?.partId === id && grabTarget ? grabTarget.pos
               : new Vector3(...explodedPosition(home, explodeRef.current))
  easing.damp3(mesh.position, target, grabbed?.partId === id ? 0.08 : 0.25, dt)
  mat.emissiveIntensity = damp(current, hovered/grabbed ? 2.4 : 1.1, 8, dt)
group.rotation.y = damp(..., modelYaw, 6, dt); group.scale damp toward modelScale
```
Parts: core = `<icosahedronGeometry args={[0.55,1]}>` wireframe overlay + solid emissive inner sphere; satellites = spheres with `MeshStandardMaterial({emissive: color, emissiveIntensity: 1.1, toneMapped: false})`; connecting lines core→satellite via `<Line>` (drei) with opacity fading as explode rises. Labels: drei `<Billboard><Text fontSize={0.12}>` under each satellite showing `label`, opacity 0 until `explodeAmount > 0.3` or hovered.

- [x] **Steps: implement → manual verify (model renders; temporarily wire a keyboard `e`/`a` handler setting `targetExplode` 1/0 — parts glide out and back with damping) → commit** (`feat: hero model with damped explode animation`).

### Task 8: Vendor MediaPipe + hand tracking hook + PIP

**Files:** Create `app/scripts/fetch-mediapipe.sh`, `app/src/input/handFrames.ts`, `app/src/input/useHandTracking.ts`, `app/src/input/HandPip.tsx`; Modify `App.tsx`

**Interfaces (Produces):**
```ts
// handFrames.ts — module singleton, mutated per frame, read in useFrame loops
export interface HandFrame { landmarks: Landmark[] | null; cursor3D: THREE.Vector3; pinching: boolean; fisting: boolean }
export const handFrames: [HandFrame, HandFrame]
export const gestureBus = new EventTarget()   // dispatches CustomEvent<GestureEvent> 'gesture'
export const trackingStatus: { state: 'off' | 'starting' | 'on' | 'error' }
```

`fetch-mediapipe.sh`: curl the `@mediapipe/tasks-vision` wasm dir (from the npm tarball already in node_modules — `cp -r node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/wasm`) and `curl -L -o public/mediapipe/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`.

`useHandTracking`: on "Enable hands" (user gesture): `getUserMedia({video: {width: 640, facingMode:'user'}})` → `HandLandmarker` from `FilesetResolver.forVisionTasks('/mediapipe/wasm')`, `numHands: 2`, `runningMode: 'VIDEO'`, GPU delegate → rAF loop `detectForVideo` → exponential smoothing (`s = 0.35`) on landmarks → update `handFrames` (cursor3D: map mirrored normalized x/y to camera-plane world coords at z=0 via viewport size ×~6/4.5; depthProxy modulates z ±1) → `GestureTracker.update` → dispatch events on `gestureBus`. Errors → `trackingStatus.state='error'` (never throws to UI).

`HandPip.tsx`: 200×150 fixed-position canvas bottom-right, draws mirrored video + landmark skeleton (lines between MediaPipe HAND_CONNECTIONS pairs, cyan dots; index/thumb highlighted amber when pinching), "hands offline" chip when not `on`.

- [x] **Steps: run fetch script (commit vendored assets) → implement → manual verify (enable hands: skeleton follows in PIP at 30+ fps; pinch highlights) → commit** (`feat: vendored MediaPipe hand tracking with PIP skeleton`).

### Task 9: HandCursor — gestures drive the scene

**Files:** Create `app/src/scene/HandCursor.tsx`; Modify `App.tsx` (mount inside SceneRoot)

**Interfaces (Consumes):** `handFrames`, `gestureBus`, `partWorldPos`, `grabTarget`, `useInteraction` actions. **Produces:** the full spec §4.2 mapping.

Logic (per `useFrame` + `gesture` listener):
- Render a small glowing sphere cursor per tracked hand at `cursor3D` (ring around it whose scale = pinch proximity — the pinch-strength indicator).
- `pinchStart`: nearest part within `GRAB_RADIUS = 0.6` of cursor → `grab(partId, hand)`; store grab offset (`partPos − cursor`); while pinching, `grabTarget.pos = cursor + offset`. Hover: nearest part in radius → `setHovered`.
- `pinchEnd`/`palmOpen`/`handLost` (grabbing hand): `release()`; HeroModel damps part home (snap-back per spec).
- `fistStart→fistEnd` (single hand): while fisting, per-frame `rotateBy(dx*2.5, dy*1.8)` from cursor deltas — "spin".
- **Two-hand pinch** (both `isPinching`): baseline = inter-cursor distance at second pinchStart; per-frame ratio drives `setTargetExplode(clamp01(baseExplode + (dist − baseDist) * 1.2))` when hands pull apart horizontally-ish, and `scaleBy` otherwise? NO — simpler and demo-honest (YAGNI): two-hand pinch **always** drives `targetExplode` (pull apart = explode, push together = assemble); `scaleBy` stays mouse-wheel/fist+pinch-free. Orbit disabled while any grab active (`makeDefault` controls `enabled={false}` via store subscription).
- While any hand is tracked, suppress OrbitControls damping fighting (set `controls.enabled = !anyGesture`).

- [x] **Steps: implement → manual verify against spec's 90-second script (grab a satellite, drop with palm, fist-spin, two-hand pull-apart explodes, release → reassembly) → commit** (`feat: hand gestures drive grab, spin, and pull-apart`).

### Task 10: Mouse parity + ControlsBar + Demo Mode keys

**Files:** Create `app/src/ui/ControlsBar.tsx`; Modify `app/src/scene/HeroModel.tsx` (pointer events), `App.tsx`

- Pointer events on each part mesh: `onPointerOver→setHovered`, `onPointerDown→grab(id, MOUSE_HAND=2)` + drag along camera plane (unproject pointer to z-plane of part; update `grabTarget`), `onPointerUp→release`. OrbitControls already gives orbit; `wheel` with ⌥ held → `scaleBy`.
- `ControlsBar` (bottom-center, translucent): buttons **Pull Apart** (`setTargetExplode(1)`), **Assemble** (`0`), **Reset View** (camera + yaw/scale reset), **Tutorial** (`startTutorial`), **?** (`toggleCheatSheet`).
- Demo Mode keys (spec §6): `1`→explode, `2`→assemble, `3`→scripted 20 s tour (interval: explode → hover-highlight each part 2.5 s with label → assemble; sets `demoBanner='Demo tour'`, any input cancels).
- [x] **Steps: implement → manual verify with webcam OFF (every gesture outcome achievable by mouse/keys alone — spec §6 row 1) → commit** (`feat: mouse parity, controls bar, demo mode keys`).

### Task 11: Tutorial (Calibration Mode) + CheatSheet + IdleHint

**Files:** Create `app/src/tutorial/steps.ts`, `app/src/tutorial/Tutorial.tsx`, `app/src/ui/CheatSheet.tsx`, `app/src/ui/IdleHint.tsx`; Test `app/src/tutorial/steps.test.ts`; Modify `App.tsx`

**Interfaces (Produces):**
```ts
// steps.ts — pure, testable
export interface TutorialStep { id: string; title: string; instruction: string; icon: string
  passes(events: GestureEvent[], frames: [HandFrame, HandFrame]): boolean }
export const TUTORIAL_STEPS: TutorialStep[]  // exactly 4: grab, drop, spin, pull-apart
```
Steps + plain-English copy (no movie references — spec §4.2b):
1. **Grab** — "Pinch your thumb and index finger together, like picking up a grain of rice." passes: any `pinchStart`.
2. **Drop** — "Open your hand flat to let go." passes: `palmOpen` after a pinch ended.
3. **Spin** — "Make a fist and move it side to side to spin the model." passes: `fistStart` + sustained fist ≥1 s.
4. **Pull apart** — "Pinch with BOTH hands and pull them apart." passes: both hands pinching simultaneously.

`Tutorial.tsx`: overlay card (top-center) when `tutorialStep !== null`; shows step icon (large emoji-style glyph: 🤏 ✋ ✊ 🤲), title, instruction; subscribes to `gestureBus`, buffers events, calls `passes` per event; on pass → green flash + auto-`advanceTutorial()` after 600 ms; step 4 pass → `endTutorial()` + `localStorage.setItem('jarvis.tutorialDone','1')`. **Skip** button always visible. Auto-start on mount when hands enabled && no `jarvis.tutorialDone`.
`CheatSheet.tsx`: right-edge vertical strip, 4 rows (glyph + "Grab / Drop / Spin / Pull apart" + mouse hint underneath). Visible when `cheatSheet` true; default from `localStorage` session counter (<3 sessions → on). `H` key toggles (listener in App).
`IdleHint.tsx`: subscribes 1 Hz; if a hand tracked && no gesture event in last 5 s && no grab → fade in "pinch to grab" near-bottom hint; any event hides it.

- [x] **Steps: failing tests for `steps.ts` `passes` predicates (drive with synthetic event lists) → implement all → pass → manual verify tutorial flow end-to-end via webcam → commit** (`feat: calibration tutorial, cheat sheet, idle hints`).

### Task 12: Demo checklist + polish + acceptance run

**Files:** Create `docs/demo-checklist.md`; Modify anything failing polish.

- `docs/demo-checklist.md`: pre-demo runbook — battery/brightness, Chrome, `npm run dev`, webcam permission granted, room-light sanity check, run the 90-second script (spec §9), fallback drills (deny webcam → mouse demo; press 3 → tour), reset state (`localStorage.clear()` for fresh-tutorial demos).
- Polish pass: bloom/emissive tuning at real webcam distance, cursor smoothing feel, PIP placement vs ControlsBar, `npm run build` clean, all tests green.
- [x] **Acceptance (spec Phase 1):** 90-second hands-only demo on the MacBook webcam in normal room light, AND a first-time user completes the tutorial unaided. Josh is the tester.
- [x] **Commit** (`docs: demo checklist; polish pass`) — then report Phase 1 done to Josh.

## Self-Review Notes

- Spec coverage: §4.1 scene shell→T6; §4.2 gestures→T3/4/8/9; §4.2b tutorial/cheat/hints→T11; §4.3 hero model + explode→T5/7; mouse parity §2→T10; Demo Mode §6→T10; PIP §4.1→T8; testing §7 (state machine, explode math, tutorial predicates unit-tested; visual layers manual + checklist)→T12. Phase 2/3 items (voice, proxy, ingest) intentionally out of scope.
- Type consistency: `GestureEvent`/`GestureTracker` (T4) consumed by T8/T9/T11 with same names; `partWorldPos`/`grabTarget` produced T7, consumed T9/T10; store API from T2 used everywhere as declared.
- Scale/two-hand ambiguity resolved in T9: two-hand pinch drives explode only; scale is mouse-wheel (+ ControlsBar reset). Matches "gesture vocabulary is exactly four."
