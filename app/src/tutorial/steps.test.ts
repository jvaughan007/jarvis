import { describe, expect, it } from 'vitest'
import { TUTORIAL_STEPS } from './steps'
import type { GestureEvent } from '../gestures/stateMachine'
import type { HandFrame } from '../input/handFrames'

const frame = (over: Partial<HandFrame> = {}): HandFrame =>
  ({
    landmarks: null,
    cursor3D: { x: 0, y: 0, z: 0 } as HandFrame['cursor3D'],
    pinching: false,
    fisting: false,
    pinchStrength: 0,
    ...over,
  }) as HandFrame

const tracked = (over: Partial<HandFrame> = {}) =>
  frame({ landmarks: [] as unknown as HandFrame['landmarks'], ...over })

const noHands: [HandFrame, HandFrame] = [frame(), frame()]
const step = (id: string) => TUTORIAL_STEPS.find((s) => s.id === id)!

describe('TUTORIAL_STEPS', () => {
  it('teaches exactly the four gestures, in learning order', () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual(['grab', 'drop', 'spin', 'pullApart'])
  })

  it('gives every step plain-English copy with no movie references', () => {
    const banned = /jarvis|iron ?man|stark|marvel|avenger/i
    for (const s of TUTORIAL_STEPS) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.instruction.length).toBeGreaterThan(10)
      expect(s.instruction).not.toMatch(banned)
      expect(s.title).not.toMatch(banned)
    }
  })
})

describe('grab step', () => {
  it('passes when a pinch starts', () => {
    const events: GestureEvent[] = [{ type: 'pinchStart', hand: 0 }]
    expect(step('grab').passes(events, noHands)).toBe(true)
  })

  it('does not pass on an unrelated gesture', () => {
    expect(step('grab').passes([{ type: 'palmOpen', hand: 0 }], noHands)).toBe(false)
  })
})

describe('drop step', () => {
  it('passes when the palm opens', () => {
    expect(step('drop').passes([{ type: 'palmOpen', hand: 1 }], noHands)).toBe(true)
  })

  it('does not pass on a pinch', () => {
    expect(step('drop').passes([{ type: 'pinchStart', hand: 0 }], noHands)).toBe(false)
  })
})

describe('spin step', () => {
  it('passes once a fist is being held', () => {
    const frames: [HandFrame, HandFrame] = [tracked({ fisting: true }), frame()]
    expect(step('spin').passes([{ type: 'fistStart', hand: 0 }], frames)).toBe(true)
  })

  it('also passes if the fist is already held without a fresh event', () => {
    const frames: [HandFrame, HandFrame] = [tracked({ fisting: true }), frame()]
    expect(step('spin').passes([], frames)).toBe(true)
  })

  it('does not pass with no fist', () => {
    expect(step('spin').passes([], noHands)).toBe(false)
  })
})

describe('pullApart step', () => {
  it('passes only when both hands are pinching at once', () => {
    const both: [HandFrame, HandFrame] = [
      tracked({ pinching: true }),
      tracked({ pinching: true }),
    ]
    expect(step('pullApart').passes([], both)).toBe(true)
  })

  it('does not pass with only one hand pinching', () => {
    const one: [HandFrame, HandFrame] = [tracked({ pinching: true }), tracked()]
    expect(step('pullApart').passes([{ type: 'pinchStart', hand: 0 }], one)).toBe(false)
  })

  it('does not pass when a hand is untracked even if flagged pinching', () => {
    const ghost: [HandFrame, HandFrame] = [
      tracked({ pinching: true }),
      frame({ pinching: true }),
    ]
    expect(step('pullApart').passes([], ghost)).toBe(false)
  })
})
