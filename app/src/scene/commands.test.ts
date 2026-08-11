import { describe, expect, it } from 'vitest'
import { parseCommands, resolveTarget, describeUnknownTarget } from './commands'

const IDS = ['core', 'email', 'calendar', 'files', 'messaging', 'tasks']

describe('parseCommands', () => {
  it('accepts a well-formed batch', () => {
    const result = parseCommands({
      commands: [
        { action: 'model.explode' },
        { action: 'part.highlight', target: 'email' },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.commands).toHaveLength(2)
  })

  it('rejects an unknown action rather than guessing', () => {
    const result = parseCommands({ commands: [{ action: 'model.detonate' }] })
    expect(result.ok).toBe(false)
  })

  it('rejects a malformed payload', () => {
    expect(parseCommands(null).ok).toBe(false)
    expect(parseCommands({}).ok).toBe(false)
    expect(parseCommands({ commands: 'explode' }).ok).toBe(false)
  })

  it('accepts an empty batch (a turn that only speaks)', () => {
    const result = parseCommands({ commands: [] })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.commands).toEqual([])
  })

  it('caps absurdly long batches instead of animating forever', () => {
    const commands = Array.from({ length: 50 }, () => ({ action: 'model.explode' }))
    const result = parseCommands({ commands })
    expect(result.ok).toBe(false)
  })
})

describe('resolveTarget', () => {
  it('resolves an exact id', () => {
    expect(resolveTarget('email', IDS)).toBe('email')
  })

  it('resolves case and whitespace differences', () => {
    expect(resolveTarget('  Email ', IDS)).toBe('email')
    expect(resolveTarget('CALENDAR', IDS)).toBe('calendar')
  })

  it('resolves a label the model wrote instead of an id', () => {
    expect(resolveTarget('email agent', IDS)).toBe('email')
    expect(resolveTarget('the files', IDS)).toBe('files')
  })

  it('returns null for something genuinely not in the scene', () => {
    expect(resolveTarget('payroll', IDS)).toBeNull()
    expect(resolveTarget('', IDS)).toBeNull()
    expect(resolveTarget(undefined, IDS)).toBeNull()
  })

  it('does not match on a single shared letter', () => {
    expect(resolveTarget('e', IDS)).toBeNull()
  })
})

describe('describeUnknownTarget', () => {
  it('names the closest candidates so the model can correct itself', () => {
    const message = describeUnknownTarget('emial', IDS)
    expect(message).toContain('emial')
    expect(message).toMatch(/email/)
  })

  it('still returns a usable message when nothing is close', () => {
    const message = describeUnknownTarget('payroll', IDS)
    expect(message).toContain('payroll')
    expect(message.length).toBeGreaterThan(10)
  })
})
