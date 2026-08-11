import * as THREE from 'three'
import type { Landmark } from '../gestures/detect'
import type { GestureEvent } from '../gestures/stateMachine'

/**
 * Per-frame hand data lives here rather than in React state on purpose: this
 * updates 30-60x/second and re-rendering the tree that often would tank the
 * frame rate. Scene components read it inside useFrame instead.
 */
export interface HandFrame {
  /** Smoothed landmarks in MediaPipe normalized image space, or null if untracked. */
  landmarks: Landmark[] | null
  /** Where this hand points in world space, on the model's working plane. */
  cursor3D: THREE.Vector3
  pinching: boolean
  fisting: boolean
  /** 0 (fingers apart) → 1 (fully pinched); drives the cursor's strength ring. */
  pinchStrength: number
}

const makeFrame = (): HandFrame => ({
  landmarks: null,
  cursor3D: new THREE.Vector3(),
  pinching: false,
  fisting: false,
  pinchStrength: 0,
})

export const handFrames: [HandFrame, HandFrame] = [makeFrame(), makeFrame()]

/** Gesture transitions are broadcast here so any layer can subscribe without prop drilling. */
export const gestureBus = new EventTarget()

export function emitGesture(event: GestureEvent) {
  gestureBus.dispatchEvent(new CustomEvent('gesture', { detail: event }))
}

export type TrackingState = 'off' | 'starting' | 'on' | 'error'

/**
 * Tracking health, readable from anywhere. A failure here must never break the
 * demo — it downgrades to mouse control and says so on screen.
 */
export const trackingStatus: { state: TrackingState; message: string | null; fps: number } = {
  state: 'off',
  message: null,
  fps: 0,
}

export function anyHandTracked(): boolean {
  return handFrames[0].landmarks !== null || handFrames[1].landmarks !== null
}
