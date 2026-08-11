import { useCallback, useEffect, useRef } from 'react'
import { PARTS } from '../model/heroParts'
import { useInteraction } from '../state/interactionStore'

const SATELLITES = PARTS.filter((p) => p.id !== 'core')
const HIGHLIGHT_MS = 2400

/**
 * A hands-free scripted run of the whole demo. This exists for the worst case:
 * no camera, bad lighting, or a prospect who wants to just watch. It pulls the
 * model apart, walks each subsystem, then puts it back together.
 *
 * Any other input cancels it — the tour must never fight a live demo.
 */
export function useDemoTour() {
  const timers = useRef<number[]>([])

  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const store = useInteraction.getState()
    if (store.demoBanner) {
      store.setDemoBanner(null)
      store.setHovered(null)
    }
  }, [])

  const start = useCallback(() => {
    cancel()
    const store = useInteraction.getState()
    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms))
    }

    store.setDemoBanner('Auto tour — press any key or move a hand to take over')
    store.resetView()
    store.setTargetExplode(1)

    let t = 1200
    for (const part of SATELLITES) {
      const id = part.id
      at(t, () => useInteraction.getState().setHovered(id))
      t += HIGHLIGHT_MS
    }

    at(t, () => {
      const s = useInteraction.getState()
      s.setHovered(null)
      s.setTargetExplode(0)
    })
    at(t + 1800, () => {
      useInteraction.getState().setDemoBanner(null)
      timers.current = []
    })
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { start, cancel }
}
