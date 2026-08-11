# JARVIS by Josh The AI Guy — Design Spec

**Date:** 2026-08-10
**Status:** Approved by Josh (conversation, 2026-08-10)
**Research basis:** `docs/research/01-hand-tracking-3d-stack.md`, `02-brain-voice-llm-scene.md`, `03-jarvis-trend-landscape.md`

## 1. What this is

A browser app that runs fullscreen on Josh's MacBook: a dark, holographic 3D scene Josh manipulates with his bare hands via the webcam and talks to via voice. Its job is to be a **sales/demo asset** for the "Josh The AI Guy" consulting practice — shown live at networking events and client meetings, and filmed for social clips. Success = it reliably delivers a 90-second wow moment and never dies on stage.

Explicit non-goals: not a daily-driver productivity tool; no headset/XR support in this build (architecture leaves the door open); no physical rig; no cloud deployment required for the core demo (runs from `localhost`).

## 2. Hardware & platform decisions (locked)

- **Mac + webcam only.** Hand tracking via `@mediapipe/tasks-vision` (HandLandmarker, 2 hands, GPU delegate) in the browser. No headset, no Leap Motion.
- **Chrome is the demo browser** (Web Speech API support). Other browsers may render the scene but voice is Chrome-only; this is acceptable.
- **Mouse fallback always active** — every gesture interaction has a pointer equivalent (drag = grab, scroll = scale, buttons for explode/reset).
- **Voice: full loop** — speech in, spoken answer out, and the LLM drives the scene while talking.

## 3. Architecture

Three processes, all local:

```
┌─ Browser app (Vite + React + React Three Fiber) ─────────────────┐
│  Scene: holographic environment, hero model, knowledge graph     │
│  Input providers → shared interaction state (zustand):           │
│    (a) MediaPipe hands  (b) mouse/pointer  (c) scene_commands    │
│  Voice: webkitSpeechRecognition → /api/chat → sentence-chunked   │
│         speechSynthesis (half-duplex mic)                        │
│  Interpreter: Zod-validated scene_commands → handlers → zustand  │
└──────────────────────────────────────────────────────────────────┘
┌─ Proxy server (Node, ~one file) ─────────────────────────────────┐
│  POST /api/chat → Claude API (Haiku 4.5, streaming, cached       │
│  system prompt, tools: scene_commands, search_notes) → SSE pipe  │
│  Keeps the API key out of the browser.                           │
└──────────────────────────────────────────────────────────────────┘
┌─ Ingest CLI (Node, run before a meeting) ────────────────────────┐
│  folder of .md/.txt (prospect notes, discovery docs)             │
│  → parse links/frontmatter → chunk → local embeddings            │
│  → sqlite-vec (.db) + graph.json {nodes, links, clusters}        │
└──────────────────────────────────────────────────────────────────┘
```

**Core state principle:** all inputs (hands, mouse, voice commands) write to one zustand store (`focusedNodeId`, `highlightedIds`, `explodeAmount`, `grabbedPart`, `cameraTarget`, …); scene components animate toward that state. This makes gesture/mouse/voice interchangeable and commands replayable.

## 4. Components

### 4.1 Scene shell (Phase 1)
- Near-black background (`#000005`), `FogExp2`, bloom via `@react-three/postprocessing` (`luminanceThreshold` ~0.15, emissive materials with `emissiveIntensity > 1` + `toneMapped: false` for "hot" objects).
- Cyan `#00eaff` primary, amber accent. HUD rings (flat billboard sprites, slow rotation), light particle field.
- Webcam picture-in-picture (bottom corner) with the MediaPipe hand-skeleton overlay — proof-of-liveness, part of the aesthetic.

### 4.2 Hand tracking + gestures (Phase 1)
- `HandLandmarker` in VIDEO mode per rAF frame; One-Euro/damp smoothing on landmarks.
- Depth from hand-size heuristic (wrist↔middle-PIP screen distance) — "2.5D" is accepted.
- Gesture vocabulary (exactly four, state machine IDLE→HOVER→GRABBED→RELEASED, hysteresis on every threshold):
  - **Pinch** (thumb↔index, on <0.04 / off >0.07 normalized) = grab part or node.
  - **Open palm** = release / global "drop everything".
  - **Fist** (with ~150 ms dwell) = coarse whole-model rotate.
  - **Two-hand pinch** = scale via inter-hand distance; drives `explodeAmount` when pulling apart.
- Grabbed object anchors to hand transform at grab time (stored offset); on release, damp-tween home if within snap threshold, else stay.
- Continuous feedback: hover glow before grab, color/scale change on grab, pinch-strength cursor.

### 4.2b Gesture tutorial & help (Phase 1)

No prior knowledge assumed (Josh explicitly isn't fluent in "Iron Man" gestures; neither are prospects who ask to try it).

- **Calibration Mode (guided first run):** launches automatically on first-ever run; re-enterable any time via an on-screen button, the `T` key, or (Phase 2) "Jarvis, teach me." Teaches the four gestures one at a time: a ghost-hand animation demonstrates the move, plain-English caption/narration describes it ("pinch thumb and index together like picking up a grain of rice" — no movie references), and the step **completes only when the tracker detects the user performing it** (green confirmation flash), so finishing the tutorial proves the setup works. ~60 seconds total. Skippable. Completion stored in `localStorage`.
- **Cheat-sheet overlay:** edge-of-screen strip with an icon + label per gesture (grab / drop / spin / pull apart). On by default for the first 3 sessions, then off; toggle with `H` or (Phase 2) "Jarvis, show controls."
- **Idle hinting:** if a hand is tracked but no gesture is recognized for ~5 s, a subtle contextual hint appears near the hand cursor (e.g., "pinch to grab").
- Tutorial doubles as the demo warm-up: handing the laptop to a prospect and letting Jarvis teach *them* is itself a wow moment.

### 4.3 Hero model (Phase 1)
- "AI Agent System" — a stylized model of what Josh sells: central brain core + orbiting subsystem parts (email, calendar, files, messaging, tasks), each a **named** part in the GLTF/scene graph.
- Built procedurally in Three.js primitives first (guaranteed named parts, no asset dependency); a Blender-authored GLB can replace it later without code changes (loader keys off part names).
- Exploded view driven by one scalar `explodeAmount` (0→1): per-part radial vectors from centroid, `lerpVectors(original, exploded, amount)`, staggered damp-tween reassembly. Original transforms stored at load.

### 4.4 Voice loop (Phase 2)
- "Start Jarvis" button (user gesture gates mic + audio).
- STT: `webkitSpeechRecognition`, `continuous + interimResults`, auto-restart on `onend`, 600–1000 ms end-of-utterance debounce. Live caption of interim results on the HUD.
- Brain: Claude **Haiku 4.5**, streaming, system prompt <1 KB with `cache_control`, instructed to answer in 1–3 spoken sentences and to *respond before calling tools* (narration masks animation latency).
- TTS: `speechSynthesis`, sentence-chunked from the token stream (dodges Chrome's 15 s bug, starts speaking ~1 s sooner). Upgrade path: kokoro-js (in-browser, free) — not in scope for v1.
- Echo control: **half-duplex** — stop recognition before speaking, restart after the last utterance's `end`.
- Interruption: new user speech cancels current TTS queue and aborts the in-flight Claude request.

### 4.5 scene_commands tool + interpreter (Phase 2)
- One batch tool: `{ commands: [{ action, target?, params? }] }`, action enum:
  `camera.flyTo | camera.reset | model.explode | model.assemble | part.highlight | node.highlight | node.pulse | graph.focusCluster | graph.show | model.show`
- Absolute commands only; durations/easing optional with defaults.
- Scene index (`{id, title, kind, cluster}` for every part/node) injected into the system prompt (scenes are small — hundreds of items max).
- Interpreter: Zod-validate → resolve target (exact → case/fuzzy match → **structured error string with closest candidates as the tool result** so the model self-corrects) → handler writes zustand → animation. Tool results return fresh camera/scene state.
- Commands execute optimistically as soon as args complete; a new user turn kills in-flight animations.

### 4.6 Knowledge graph + ingest (Phase 3)
- Ingest CLI: `node ingest <folder>` — fast-glob `**/*.md|txt`, gray-matter frontmatter, wikilink + markdown-link extraction (basename→path index, ghost nodes for unresolved), heading-level chunks.
- Embeddings: Ollama `embeddinggemma` if Ollama is present; fallback `@huggingface/transformers` MiniLM in-process (zero setup). Stored in sqlite-vec (`better-sqlite3`), FTS5 alongside.
- Similarity edges: mutual-kNN (top 5, cosine >0.75). Clusters: graphology Louvain → node colors.
- Output: one `graph.json` + one `.db` per client folder, e.g. `data/<client-slug>/`.
- Render: `three-forcegraph` (a bare `THREE.Object3D`) mounted inside the existing R3F canvas — one canvas, so bloom, fog, and HUD apply uniformly to model and graph scenes. `warmupTicks` pre-settle, `nodeResolution(4)`, `linkWidth(0)`, link particles pulsed via `emitParticle` whenever Jarvis cites a node.
- `search_notes` tool on the proxy: FTS5 BM25 ∪ vector KNN → RRF (k=60) → 1-hop graph expansion; results include node ids so Claude's citations map to `node.pulse`/`camera.flyTo` targets.
- Demo dataset ships in-repo: a fictional sample business ("Gulf Coast HVAC company") so Phase 3 demos without any real client data.

## 5. Data flow (voice turn, end-to-end)

1. Josh speaks → interim captions render → 800 ms silence → final transcript.
2. Mic paused (half-duplex). Transcript POSTed to proxy with rolling message history.
3. Claude streams: text deltas → sentence-chunker → TTS queue (speech starts ~1 s in); `scene_commands` tool call → interpreter validates → zustand → camera flies / parts glow while Jarvis is still talking; tool result (fresh scene state) returned → Claude may continue narrating.
4. Last utterance `end` → mic resumes.
Target: ≤2.5 s from end-of-speech to first audio; scene reacts before speech finishes.

## 6. Error handling — "never dies on stage"

| Failure | Behavior |
|---|---|
| Webcam denied/absent/bad light | Scene fully driveable by mouse; PIP shows "hands offline" chip; no console-only failures |
| Hand tracking jitters/loses hands | State machine requires sustained gestures; loss of tracking = treated as release (never a stuck grab) |
| No network / Claude down | Voice button shows offline state; **Demo Mode**: keyboard-triggered scripted sequences (1 = explode, 2 = assemble, 3 = tour) so the visual demo still runs |
| Speech recognition unavailable (non-Chrome) | Voice UI hidden, text input box appears; same chat pipeline |
| TTS stall (Chrome 15 s bug) | Prevented by sentence chunking; watchdog cancels + advances queue if an utterance never fires `end` |
| Hallucinated command target | Structured error tool-result with candidates; scene never throws — unknown action/target is a no-op + logged |
| Prospect data missing | Sample dataset always bundled; graph scene loads it by default |
| API key leakage | Key lives only in proxy `.env` (gitignored); browser never sees it |

## 7. Testing

- **Unit (vitest):** gesture state machine (hysteresis, dwell, release-on-loss), sentence-chunker, explode-vector math, command Zod schemas + fuzzy target resolution, ingest link/frontmatter parsing, RRF merge.
- **Integration:** ingest CLI against a fixture vault → assert graph.json shape + edge counts; proxy tool-call round trip with a mocked Anthropic client.
- **Manual demo checklist** (`docs/demo-checklist.md`): the 90-second script run before every real demo — webcam on/off paths, voice on/off paths, Demo Mode keys.
- Hand-tracking accuracy itself is not unit-testable; the recorded-landmark fixtures feed the state-machine tests instead.

## 8. Build phases & acceptance

- **Phase 1 — Showpiece:** hero model in the holographic scene; pinch-grab a part, pull apart two-handed, palm-release, fist-rotate; mouse parity; PIP skeleton; Calibration Mode tutorial + cheat-sheet overlay. *Accept: 90-second hands-only demo runs on the MacBook webcam in normal room light, AND a first-time user completes the tutorial unaided.*
- **Phase 2 — Voice:** "Start Jarvis" → spoken Q&A; "Jarvis, take it apart / show me the email agent" flies camera + explodes model while it talks; Demo Mode fallback. *Accept: ≤2.5 s to first audio; scene obeys 5 canonical voice commands reliably.*
- **Phase 3 — Prospect's Brain:** ingest CLI + graph scene + `search_notes`; sample business demo end-to-end ("what's slowing this company down?" → cited nodes pulse, camera tours them). *Accept: fresh folder of notes → demoable graph in <5 minutes of prep.*

## 9. The 90-second use-case script (the product this serves)

1. **Hook (0–30 s):** laptop open, scene glowing. Reach up, pinch the AI-system model, pull it apart barehanded, palm-drop, it reassembles itself.
2. **Voice (30–60 s):** "Jarvis, put it back together and tell them what you are." Jarvis speaks and drives the scene.
3. **Close (60–90 s):** "This is what I install for businesses — their email, calendar, files, all run by agents. Want to see *your* business in here?" → (meeting 2) their own knowledge graph.
Filmed vertically, the same script is the TikTok/LinkedIn content pipeline.

## 10. Repo layout

```
jarvis/
├── app/            # Vite + React + R3F frontend
├── server/         # proxy (chat endpoint, search_notes)
├── ingest/         # CLI: folder → graph.json + sqlite-vec db
├── data/sample/    # fictional demo business dataset
├── docs/research/  # the three research reports
├── docs/superpowers/specs/  # this spec + future plans
└── docs/demo-checklist.md
```
