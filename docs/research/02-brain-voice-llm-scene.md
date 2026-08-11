# Jarvis Research 02 — The Brain: 3D Knowledge Graph, Voice Loop, LLM-Drives-the-Scene (2025–2026)

*Researched 2026-08-10. Versions/pricing verified against npm/vendor pages that day.*

## 1. 3D knowledge-graph visualization

**Default choice: the vasturiano ecosystem.**

| Package | Version | Role |
|---|---|---|
| `3d-force-graph` | 1.80.0 | Vanilla WebGL/Three.js core (requires `three >= 0.179`) |
| `react-force-graph-3d` | 1.29.1 | Standalone React wrapper (prefer over umbrella pkg) |
| `three-forcegraph` | 1.43.4 | Graph as bare `THREE.Object3D` — embed in own R3F scene |
| `d3-force-3d` | 3.0.6 | Physics engine |

Key API: `graphData()` (incremental adds OK), `nodeThreeObject()` custom visuals, `nodeAutoColorBy('cluster')`, `nodeResolution()` (perf knob), `linkWidth(0)` (cheap lines), `linkDirectionalParticles()` + `emitParticle(link)` ("Jarvis touched this memory" pulse), `cameraPosition(pos, lookAtNode, ms)` cinematic fly-to (1.5–2.5s), `zoomToFit()`, `warmupTicks()` (pre-settle, no big-bang), `pauseAnimation()`, `postProcessingComposer()` for bloom. Next.js: load with `next/dynamic` `ssr:false`.

**Performance limits:** 2,000–5,000 nodes = 60fps sweet spot (a personal vault fits comfortably); 7–12k elements = significant drops; never stop-the-loop by default → call `pauseAnimation()` when idle. Playbook by ROI: nodeResolution(4), frozen layout (`warmupTicks(120).cooldownTicks(0)` or pin `fx/fy/fz` on engine stop), `enablePointerInteraction(false)` when ambient, ngraph engine, shared materials/sprites, then InstancedMesh/Points + worker physics past ~10k, cosmos.gl (`@cosmos.gl/graph`, GPU, 1M+ nodes, 2D-only) past ~50k.

**Holographic styling recipe:**
- Bloom: `UnrealBloomPass` with `threshold: 0` + near-black bg (`#000005`) — everything blooms because only nodes/links have luminance. Must import the pass from the same three instance the lib bundles. Selective glow = raise threshold ~0.6 and push hot nodes past it with `emissiveIntensity > 1` + `toneMapped: false`.
- Nodes: emissive core sphere + additive-blended radial-glow sprite halo (`depthWrite: false`).
- Fresnel rim shader (`pow(1-|dot(n,v)|, p)`) + scanlines for the Iron-Man edge glow; `FogExp2(0x000005, 0.0016)`; cyan `#00eaff` primary, magenta/amber accents; dim links (opacity 0.15) + bright cyan particles; labels via `three-spritetext` with `nodeThreeObjectExtend(true)`.
- In R3F: `@react-three/postprocessing` `<Bloom intensity={1.2} luminanceThreshold={0.15} mipmapBlur/>` is cheaper/better than UnrealBloomPass.
- Obsidian community 3D graph plugins are built on 3d-force-graph — [Apoo711/obsidian-3d-graph](https://github.com/Apoo711/obsidian-3d-graph) has good vault→graph mapping code.

## 2. Second-brain data (vault → graph + embeddings, all Mac-local)

- Vault = implicit graph: files = nodes; `[[wikilinks]]` → directed edges; frontmatter keys (`related:`, `up:`) → typed edges; `#tags` → tag nodes. Obsidian resolves by shortest-unique basename — keep a basename→path index; track ghost/unresolved links.
- Parse: `gray-matter` + `unified`/`remark-parse`/`remark-frontmatter`/`remark-wiki-link` (with `pageResolver`), or a tested regex pass. `fast-glob` over `**/*.md` ignoring `.obsidian/`, `.trash/`.
- **Study first: [obra/knowledge-graph](https://github.com/obra/knowledge-graph)** — gray-matter + wikilinks → SQLite + sqlite-vec (384d) + FTS5 → graphology (Louvain, PageRank). Validates the whole stack. Also Quartz's `ObsidianFlavoredMarkdown` + `ContentIndex` (best remark reference), `zoni/obsidian-export` (Rust normalizer), `obsidian-local-rest-api` (live CRUD, port 27124).

**Local embeddings (Apple Silicon):** best current pick **`embeddinggemma`** (Google, 308M/768d, <200MB RAM quantized, Ollama/transformers.js day-one). Alternatives: `nomic-embed-text` v1.5 (needs `search_query:`/`search_document:` prefixes), `all-MiniLM-L6-v2` (tiny, in-browser via transformers.js), `qwen3-embedding:0.6b`. Runtimes: Ollama (`POST localhost:11434/api/embed`, simplest), transformers.js (zero external process). Scale check: 5k-note vault ≈ 20k vectors → brute-force search <50ms; choose on quality, not speed.

**Vector store: `sqlite-vec` + `better-sqlite3` is the default** — one .db file holds notes + FTS5 + edges + vectors; fine ≤100k vectors. Step-up: LanceDB (`@lancedb/lancedb`, embedded ANN + hybrid FTS; used by AnythingLLM/reor). Easiest start: `vectra` (pure JS).

**Hybrid retrieval:** BM25 (FTS5) ∪ vector KNN → Reciprocal Rank Fusion (k=60) in one SQL statement ([Simon Willison's pattern](https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/)), then **1-hop expansion along graph edges** — this is what makes the graph earn its keep, and it maps to `emitParticle` visual feedback on traversed edges.

**Graph enrichment:** mutual-kNN similarity edges (cosine >~0.75, top 5–10) = auto-linking à la reor/Smart Connections; `graphology-communities-louvain` for clusters → `nodeAutoColorBy`; LightRAG (HKUDS) if LLM-extracted entities/relations ever needed (practical local KG-RAG; GraphRAG is token-hungry).

Projects to study: reor (Electron + transformers.js + LanceDB + Ollama), Smart Connections (hash-gated incremental embedding), obsidian-copilot, AnythingLLM.

## 3. Voice interface

**Claude API has no native audio in/out (as of Aug 2026)** — a Claude Jarvis is always external STT → Claude text → external TTS.

**v1 all-browser free path:** `webkitSpeechRecognition` (Chrome; `continuous + interimResults`, auto-restart in `onend` — Chrome kills sessions on silence) → Claude **Haiku 4.5** streaming (TTFT ~0.6–1.0s, $1/$5 per MTok; short system prompt "answer in 1–3 spoken sentences", prompt caching via `cache_control`) → `speechSynthesis`. End-to-end ~1.2–2.5s, ≈$0.001–0.003/min. HTTPS + user-gesture required ("Start Jarvis" button). Browser CORS: use a ~30-line SSE proxy rather than `anthropic-dangerous-direct-browser-access`.

**Load-bearing pattern — sentence-chunked TTS while the LLM streams** (also dodges Chrome's 15s speechSynthesis bug): accumulate `text_delta`s, split on sentence-end regex, enqueue utterance per sentence, chain on `end` events.

**Echo control:** half-duplex — `rec.stop()` before speaking, restart after last utterance ends. Barge-in: keep rec running, fuzzy-discard self-transcripts, on real interrupt `speechSynthesis.cancel()` + abort the Claude fetch.

**Upgrades:** TTS → **kokoro-js** (Kokoro-82M, Apache 2.0, runs 100% in-browser via WASM/WebGPU, ~80–300MB download, far better than speechSynthesis, free) or ElevenLabs Flash v2.5 (~75ms TTFB, ~$0.05–0.10/min). STT → Deepgram Nova-3 (~300ms, ~$0.0077/min) or on-device Moonshine Web/whisper.cpp. Alternative brains: OpenAI `gpt-realtime` (native speech-to-speech, ~300–800ms, ~$0.05/min) — lowest latency but not Claude. Frameworks if DIY outgrown: Pipecat, LiveKit Agents.

## 4. LLM-drives-the-scene pattern

**Canonical references:**
- [openai/openai-realtime-solar-system](https://github.com/openai/openai-realtime-solar-system) — voice → function calls → 3D navigation. Steal: **enum-constrained targets** (model can't hallucinate IDs) and "respond to the user before calling this tool" (narration masks camera-move latency).
- [DmitriyGolub/threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp) — 59-tool taxonomy: inspection (`scene_tree` compact text, `find_objects`), mutation (`set_object_transform`, `set_camera`), debugging (`highlight_object`, `raycast`). Rule: **name your objects** — unnamed nodes are unaddressable.
- blender-mcp, Hello3DLLM (minimal full loop), MCP Apps / SEP-1865 `examples/threejs-server` (standardized story).

**Schema design (the shape for Jarvis): one batch tool `scene_commands` taking ordered `commands[]`** with `action` enum (`camera.flyTo`, `camera.reset`, `node.highlight`, `node.pulse`, `graph.filter`, `graph.showCluster`, `model.explode`, `annotation.add`), `target` (exact node id), optional `params` with duration/easing defaults. Rules: absolute over relative commands (idempotent); scene index (`{id,title,cluster}` list) injected into system prompt for small scenes, query tools for large; validate with Zod; **hallucinated IDs → structured error string as tool result with fuzzy-match candidates** (model self-corrects); destructive ops as separate approval-gated tools.

**Frontend interpreter:** handler map per action → resolve node (exact → fuzzy → error) → write to **zustand store** (`{focusedNodeId, highlightedIds, explodeAmount, ...}`) → scene components animate toward state (renderer-agnostic, replayable, undoable). Camera: 3d-force-graph's `cameraPosition()` covers 90%; `camera-controls`/drei `<CameraControls>` (promise-returning transitions) for the rest. New user turn kills in-flight animations.

**Latency field notes:** a function call adds ~400–800ms model overhead; >~1.2s perceived latency makes users talk over the agent. Mitigate: scene tools are local/near-zero-cost — execute optimistically as soon as args complete, return output immediately, let the model narrate over the animation.

**Vercel AI SDK variant** (chat panel): `streamText({tools})` — tools without `execute` auto-forward to client; `useChat({onToolCall})` + `addToolOutput` closes the loop; tool-call streaming on by default.

## 5. Recommended reference architecture

```
Ingest (Node, Mac):  chokidar → gray-matter/remark → nodes+links
                     → chunks → Ollama embeddinggemma → sqlite-vec + FTS5
                     → graphology Louvain + mutual-kNN edges → graph.json
Brain (thin proxy):  Claude Haiku 4.5 streaming, cached system prompt
                     Tools: search_notes (RRF hybrid + 1-hop), scene_commands
Face (browser):      react-force-graph-3d + bloom + emissive/halo nodes
                     + link particles + fog; Zod interpreter → zustand → anims
                     Voice v1: webkitSpeechRecognition → sentence-chunked
                     speechSynthesis; v2: kokoro-js or ElevenLabs Flash
```

**Build order:** (1) graph + bloom view — already looks like Jarvis; (2) hybrid search + Claude chat; (3) scene_commands — Claude flies the camera to what it talks about; (4) voice loop.

Highest-leverage repos to read: `vasturiano/3d-force-graph` (bloom example, issues #223/#479), `obra/knowledge-graph`, `openai/openai-realtime-solar-system`, `DmitriyGolub/threejs-devtools-mcp`, `reorproject/reor`.
