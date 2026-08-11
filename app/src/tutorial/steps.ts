import type { GestureEvent } from '../gestures/stateMachine'
import type { HandFrame } from '../input/handFrames'

export interface TutorialStep {
  id: string
  title: string
  instruction: string
  /** Glyph shown large on the tutorial card and in the cheat sheet. */
  icon: string
  /** What the same move looks like without a camera. */
  mouseHint: string
  /**
   * True once the user has actually performed the move. Checked against both
   * fresh gesture events and current hand state, so a gesture already being
   * held (a fist, two pinches) counts without waiting for a new transition.
   */
  passes(events: GestureEvent[], frames: [HandFrame, HandFrame]): boolean
}

/**
 * Calibration Mode: four moves, taught one at a time, each confirmed by the
 * camera before moving on. Copy is deliberately plain — no references to films
 * or characters — because most people meeting this have never used a
 * gesture interface and shouldn't need to get a joke to follow along.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'grab',
    title: 'Grab',
    instruction:
      'Hold your hand up to the camera, then pinch your thumb and index finger together — like picking up a grain of rice.',
    icon: '🤏',
    mouseHint: 'Mouse: click and drag a piece',
    passes: (events) => events.some((e) => e.type === 'pinchStart'),
  },
  {
    id: 'drop',
    title: 'Drop',
    instruction: 'Now open your hand flat, fingers spread, to let go of whatever you are holding.',
    icon: '✋',
    mouseHint: 'Mouse: release the button',
    passes: (events) => events.some((e) => e.type === 'palmOpen'),
  },
  {
    id: 'spin',
    title: 'Spin',
    instruction: 'Make a fist and hold it. Move your fist side to side to turn the whole model.',
    icon: '✊',
    mouseHint: 'Mouse: drag the empty space around the model',
    passes: (events, frames) =>
      events.some((e) => e.type === 'fistStart') ||
      frames.some((f) => f.landmarks !== null && f.fisting),
  },
  {
    id: 'pullApart',
    title: 'Pull apart',
    instruction:
      'Last one. Pinch with both hands at the same time, then pull your hands apart to open the model up.',
    icon: '🤲',
    mouseHint: 'Mouse: use the Pull apart button',
    passes: (_events, frames) =>
      frames.every((f) => f.landmarks !== null && f.pinching),
  },
]

export const TUTORIAL_DONE_KEY = 'jarvis.tutorialDone'
export const SESSION_COUNT_KEY = 'jarvis.sessionCount'
