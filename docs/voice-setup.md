# Giving Jarvis a Voice — Setup

Phase 2 adds the part where Jarvis talks back and moves the model while it talks.
This is the one piece that needs a credential and a second Terminal window.

---

## What you need once

### 1. An API key

Go to **console.anthropic.com → API Keys → Create Key**, and copy it. It starts
with `sk-ant-api…`.

Add it to your shell so it's there every time:

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-api-your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

> **Why a real API key and not the one already on your machine.** Your Mac
> currently has an `sk-ant-oat…` token, which is the login Claude Code uses.
> Jarvis *can* run on it, but it's the wrong tool for a demo: it expires and
> refreshes on Claude Code's schedule, it stops working if you log out, and it
> shares one rate limit with everything else you're running — so a heavy Claude
> Code session can rate-limit your demo. A dedicated API key has its own limit
> and doesn't expire underneath you. **Get the key before you demo this.**

### 2. Nothing else

The server has one dependency and it's already installed.

---

## Running it (two windows, every time)

**Window 1 — the brain:**
```bash
cd "jarvis/server"
node index.js
```
You should see `brain listening on http://localhost:8787`. If it warns that
`ANTHROPIC_API_KEY` is not set, voice will not work — fix that first.

**Window 2 — the app:**
```bash
cd "jarvis/app"
npm run dev
```

Open **Chrome** at http://localhost:5173, click **Start Jarvis**, and talk.

Check the brain is healthy any time:
```bash
curl -s localhost:8787/api/health
# {"ok":true,"model":"claude-sonnet-5","hasKey":true,"credential":"api-key"}
```
`"credential":"oauth"` means you're still on the Claude Code token — see above.

---

## Rehearsal mode (no key, no network, no cost)

```bash
cd "jarvis/server"
JARVIS_MOCK=1 node index.js
```

Jarvis replies from a script instead of calling the API. The voice, the
sentence timing, and the scene commands all behave exactly as they do live —
it just always says the same things. Use it to:

- practise the demo on a plane or on venue wifi that blocks everything
- rehearse without spending API calls
- check the voice UI still works when you suspect the key is the problem

It answers to: *take it apart*, *put it back together*, and questions about
**email**, **calendar**, **files**, **messaging**, **tasks**, or the **core**.
Anything else gets a polite "ask me about…" reply.

`curl localhost:8787/api/health` shows `"mock":true` when it's on, so you can
never mistake a rehearsal for the real thing.

---

## Choosing the model

Default is **Claude Sonnet 5** — smart enough to handle a question you didn't
script, which is what actually happens when a prospect starts poking at it.

If replies feel slow, switch to the fastest model:

```bash
JARVIS_MODEL=claude-haiku-4-5 node index.js
```

| | Sonnet 5 | Haiku 4.5 |
|---|---|---|
| Feel | Slight pause, better answers | Snappier, simpler answers |
| Cost per demo | Pennies | Fractions of a penny |
| Handles off-script questions | Well | Adequately |

Both are far below Opus tier on cost. Try Sonnet first; only drop to Haiku if
the pause bothers you in the room.

---

## What Jarvis can do to the scene

You don't type these — Jarvis decides. This is what it has available:

| It can | What you see |
|---|---|
| Focus a part | Model opens slightly and that part glows |
| Explode / assemble | The whole system opens up or closes back down |
| Highlight a part | That part glows while Jarvis talks about it |
| Pulse a part | A quick bright flash — Jarvis pointing at something |
| Reset the view | Back to centred and closed |

If Jarvis names something that isn't on screen, the command is ignored and it
gets told what the real names are, so it corrects itself instead of repeating
the mistake.

---

## Things to say in a demo

- "What am I looking at?"
- "Take it apart and walk me through it."
- "What does the email one actually do for a business like mine?"
- "Put it back together."
- "Which of these would save me the most time?"

---

## When it misbehaves

| What happened | What to do |
|---|---|
| **Start Jarvis does nothing** | Voice needs Chrome. In Safari or Firefox the button says so — the hands and mouse still work. |
| **"Voice unavailable"** | The brain isn't running or has no key. Check window 1 and `curl localhost:8787/api/health`. |
| **"Rate limited"** | You're on the Claude Code OAuth token and something else is using the same quota. Get a dedicated API key. |
| **Jarvis hears itself and loops** | Shouldn't happen — the mic closes while it speaks. If it does, click **End voice** and restart. |
| **It talks too long** | Click **Stop talking**. It cuts off mid-sentence and goes back to listening. |
| **It answers but the model doesn't move** | The reply arrived without a scene command. Ask a question that names a part ("show me the calendar"). |

**Voice failing never breaks the demo.** Hands, mouse, buttons, and the auto
tour all keep working with the brain switched off entirely.
