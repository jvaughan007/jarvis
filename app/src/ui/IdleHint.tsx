import { useEffect, useState } from 'react'
import { anyHandTracked, gestureBus } from '../input/handFrames'
import { useInteraction } from '../state/interactionStore'

/** How long a visible-but-idle hand waits before we offer a nudge. */
const IDLE_MS = 5000

/**
 * If the camera can see a hand but nothing is happening, say what to do.
 * This is the failure mode that kills gesture demos: the user's hand is up,
 * the system sees it, and they have no idea what move to make.
 */
export default function IdleHint() {
  const [show, setShow] = useState(false)
  const tutorialStep = useInteraction((s) => s.tutorialStep)
  const grabbed = useInteraction((s) => s.grabbed)

  useEffect(() => {
    let lastActivity = performance.now()
    const onGesture = () => {
      lastActivity = performance.now()
      setShow(false)
    }
    gestureBus.addEventListener('gesture', onGesture)

    const tick = window.setInterval(() => {
      const idle = performance.now() - lastActivity > IDLE_MS
      setShow(idle && anyHandTracked())
    }, 500)

    return () => {
      gestureBus.removeEventListener('gesture', onGesture)
      clearInterval(tick)
    }
  }, [])

  if (!show || tutorialStep !== null || grabbed) return null

  return <div className="idle-hint">Pinch your thumb and finger together to grab a piece</div>
}
