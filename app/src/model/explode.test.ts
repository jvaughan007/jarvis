import { describe, expect, it } from 'vitest'
import { PARTS } from './heroParts'
import { explodedPosition } from './explode'

const len = ([x, y, z]: [number, number, number]) => Math.hypot(x, y, z)

describe('PARTS', () => {
  it('has the six spec-named parts with unique ids', () => {
    const ids = PARTS.map((p) => p.id)
    expect(ids).toEqual(['core', 'email', 'calendar', 'files', 'messaging', 'tasks'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every part a label, colour and radius', () => {
    for (const part of PARTS) {
      expect(part.label.length).toBeGreaterThan(0)
      expect(part.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(part.radius).toBeGreaterThan(0)
    }
  })

  it('puts the core at the origin', () => {
    expect(PARTS[0].home).toEqual([0, 0, 0])
  })
})

describe('explodedPosition', () => {
  it('returns home unchanged at amount 0', () => {
    for (const part of PARTS) {
      expect(explodedPosition(part.home, 0)).toEqual(part.home)
    }
  })

  it('pushes satellites outward along their home direction', () => {
    const email = PARTS.find((p) => p.id === 'email')!
    const out = explodedPosition(email.home, 1)
    const homeLen = len(email.home)
    expect(len(out)).toBeGreaterThan(homeLen)
    // Same direction: the normalized vectors match.
    const nHome = email.home.map((v) => v / homeLen)
    const nOut = out.map((v) => v / len(out))
    nHome.forEach((v, i) => expect(nOut[i]).toBeCloseTo(v, 5))
  })

  it('moves parts monotonically farther as amount grows', () => {
    const files = PARTS.find((p) => p.id === 'files')!
    const distances = [0, 0.25, 0.5, 0.75, 1].map((a) => len(explodedPosition(files.home, a)))
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1])
    }
  })

  it('honours a custom factor', () => {
    const calendar = PARTS.find((p) => p.id === 'calendar')!
    const near = len(explodedPosition(calendar.home, 1, 1))
    const far = len(explodedPosition(calendar.home, 1, 3))
    expect(far).toBeGreaterThan(near)
  })

  it('drifts the origin-anchored core upward instead of leaving it put', () => {
    const out = explodedPosition([0, 0, 0], 1)
    expect(out[0]).toBe(0)
    expect(out[2]).toBe(0)
    expect(out[1]).toBeGreaterThan(0)
  })

  it('does not mutate the home array it is given', () => {
    const home: [number, number, number] = [1, 2, 3]
    explodedPosition(home, 1)
    expect(home).toEqual([1, 2, 3])
  })
})
