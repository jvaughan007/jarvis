import { z } from 'zod'

/**
 * Validation and target resolution for the commands Claude sends.
 *
 * The scene is never driven by raw model output. Every command is validated,
 * and every target is resolved against what is actually on screen — a command
 * naming something that does not exist becomes a no-op with a readable reason,
 * never a thrown error mid-demo.
 */

export const SCENE_ACTIONS = [
  'camera.focus',
  'camera.reset',
  'model.explode',
  'model.assemble',
  'part.highlight',
  'part.pulse',
  'clear.highlight',
] as const

export type SceneAction = (typeof SCENE_ACTIONS)[number]

/** More than this in one turn is a runaway, not a demo. */
const MAX_COMMANDS = 12

const CommandSchema = z.object({
  action: z.enum(SCENE_ACTIONS),
  target: z.string().optional(),
})

const BatchSchema = z.object({
  commands: z.array(CommandSchema).max(MAX_COMMANDS),
})

export type SceneCommand = z.infer<typeof CommandSchema>

export type ParseResult =
  | { ok: true; commands: SceneCommand[] }
  | { ok: false; error: string }

export function parseCommands(input: unknown): ParseResult {
  const parsed = BatchSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid command batch.' }
  }
  return { ok: true, commands: parsed.data.commands }
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

/**
 * Map whatever the model wrote onto a real scene id.
 *
 * Exact match first, then a normalized match, then containment — so "email
 * agent" and "the files" land on the right part instead of doing nothing.
 * Deliberately conservative: a one-character overlap is not a match.
 */
export function resolveTarget(target: string | undefined, ids: string[]): string | null {
  if (!target) return null
  const raw = target.trim()
  if (!raw) return null

  if (ids.includes(raw)) return raw

  const needle = normalize(raw)
  if (needle.length < 2) return null

  const exact = ids.find((id) => normalize(id) === needle)
  if (exact) return exact

  const contained = ids.find((id) => {
    const hay = normalize(id)
    return needle.includes(hay) || hay.includes(needle)
  })
  return contained ?? null
}

/** Crude edit distance, enough to order suggestions by closeness. */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) rows[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return rows[a.length][b.length]
}

/**
 * The message handed back to Claude when a target does not exist. Listing the
 * nearest ids lets it correct itself on the next turn instead of repeating the
 * same bad guess.
 */
export function describeUnknownTarget(target: string, ids: string[]): string {
  const needle = normalize(target)
  const closest = [...ids]
    .sort((a, b) => distance(normalize(a), needle) - distance(normalize(b), needle))
    .slice(0, 3)
  return `There is nothing called "${target}" on screen. Valid targets include: ${closest.join(', ')}.`
}
