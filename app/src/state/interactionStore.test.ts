import { beforeEach, describe, expect, it } from 'vitest'
import { useInteraction } from './interactionStore'

const s = () => useInteraction.getState()

beforeEach(() => {
  useInteraction.setState(useInteraction.getInitialState(), true)
})

describe('interactionStore', () => {
  it('clamps targetExplode to [0, 1]', () => {
    s().setTargetExplode(1.7)
    expect(s().targetExplode).toBe(1)
    s().setTargetExplode(-1)
    expect(s().targetExplode).toBe(0)
    s().setTargetExplode(0.5)
    expect(s().targetExplode).toBe(0.5)
  })

  it('grab sets grabbed; a second hand cannot steal the grab', () => {
    s().grab('email', 0)
    expect(s().grabbed).toEqual({ partId: 'email', hand: 0 })
    s().grab('files', 1)
    expect(s().grabbed).toEqual({ partId: 'email', hand: 0 })
  })

  it('release clears grabbed and hovered stays independent', () => {
    s().grab('email', 0)
    s().setHovered('files')
    s().release()
    expect(s().grabbed).toBeNull()
    expect(s().hoveredPartId).toBe('files')
  })

  it('scaleBy is multiplicative and clamps to [0.5, 2.5]', () => {
    s().scaleBy(2)
    expect(s().modelScale).toBe(2)
    s().scaleBy(10)
    expect(s().modelScale).toBe(2.5)
    s().scaleBy(0.01)
    expect(s().modelScale).toBe(0.5)
  })

  it('rotateBy accumulates yaw and clamps pitch to ±1.2', () => {
    s().rotateBy(1, 0.5)
    s().rotateBy(1, 0.5)
    expect(s().modelYaw).toBeCloseTo(2)
    expect(s().modelPitch).toBeCloseTo(1)
    s().rotateBy(0, 5)
    expect(s().modelPitch).toBe(1.2)
    s().rotateBy(0, -10)
    expect(s().modelPitch).toBe(-1.2)
  })

  it('tutorial lifecycle: start → 0, advance → 1, end → null', () => {
    expect(s().tutorialStep).toBeNull()
    s().startTutorial()
    expect(s().tutorialStep).toBe(0)
    s().advanceTutorial()
    expect(s().tutorialStep).toBe(1)
    s().endTutorial()
    expect(s().tutorialStep).toBeNull()
  })

  it('advanceTutorial is a no-op when tutorial not running', () => {
    s().advanceTutorial()
    expect(s().tutorialStep).toBeNull()
  })

  it('resetView restores default orientation and scale', () => {
    s().rotateBy(2, 0.8)
    s().scaleBy(2)
    s().resetView()
    expect(s().modelYaw).toBe(0)
    expect(s().modelPitch).toBe(0)
    expect(s().modelScale).toBe(1)
  })

  it('toggleCheatSheet flips visibility', () => {
    const before = s().cheatSheet
    s().toggleCheatSheet()
    expect(s().cheatSheet).toBe(!before)
  })

  it('setCheatSheet is idempotent, unlike toggling', () => {
    s().setCheatSheet(false)
    s().setCheatSheet(false)
    expect(s().cheatSheet).toBe(false)
    s().setCheatSheet(true)
    expect(s().cheatSheet).toBe(true)
  })
})
