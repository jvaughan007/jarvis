import * as THREE from 'three'
import { emitGesture, handFrames, trackingStatus } from './input/handFrames'
import { useInteraction } from './state/interactionStore'
import { explodeRef, grabTarget, partWorldPos } from './scene/HeroModel'
import type { GestureEvent } from './gestures/stateMachine'
import { OPEN_HAND, PINCH_HAND } from './gestures/fixtures'

/**
 * Dev-only console handle (`window.__jarvis`). Two jobs:
 *  - Before a demo, Josh can check tracking health from the console.
 *  - Automated checks can drive gestures without a camera, so the interaction
 *    logic is verifiable in CI-style runs where no hands exist.
 *
 * Never bundled in production builds.
 */
export function installDevtools() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return

  const simulate = {
    /** Pretend a hand appeared at a world position, optionally pinching. */
    hand(index: 0 | 1, worldPos: [number, number, number], opts: { pinch?: boolean } = {}) {
      const frame = handFrames[index]
      frame.landmarks = (opts.pinch ? PINCH_HAND : OPEN_HAND).map((l) => ({ ...l }))
      frame.cursor3D.set(...worldPos)
      frame.pinching = !!opts.pinch
      frame.pinchStrength = opts.pinch ? 1 : 0
      return frame
    },
    move(index: 0 | 1, worldPos: [number, number, number]) {
      handFrames[index].cursor3D.set(...worldPos)
    },
    lose(index: 0 | 1) {
      handFrames[index].landmarks = null
      handFrames[index].pinching = false
      handFrames[index].fisting = false
    },
    fist(index: 0 | 1, on: boolean) {
      handFrames[index].fisting = on
    },
    gesture(event: GestureEvent) {
      emitGesture(event)
    },
    reset() {
      simulate.lose(0)
      simulate.lose(1)
      grabTarget.pos = null
      const st = useInteraction.getState()
      st.release()
      st.setHovered(null)
      st.setTargetExplode(0)
      st.resetView()
    },
  }

  const handle = {
    store: useInteraction,
    frames: handFrames,
    status: trackingStatus,
    partWorldPos,
    grabTarget,
    explode: explodeRef,
    simulate,
    THREE,
  }

  Object.assign((window.__jarvis ??= {}), handle)
}

declare global {
  interface Window {
    __jarvis?: Record<string, unknown>
  }
}
