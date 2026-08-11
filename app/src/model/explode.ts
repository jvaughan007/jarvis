export type Vec3 = [number, number, number]

/**
 * How far parts travel when fully exploded. Tuned so the open model — labels
 * included — still clears the controls bar and the cheat sheet at the default
 * camera distance. Bigger looks more dramatic but pushes pieces off screen.
 */
const DEFAULT_FACTOR = 1.15
/** The core sits at the origin, so it has no outward direction — lift it instead. */
const CORE_LIFT = 0.4

/**
 * Where a part sits at a given explode amount (0 = assembled, 1 = fully apart).
 * Parts travel radially outward from the model's centre, which reads as a
 * machine coming apart rather than pieces scattering at random.
 */
export function explodedPosition(home: Vec3, amount: number, factor = DEFAULT_FACTOR): Vec3 {
  const [x, y, z] = home
  const length = Math.hypot(x, y, z)

  if (length === 0) return [0, amount * CORE_LIFT, 0]

  const push = amount * factor
  return [x + (x / length) * push, y + (y / length) * push, z + (z / length) * push]
}
