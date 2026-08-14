# JARVIS — Josh The AI Guy

> ### 👉 Start at [`docs/STATE.md`](docs/STATE.md)
>
> **The project pivoted on 2026-08-11** from the holographic demo described below
> to an **agent factory** — an overhead RTS-style view where named agents visibly
> work, backed by real autonomous businesses starting with an Etsy
> print-on-demand store.
>
> `STATE.md` is the single orientation file: where things stand, what to read,
> and what to skip. Read it before anything else. The rest of this README
> describes the hand-tracking and voice work from the earlier concept, which
> still runs and whose input layers survive the pivot.

---

A holographic 3D demo you drive with your bare hands through the webcam. Built as a
sales asset: open the laptop at a networking table or a client meeting, pull an AI agent
system apart in mid-air, and put it back together.

## ⚠️ Not demo-ready yet

The machinery works — hands, voice, and scene control are all functioning. **The
visuals are not finished and this should not be shown to a prospect yet.** It
currently looks like a physics diagram rather than a hologram. That work is the
top item in [`docs/backlog.md`](docs/backlog.md).

**Status:** Phases 1 and 2 functionally complete (hands + voice). Visual pass
outstanding. Phase 3 — a prospect's own business as a 3D knowledge graph — is
specced, not built.

- **Backlog:** [`docs/backlog.md`](docs/backlog.md) ← what's between here and demo-ready
- Design spec: [`docs/superpowers/specs/2026-08-10-jarvis-design.md`](docs/superpowers/specs/2026-08-10-jarvis-design.md)
- Demo runbook: [`docs/demo-checklist.md`](docs/demo-checklist.md) (for when it *is* ready)
- Voice setup: [`docs/voice-setup.md`](docs/voice-setup.md) ← needs a real API key
- Research: [`docs/research/`](docs/research/)

## Run it

**Hands and hologram only** — no key, no network:

```bash
cd app
npm install
./scripts/fetch-mediapipe.sh   # once — vendors the hand-tracking model (~19MB)
npm run dev
```

Open **Chrome** at http://localhost:5173 and click **Enable hands**.

**With voice**, add a second Terminal window (see [`docs/voice-setup.md`](docs/voice-setup.md)):

```bash
cd server
node index.js                  # needs ANTHROPIC_API_KEY
```

Then click **Start Jarvis** and talk to it. Jarvis answers out loud and moves
the model while it talks.

First launch walks you through the four gestures with the camera confirming each one.
Press **T** any time to run it again.

## The four moves

| Move | Gesture | Mouse equivalent |
|---|---|---|
| Grab | Pinch thumb + index | Click and drag a piece |
| Drop | Open your palm | Release the button |
| Spin | Make a fist and move it | Drag the background |
| Pull apart | Pinch both hands, pull apart | "Pull apart" button |

Everything works without a camera. That is deliberate: a demo that dies when the webcam
is denied is not a demo.

## Tests

```bash
cd app
npm test        # gesture math, state machine, explode math, tutorial rules
npm run build   # type-check + production build
```

## How it's put together

```
app/src/
├── gestures/   pure landmark math + the gesture state machine (hysteresis, dwell)
├── input/      MediaPipe wiring, per-frame hand data, webcam PIP
├── model/      hero part definitions + explode geometry
├── scene/      R3F scene, hand cursors, pointer drag, command interpreter
├── state/      one zustand store every input writes to
├── tutorial/   calibration mode
├── ui/         controls bar, cheat sheet, idle hints, auto tour, voice panel
└── voice/      speech in/out, sentence chunking, the conversation loop
server/         proxy holding the API key; system prompt and scene tool schema
```

Hands, mouse, and voice all write to the same store; scene components animate
toward that state. Voice was added as a third writer without rewiring the scene,
which is why Phase 1 still works with the brain switched off.

Hand tracking runs entirely on-device. No video ever leaves the machine, and after the
one-time model download the app needs no network at all.
