export type Landmark = { x: number; y: number; z: number }

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_MCP = 9

/** Fingertip / PIP pairs for index, middle, ring, pinky. */
const FINGERS: ReadonlyArray<readonly [tip: number, pip: number]> = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
]

/** 2D distance — MediaPipe z is unreliable, so gesture math stays in image space. */
function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Wrist-to-middle-knuckle span: the hand's own ruler, used to normalize everything else. */
export function handScale(lm: Landmark[]): number {
  return dist(lm[WRIST], lm[MIDDLE_MCP])
}

/** Thumb-tip to index-tip distance in hand-widths. Small = pinching. */
export function pinchRatio(lm: Landmark[]): number {
  const scale = handScale(lm)
  if (scale === 0) return Infinity
  return dist(lm[THUMB_TIP], lm[INDEX_TIP]) / scale
}

/** Every finger extended: each tip sits at least 15% farther from the wrist than its PIP. */
export function isPalmOpen(lm: Landmark[]): boolean {
  return FINGERS.every(([tip, pip]) => dist(lm[tip], lm[WRIST]) > dist(lm[pip], lm[WRIST]) * 1.15)
}

/** Every finger curled: each tip has fallen back inside its PIP joint. */
export function isFist(lm: Landmark[]): boolean {
  return FINGERS.every(([tip, pip]) => dist(lm[tip], lm[WRIST]) < dist(lm[pip], lm[WRIST]))
}

/** Palm center proxy — steadier than a fingertip, so the cursor doesn't swim. */
export function cursorPoint(lm: Landmark[]): Landmark {
  return lm[MIDDLE_MCP]
}

/** Apparent hand size stands in for depth: a bigger hand is a nearer hand. */
export function depthProxy(lm: Landmark[]): number {
  return handScale(lm)
}
