# Security

This repository is public. What follows is the posture it was audited against
before publication, and the rules for keeping it that way.

## Nothing secret is in this repository

Audited before the first commit: no API keys, tokens, private keys, `.env`
files, personal contact details, client names, or captured webcam frames appear
in any tracked file. The repository was initialised fresh so no earlier history
exists to leak.

The only credential-shaped string in the repo is the placeholder
`sk-ant-api-your-key-here` in documentation.

## How credentials are handled

The API key lives **only** in the environment of the machine running
`server/`. It is never sent to the browser, never written to a tracked file,
and never logged. The browser talks to a local proxy; the proxy talks to the
API. That split is the entire reason the proxy exists.

Copy `.env.example` to `.env` (gitignored) or export the variables in your shell.

## The brain server is loopback-only, on purpose

`server/index.js` binds to `127.0.0.1`, not to every interface.

It holds an API key and has **no authentication**. Node's default of binding
`0.0.0.0` would mean anyone sharing a coffee shop, venue, or client office
network could reach the endpoint and spend that key. This project gets demoed on
exactly those networks. **Do not change the bind address to expose it on a LAN
without adding authentication first.**

Alongside that:

- **Request bodies are capped** (256 KB) so one request cannot exhaust memory.
- **Message payloads are shape-checked** — role must be `user` or `assistant`,
  with limits on count and length. A `system` role from the client is rejected,
  so a caller cannot inject a system turn.
- **A per-IP throttle** limits requests per minute, so a runaway loop or a
  stranger costs a handful of calls rather than an API bill.

## Prompt injection

The browser sends a `sceneIndex` describing what is currently on screen, and
that text is rendered into the system prompt. It is treated as untrusted input,
not configuration:

- newlines, carriage returns, and control characters are stripped, so a payload
  cannot break out of its line and begin a new instruction;
- ids are restricted to a conservative character set;
- every field is length-capped and the list is entry-capped.

Verified by feeding it newline-delimited "ignore all previous instructions"
payloads, CRLF sequences, and ANSI escapes, and confirming they render flattened
onto a single list item.

Separately, on the client: commands returned by the model are validated against
a fixed action enum and resolved against parts that actually exist. An unknown
target is a no-op that returns a correction to the model — it can never crash or
drive the scene somewhere undefined.

## SQL injection

Not applicable. There is no database and no SQL anywhere in the project.

## What is deliberately committed

`app/public/mediapipe/` contains ~19 MB of Google's published MediaPipe WASM
runtime and hand-landmark model. These are vendored on purpose so the app runs
with no network access at all — a demo must not depend on venue wifi. They are
public redistributable assets and contain nothing specific to this project.

## Reporting

Found something? Open an issue, or contact the repository owner directly. Please
don't include a working credential in a public issue.
