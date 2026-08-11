/**
 * A scripted stand-in for Claude, enabled with JARVIS_MOCK=1.
 *
 * Two jobs. It lets the voice loop be tested without spending API calls, and it
 * lets Josh rehearse the demo with no key and no network at all — useful on a
 * plane, in a venue with captive wifi, or when the API is having a bad day.
 *
 * It streams in the same shape as the real brain, token by token, so the
 * sentence chunking and scene commands exercise the identical code path.
 */

const SCRIPT = [
  {
    match: /take (it |this )?apart|pull (it|this) apart|break (it|this) (apart|down)|explode/i,
    text: 'Opening it up now. Each piece around the core is a part of the business the system runs for you.',
    commands: [{ action: 'model.explode' }],
  },
  {
    match: /put .*back|assemble|close|together/i,
    text: 'Back together. On its own, it just runs — you only see it when something needs you.',
    commands: [{ action: 'model.assemble' }],
  },
  {
    match: /email/i,
    text: 'The email agent reads everything that comes in, answers what it can, and flags the few that actually need you. Most owners get an hour of their morning back.',
    commands: [
      { action: 'part.highlight', target: 'email' },
      { action: 'camera.focus', target: 'email' },
    ],
  },
  {
    match: /calendar|schedul|book|appointment/i,
    text: 'The calendar agent books, reschedules, and confirms without you touching it. No more phone tag over a time slot.',
    commands: [{ action: 'part.highlight', target: 'calendar' }],
  },
  {
    match: /file|document|paperwork/i,
    text: 'Files get named, filed, and found when you ask. Nothing lives on someone’s desktop anymore.',
    commands: [{ action: 'part.highlight', target: 'files' }],
  },
  {
    match: /message|text|chat|slack|teams/i,
    text: 'Messaging is how you talk to it. You ask in plain language, from your phone, and it answers.',
    commands: [{ action: 'part.highlight', target: 'messaging' }],
  },
  {
    match: /task|to.?do|follow.?up/i,
    text: 'Tasks are what it decided needs doing. It keeps its own list and works through it.',
    commands: [{ action: 'part.highlight', target: 'tasks' }],
  },
  {
    match: /core|brain|centre|center|what are you|who are you/i,
    text: 'I am the assistant Josh builds for businesses. That glowing core is the part that decides what to do; everything around it is a system I run for you.',
    commands: [
      { action: 'part.pulse', target: 'core' },
      { action: 'camera.focus', target: 'core' },
    ],
  },
]

const FALLBACK = {
  text: 'That one is outside what this demo knows. Ask me about the email, calendar, files, messaging, or tasks agents.',
  commands: [{ action: 'clear.highlight' }],
}

export function scriptedReply(utterance) {
  return SCRIPT.find((entry) => entry.match.test(utterance)) ?? FALLBACK
}

/**
 * Stream a scripted reply in the real brain's wire format.
 * @param {(event: unknown) => void} send
 * @param {string} utterance
 */
export async function streamMock(send, utterance, { tokenDelayMs = 18 } = {}) {
  const reply = scriptedReply(utterance)

  // Word by word, so sentence chunking and early speech behave as they will live.
  const tokens = reply.text.match(/\S+\s*/g) ?? []
  for (const token of tokens) {
    send({ type: 'text', text: token })
    if (tokenDelayMs > 0) await new Promise((r) => setTimeout(r, tokenDelayMs))
  }

  send({ type: 'commands', commands: reply.commands })
  send({
    type: 'done',
    stopReason: 'end_turn',
    content: [{ type: 'text', text: reply.text }],
    usage: { input_tokens: 0, output_tokens: 0, mocked: true },
  })
}
