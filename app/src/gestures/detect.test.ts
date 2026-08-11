import { describe, expect, it } from 'vitest'
import { FIST_HAND, OPEN_HAND, PINCH_HAND } from './fixtures'
import { cursorPoint, depthProxy, handScale, isFist, isPalmOpen, pinchRatio } from './detect'

describe('handScale', () => {
  it('is positive for a real hand', () => {
    expect(handScale(OPEN_HAND)).toBeGreaterThan(0)
  })

  it('scales linearly when the whole hand is scaled up', () => {
    const base = handScale(OPEN_HAND)
    const doubled = OPEN_HAND.map((l) => ({ x: l.x * 2, y: l.y * 2, z: l.z * 2 }))
    expect(handScale(doubled)).toBeCloseTo(base * 2, 5)
  })
})

describe('pinchRatio', () => {
  it('is small when thumb and index tips meet', () => {
    expect(pinchRatio(PINCH_HAND)).toBeLessThan(0.3)
  })

  it('is large when the hand is open', () => {
    expect(pinchRatio(OPEN_HAND)).toBeGreaterThan(0.8)
  })

  it('is scale-invariant', () => {
    const doubled = PINCH_HAND.map((l) => ({ x: l.x * 2, y: l.y * 2, z: l.z * 2 }))
    expect(pinchRatio(doubled)).toBeCloseTo(pinchRatio(PINCH_HAND), 5)
  })
})

describe('isPalmOpen', () => {
  it('is true for an open hand', () => {
    expect(isPalmOpen(OPEN_HAND)).toBe(true)
  })

  it('is false for a fist', () => {
    expect(isPalmOpen(FIST_HAND)).toBe(false)
  })

  it('is false for a pinch (index is curled in)', () => {
    expect(isPalmOpen(PINCH_HAND)).toBe(false)
  })
})

describe('isFist', () => {
  it('is true for a fist', () => {
    expect(isFist(FIST_HAND)).toBe(true)
  })

  it('is false for a pinch', () => {
    expect(isFist(PINCH_HAND)).toBe(false)
  })

  it('is false for an open hand', () => {
    expect(isFist(OPEN_HAND)).toBe(false)
  })
})

describe('cursorPoint', () => {
  it('returns the middle-finger MCP landmark', () => {
    expect(cursorPoint(OPEN_HAND)).toEqual(OPEN_HAND[9])
  })
})

describe('depthProxy', () => {
  it('grows as the hand gets bigger (closer to camera)', () => {
    const bigger = OPEN_HAND.map((l) => ({ x: l.x * 1.5, y: l.y * 1.5, z: l.z }))
    expect(depthProxy(bigger)).toBeGreaterThan(depthProxy(OPEN_HAND))
  })
})
