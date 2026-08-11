import type { Landmark } from './detect'

/**
 * Synthetic 21-point hands in MediaPipe normalized image coordinates.
 * Index order is MediaPipe's: 0 wrist, 1-4 thumb, 5-8 index, 9-12 middle,
 * 13-16 ring, 17-20 pinky. Lower y = higher on screen, so an extended
 * finger has tips at smaller y than its knuckles.
 */
const p = (x: number, y: number, z = 0): Landmark => ({ x, y, z })

/** Fingers extended, thumb out to the side. */
export const OPEN_HAND: Landmark[] = [
  p(0.5, 0.9), // 0 wrist
  p(0.42, 0.86), p(0.36, 0.81), p(0.31, 0.76), p(0.27, 0.72), // thumb 1-4
  p(0.46, 0.72), p(0.45, 0.62), p(0.44, 0.55), p(0.44, 0.48), // index 5-8
  p(0.5, 0.7), p(0.5, 0.59), p(0.5, 0.51), p(0.5, 0.44), // middle 9-12
  p(0.55, 0.71), p(0.56, 0.61), p(0.57, 0.54), p(0.57, 0.47), // ring 13-16
  p(0.6, 0.74), p(0.62, 0.66), p(0.63, 0.6), p(0.64, 0.55), // pinky 17-20
]

/** All fingers curled: tips sit closer to the wrist than their PIP joints. */
export const FIST_HAND: Landmark[] = [
  p(0.5, 0.9), // 0 wrist
  p(0.43, 0.86), p(0.39, 0.82), p(0.4, 0.79), p(0.43, 0.78), // thumb
  p(0.46, 0.74), p(0.45, 0.68), p(0.46, 0.74), p(0.47, 0.78), // index (tip curled back)
  p(0.5, 0.72), p(0.5, 0.66), p(0.5, 0.73), p(0.5, 0.78), // middle
  p(0.55, 0.73), p(0.56, 0.67), p(0.55, 0.74), p(0.54, 0.79), // ring
  p(0.6, 0.76), p(0.61, 0.7), p(0.6, 0.76), p(0.59, 0.8), // pinky
]

/** Thumb tip and index tip meeting; middle/ring/pinky stay extended. */
export const PINCH_HAND: Landmark[] = [
  p(0.5, 0.9), // 0 wrist
  p(0.44, 0.85), p(0.42, 0.78), p(0.44, 0.72), p(0.47, 0.67), // thumb → tip at (0.47, 0.67)
  p(0.46, 0.72), p(0.45, 0.64), p(0.46, 0.66), p(0.475, 0.675), // index → tip meets thumb
  p(0.5, 0.7), p(0.5, 0.59), p(0.5, 0.51), p(0.5, 0.44), // middle extended
  p(0.55, 0.71), p(0.56, 0.61), p(0.57, 0.54), p(0.57, 0.47), // ring extended
  p(0.6, 0.74), p(0.62, 0.66), p(0.63, 0.6), p(0.64, 0.55), // pinky extended
]
