# JARVIS — Demo Runbook

> ## ⚠️ Do not run this demo yet
>
> The visuals are unfinished — see [`backlog.md`](backlog.md) P0. This runbook is
> written and ready for when the visual pass lands; everything in it has been
> verified against the working build. But the thing does not yet look good
> enough to put in front of someone you want money from.

The one job of this document: you never get caught out in front of a prospect.
Run the **Before you leave** section at home. Run **At the table** in the room.

---

## Before you leave the house (5 minutes)

- [ ] Laptop charged, or charger in the bag. The 3D scene is GPU-heavy and eats battery.
- [ ] Screen brightness up. The scene is near-black by design; a dim screen in a bright
      room kills the effect. Turn off Night Shift / True Tone.
- [ ] Start the app:
      ```bash
      cd "jarvis/app"
      npm run dev
      ```
      Open **Chrome** at http://localhost:5173 (Chrome specifically — Phase 2 voice needs it).
- [ ] Grant the camera permission once, so you're never fumbling with a browser prompt live.
- [ ] Run the 90-second script below, start to finish, with your actual hands.
- [ ] Check the corner readout says `HANDS ONLINE` and the FPS is **25 or better**.
      Lower than that, close other apps and reload.
- [ ] Decide whether you want the tutorial to auto-run. To reset it to a first-time state
      (useful if you plan to hand the laptop to someone):
      ```js
      localStorage.clear()   // in the browser console, then reload
      ```

---

## The 90-second script

**0:00 — Hook (say nothing yet).** Laptop already open, scene already glowing. Reach a hand
up, pinch a piece of the model, and pull it out of the air. Let them watch you move it.

**0:20 — Take it apart.** Pinch with both hands and pull them apart. The whole system opens
up and the labels appear: Email Agent, Calendar, Files, Messaging, Tasks.

**0:40 — Name it.** "This is an AI agent system. That core is the brain, and each of those
is a part of a business it runs — email, calendar, files, messaging, tasks."

**1:00 — Put it back.** Push your hands back together. It reassembles itself.

**1:15 — Close.** "That's what I install for businesses. Want to see *your* business in here?"

---

## At the table (30 seconds)

- [ ] Sit with a **plain-ish background behind your hands** and light on your face/hands.
      Backlighting (a window behind you) is the #1 cause of bad tracking.
- [ ] Keep hands **inside the picture-in-picture frame**, about 40–70 cm from the laptop.
- [ ] Glance once at the corner readout: `HANDS ONLINE` before you start.

---

## If something goes wrong (know these cold)

| What happened | What to do |
|---|---|
| **"Enable hands" does nothing / can't load the tracking files** | The dev server isn't running (this is the most common one — the tab keeps rendering from memory long after the server stops). In Terminal: `cd jarvis/app && npm run dev`, then **reload the page**. |
| Camera won't start / permission denied | Nothing to fix live. **Everything works with the mouse** — drag pieces, drag the background to spin, buttons at the bottom. The message on screen says so too. |
| "The camera is in use by another app" | Quit Zoom / Meet / Photo Booth / another browser tab using the camera, then click Enable hands again. |
| Tracking is jittery or drops out | Move to better light, or just switch to the mouse mid-sentence. Don't announce the failure — the buttons do the same thing. |
| You want it to run itself | Press **3** or hit **Auto tour**. It explodes the model, walks each subsystem, and reassembles — hands-free. Any key cancels it. |
| A piece got flung somewhere odd | Open your palm (or press **2**) — everything glides home. **Reset view** re-centres the model. |
| The whole thing feels wrong | Reload the page. It comes back in about 3 seconds. |
| Someone asks to try it | Press **T** for the tutorial. Jarvis teaches them the four moves in about a minute, and it only advances when the camera sees them do it. Great moment — let them have it. |

---

## Every control, one table

| Move | Gesture | Mouse | Key |
|---|---|---|---|
| Grab a piece | Pinch thumb + index | Click and drag it | — |
| Drop it | Open your palm | Release the button | — |
| Spin the model | Make a fist, move it | Drag empty space | — |
| Pull apart / assemble | Pinch both hands, pull apart | Buttons | `1` / `2` |
| Resize | — | ⌥ + scroll | — |
| Auto tour | — | Auto tour | `3` |
| Tutorial | — | Tutorial | `T` |
| Show/hide controls list | — | `?` button | `H` |
| Cancel anything | Open palm | — | `Esc` |

---

## Health check from the console

Open DevTools (`⌥⌘I`) and run:

```js
__jarvis.status            // { state: 'on', fps: 30, message: null }
__jarvis.store.getState()  // current explode amount, what's grabbed, etc.
```

`state: 'on'` and `fps` of 25+ means you're good to go.

---

## Known limits (so nothing surprises you)

- **Depth is approximate.** The webcam infers how near your hand is from how big it looks.
  Side-to-side and up-down are precise; pushing "into" the screen is coarse. Demo in the
  plane of the screen and it looks perfect.
- **Two hands crossing over each other** confuses the tracker briefly. Keep them apart.
- **Arms get tired.** This is a 90-second experience, not a 10-minute one. That's by design —
  land the wow, then talk.
- **Chrome only** for now. Safari and Firefox render the scene but voice (Phase 2) won't work.
