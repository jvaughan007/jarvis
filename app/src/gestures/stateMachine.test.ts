import { describe, expect, it } from 'vitest'
import type { Landmark } from './detect'
import { FIST_HAND, OPEN_HAND, PINCH_HAND } from './fixtures'
import { GestureTracker, PINCH_OFF, PINCH_ON } from './stateMachine'

/** Build a hand whose pinch ratio is exactly `ratio` by moving the index tip. */
function handWithPinchRatio(ratio: number): Landmark[] {
  const lm = PINCH_HAND.map((l) => ({ ...l }))
  const scale = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y)
  lm[8] = { x: lm[4].x + ratio * scale, y: lm[4].y, z: 0 }
  return lm
}

const types = (evts: { type: string }[]) => evts.map((e) => e.type)

describe('GestureTracker pinch hysteresis', () => {
  it('starts a pinch below PINCH_ON and holds it inside the hysteresis band', () => {
    const t = new GestureTracker()
    expect(types(t.update([handWithPinchRatio(PINCH_ON - 0.05), null], 0))).toContain('pinchStart')
    expect(t.isPinching(0)).toBe(true)

    // Inside the band (between ON and OFF): still pinching, no event.
    const mid = t.update([handWithPinchRatio(0.4), null], 16)
    expect(types(mid)).not.toContain('pinchEnd')
    expect(t.isPinching(0)).toBe(true)

    // Past PINCH_OFF: releases.
    const out = t.update([handWithPinchRatio(PINCH_OFF + 0.05), null], 32)
    expect(types(out)).toContain('pinchEnd')
    expect(t.isPinching(0)).toBe(false)
  })

  it('does not re-fire pinchStart while already pinching', () => {
    const t = new GestureTracker()
    t.update([handWithPinchRatio(0.1), null], 0)
    const again = t.update([handWithPinchRatio(0.1), null], 16)
    expect(types(again)).not.toContain('pinchStart')
  })
})

describe('GestureTracker fist dwell', () => {
  it('does not fire fistStart before the dwell elapses', () => {
    const t = new GestureTracker()
    t.update([FIST_HAND, null], 0)
    const early = t.update([FIST_HAND, null], 140)
    expect(types(early)).not.toContain('fistStart')
    expect(t.isFisting(0)).toBe(false)
  })

  it('fires fistStart once the dwell elapses, and fistEnd when the fist opens', () => {
    const t = new GestureTracker()
    t.update([FIST_HAND, null], 0)
    expect(types(t.update([FIST_HAND, null], 160))).toContain('fistStart')
    expect(t.isFisting(0)).toBe(true)
    expect(types(t.update([OPEN_HAND, null], 200))).toContain('fistEnd')
    expect(t.isFisting(0)).toBe(false)
  })
})

describe('GestureTracker hand loss', () => {
  it('emits pinchEnd and handLost when a pinching hand disappears', () => {
    const t = new GestureTracker()
    t.update([handWithPinchRatio(0.1), null], 0)
    const lost = types(t.update([null, null], 16))
    expect(lost).toContain('pinchEnd')
    expect(lost).toContain('handLost')
    expect(t.isPinching(0)).toBe(false)
  })

  it('emits fistEnd when a fisting hand disappears', () => {
    const t = new GestureTracker()
    t.update([FIST_HAND, null], 0)
    t.update([FIST_HAND, null], 200)
    const lost = types(t.update([null, null], 216))
    expect(lost).toContain('fistEnd')
    expect(lost).toContain('handLost')
  })

  it('does not emit handLost repeatedly for an absent hand', () => {
    const t = new GestureTracker()
    t.update([OPEN_HAND, null], 0)
    expect(types(t.update([null, null], 16))).toContain('handLost')
    expect(types(t.update([null, null], 32))).not.toContain('handLost')
  })
})

describe('GestureTracker palm open', () => {
  it('fires once per open, not once per frame', () => {
    const t = new GestureTracker()
    let count = 0
    for (let i = 0; i < 10; i++) {
      count += t.update([OPEN_HAND, null], i * 16).filter((e) => e.type === 'palmOpen').length
    }
    expect(count).toBe(1)
  })

  it('re-arms after the hand stops being open', () => {
    const t = new GestureTracker()
    t.update([OPEN_HAND, null], 0)
    t.update([FIST_HAND, null], 16)
    expect(types(t.update([OPEN_HAND, null], 32))).toContain('palmOpen')
  })
})

describe('GestureTracker two hands', () => {
  it('tracks both hands independently', () => {
    const t = new GestureTracker()
    const evts = t.update([handWithPinchRatio(0.1), handWithPinchRatio(0.1)], 0)
    expect(evts.filter((e) => e.type === 'pinchStart').map((e) => e.hand).sort()).toEqual([0, 1])
    expect(t.isPinching(0)).toBe(true)
    expect(t.isPinching(1)).toBe(true)
  })
})
