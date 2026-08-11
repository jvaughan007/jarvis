import { isFist, isPalmOpen, pinchRatio, type Landmark } from './detect'

export type GestureEvent =
  | { type: 'pinchStart'; hand: number }
  | { type: 'pinchEnd'; hand: number }
  | { type: 'fistStart'; hand: number }
  | { type: 'fistEnd'; hand: number }
  | { type: 'palmOpen'; hand: number }
  | { type: 'handLost'; hand: number }

/** Separate on/off thresholds so a hand hovering at the boundary doesn't flicker. */
export const PINCH_ON = 0.32
export const PINCH_OFF = 0.48
/** A fist must be held this long before it counts — stops pinches reading as fists. */
export const FIST_DWELL_MS = 150

interface HandState {
  present: boolean
  pinching: boolean
  fisting: boolean
  fistSince: number | null
  palmArmed: boolean
}

const freshHand = (): HandState => ({
  present: false,
  pinching: false,
  fisting: false,
  fistSince: null,
  palmArmed: true,
})

export class GestureTracker {
  private hands: [HandState, HandState] = [freshHand(), freshHand()]

  /**
   * Feed one frame of landmarks per hand (null = not tracked) and get back the
   * gesture transitions it caused. Losing a hand always releases whatever it held,
   * so a dropped track can never leave an object stuck to a phantom hand.
   */
  update(hands: (Landmark[] | null)[], tMs: number): GestureEvent[] {
    const events: GestureEvent[] = []

    for (let hand = 0; hand < 2; hand++) {
      const lm = hands[hand] ?? null
      const st = this.hands[hand]

      if (!lm) {
        if (st.pinching) events.push({ type: 'pinchEnd', hand })
        if (st.fisting) events.push({ type: 'fistEnd', hand })
        if (st.present) events.push({ type: 'handLost', hand })
        this.hands[hand] = freshHand()
        continue
      }

      st.present = true

      const ratio = pinchRatio(lm)
      if (!st.pinching && ratio < PINCH_ON) {
        st.pinching = true
        events.push({ type: 'pinchStart', hand })
      } else if (st.pinching && ratio > PINCH_OFF) {
        st.pinching = false
        events.push({ type: 'pinchEnd', hand })
      }

      const fistNow = isFist(lm)
      if (fistNow) {
        if (st.fistSince === null) st.fistSince = tMs
        if (!st.fisting && tMs - st.fistSince >= FIST_DWELL_MS) {
          st.fisting = true
          events.push({ type: 'fistStart', hand })
        }
      } else {
        st.fistSince = null
        if (st.fisting) {
          st.fisting = false
          events.push({ type: 'fistEnd', hand })
        }
      }

      const openNow = isPalmOpen(lm)
      if (openNow && st.palmArmed) {
        st.palmArmed = false
        events.push({ type: 'palmOpen', hand })
      } else if (!openNow) {
        st.palmArmed = true
      }
    }

    return events
  }

  isPinching(hand: number): boolean {
    return this.hands[hand].pinching
  }

  isFisting(hand: number): boolean {
    return this.hands[hand].fisting
  }
}
