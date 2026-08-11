import http from 'node:http'
import Anthropic from '@anthropic-ai/sdk'
import { MODEL, SCENE_COMMANDS_TOOL, buildSystem, modelConfig } from './brain.js'
import { streamMock } from './mockBrain.js'

const PORT = Number(process.env.JARVIS_PORT || 8787)

/** Scripted replies, no API calls — for rehearsing offline. See docs/voice-setup.md. */
const MOCK = process.env.JARVIS_MOCK === '1'

/**
 * Thin proxy between the browser and Claude.
 *
 * It exists for one reason: the API key must never reach the browser. It adds
 * no logic of its own — it forwards a turn, streams the reply back as SSE, and
 * lets the frontend decide what to say out loud and what to do to the scene.
 */

/**
 * Two credential shapes reach this server and they authenticate differently.
 *
 * A real API key (sk-ant-api…) goes on the x-api-key header, which is what the
 * SDK does by default. An OAuth token (sk-ant-oat…) must instead be sent as a
 * bearer token with an extra beta header — passing one as an API key is
 * rejected with a confusing "invalid key" error rather than anything that
 * points at the actual mismatch.
 */
function makeClient() {
  const credential = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || ''

  if (credential.startsWith('sk-ant-oat')) {
    return new Anthropic({
      authToken: credential,
      apiKey: null,
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    })
  }
  return new Anthropic()
}

export const CREDENTIAL_KIND = (process.env.ANTHROPIC_API_KEY || '').startsWith('sk-ant-oat')
  ? 'oauth'
  : 'api-key'

const client = makeClient()

function sse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

/** Cap the body so a single request can't exhaust memory. */
const MAX_BODY_BYTES = 256 * 1024
/** Enough for a long demo conversation, far short of a runaway loop. */
const MAX_MESSAGES = 60
const MAX_CONTENT_CHARS = 8000

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body too large.'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * The browser is not trusted here. Anything forwarded to the model gets shape-
 * checked first, so a malformed or hostile payload is rejected by this server
 * rather than billed to the API key it holds.
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array.'
  }
  if (messages.length > MAX_MESSAGES) {
    return `messages must contain at most ${MAX_MESSAGES} entries.`
  }
  for (const message of messages) {
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) {
      return 'each message needs a role of "user" or "assistant".'
    }
    if (typeof message.content === 'string') {
      if (message.content.length > MAX_CONTENT_CHARS) return 'message content is too long.'
    } else if (!Array.isArray(message.content)) {
      return 'message content must be a string or an array of blocks.'
    }
  }
  return null
}

/**
 * Crude per-IP throttle. This is a single-user local server, so the job is
 * simply to make an accidental loop — or a stranger who found the port — cost
 * a handful of calls rather than a whole API bill.
 */
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 40
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 128) hits.clear()
  return recent.length > RATE_MAX
}

async function handleChat(req, res) {
  if (rateLimited(req.socket.remoteAddress ?? 'unknown')) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Too many requests.' }))
    return
  }

  let body
  try {
    body = await readJson(req)
  } catch (err) {
    const status = err?.statusCode ?? 400
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: status === 413 ? 'Body too large.' : 'Body must be JSON.' }))
    return
  }

  const { messages, sceneIndex = [] } = body
  const invalid = validateMessages(messages)
  if (invalid) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: invalid }))
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // The browser aborts this request when the user interrupts Jarvis mid-sentence.
  const controller = new AbortController()
  req.on('close', () => controller.abort())

  if (MOCK) {
    const last = [...messages].reverse().find((m) => m.role === 'user')
    const utterance = typeof last?.content === 'string' ? last.content : ''
    try {
      await streamMock((event) => sse(res, event), utterance)
    } catch (err) {
      if (!controller.signal.aborted) console.error('[jarvis] mock failed:', err)
    }
    res.end()
    return
  }

  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        ...modelConfig(),
        system: buildSystem(sceneIndex),
        tools: [SCENE_COMMANDS_TOOL],
        messages,
      },
      { signal: controller.signal },
    )

    // Text is forwarded token by token so the browser can start speaking the
    // first sentence while the rest is still being generated.
    stream.on('text', (delta) => sse(res, { type: 'text', text: delta }))

    const message = await stream.finalMessage()

    for (const block of message.content) {
      if (block.type === 'tool_use' && block.name === 'scene_commands') {
        sse(res, { type: 'commands', commands: block.input?.commands ?? [] })
      }
    }

    sse(res, {
      type: 'done',
      stopReason: message.stop_reason,
      content: message.content,
      usage: message.usage,
    })
  } catch (err) {
    if (controller.signal.aborted) {
      res.end()
      return
    }
    console.error('[jarvis] chat failed:', err)
    sse(res, { type: 'error', message: describe(err) })
  }
  res.end()
}

/** Turn an SDK error into something worth showing on screen mid-demo. */
function describe(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'The API key was rejected. Check ANTHROPIC_API_KEY and restart the server.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the API. Wait a moment and try again.'
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the API. Check the network connection.'
  }
  if (err instanceof Anthropic.NotFoundError) {
    return `The model "${MODEL}" was not found for this API key.`
  }
  if (err instanceof Anthropic.APIError) {
    return `The API returned an error (${err.status}). Voice is unavailable; the scene still works.`
  }
  return 'Voice is unavailable right now. The scene still works by hand and mouse.'
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        model: MODEL,
        hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
        credential: CREDENTIAL_KIND,
        mock: MOCK,
      }),
    )
    return
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res).catch((err) => {
      console.error('[jarvis] unhandled:', err)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    })
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

/**
 * Loopback only — deliberately.
 *
 * This server holds an API key and has no authentication. Binding to every
 * interface (Node's default) would mean anyone sharing a coffee shop, venue,
 * or client office network could POST to it and spend that key. Josh demos on
 * exactly those networks, so this stays 127.0.0.1 and the browser reaches it
 * through Vite's proxy on the same machine.
 */
const HOST = '127.0.0.1'

server.listen(PORT, HOST, () => {
  console.log(`[jarvis] brain listening on http://${HOST}:${PORT} (loopback only)`)
  if (MOCK) {
    console.log('[jarvis] MOCK MODE — scripted replies, no API calls, no key needed.')
    return
  }
  console.log(`[jarvis] model: ${MODEL}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[jarvis] WARNING: ANTHROPIC_API_KEY is not set — voice will fail.')
  } else if (CREDENTIAL_KIND === 'oauth') {
    console.warn(
      '[jarvis] WARNING: using a Claude Code OAuth token. It shares its rate limit\n' +
        '          with your other Claude usage and expires on its own schedule.\n' +
        '          Get a dedicated key at console.anthropic.com before demoing.',
    )
  }
})
