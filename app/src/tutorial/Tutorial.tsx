import { useEffect, useRef, useState } from 'react'
import { gestureBus, handFrames, type TrackingState } from '../input/handFrames'
import type { GestureEvent } from '../gestures/stateMachine'
import { useInteraction } from '../state/interactionStore'
import { TUTORIAL_DONE_KEY, TUTORIAL_STEPS } from './steps'

/** How long the green "got it" confirmation shows before advancing. */
const CONFIRM_MS = 900

/**
 * Calibration Mode. Teaches the four gestures one at a time and only advances
 * when the camera actually sees the move — so finishing it proves the setup
 * works, and a first-time user (or a prospect handed the laptop) can learn the
 * whole interface without anyone explaining it.
 */
export default function Tutorial({
  trackingState,
  onEnableHands,
}: {
  trackingState: TrackingState
  onEnableHands: () => void
}) {
  const stepIndex = useInteraction((s) => s.tutorialStep)
  const advance = useInteraction((s) => s.advanceTutorial)
  const end = useInteraction((s) => s.endTutorial)
  const [confirmed, setConfirmed] = useState(false)
  const confirmTimer = useRef<number | null>(null)

  const step = stepIndex === null ? null : TUTORIAL_STEPS[stepIndex]

  // Finish (and remember) once the user gets past the last step.
  useEffect(() => {
    if (stepIndex !== null && stepIndex >= TUTORIAL_STEPS.length) {
      try {
        localStorage.setItem(TUTORIAL_DONE_KEY, '1')
      } catch {
        // Private browsing — the tutorial just offers itself again next time.
      }
      end()
    }
  }, [stepIndex, end])

  // Watch for the current step's move.
  useEffect(() => {
    if (!step) return
    setConfirmed(false)

    let done = false
    const pass = () => {
      if (done) return
      done = true
      setConfirmed(true)
      confirmTimer.current = window.setTimeout(() => {
        advance()
      }, CONFIRM_MS)
    }

    const onGesture = (e: Event) => {
      const event = (e as CustomEvent<GestureEvent>).detail
      if (step.passes([event], handFrames)) pass()
    }
    gestureBus.addEventListener('gesture', onGesture)

    // Some steps (held fist, both hands pinching) are states rather than events.
    const poll = window.setInterval(() => {
      if (step.passes([], handFrames)) pass()
    }, 120)

    return () => {
      gestureBus.removeEventListener('gesture', onGesture)
      clearInterval(poll)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [step, advance])

  if (!step || stepIndex === null) return null

  const needsCamera = trackingState !== 'on'

  return (
    <div className="tutorial">
      <div className={`tutorial-card ${confirmed ? 'tutorial-card--confirmed' : ''}`}>
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`tutorial-pip ${i < stepIndex ? 'is-done' : ''} ${i === stepIndex ? 'is-current' : ''}`}
            />
          ))}
          <span className="tutorial-count">
            Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
          </span>
        </div>

        <div className="tutorial-icon">{step.icon}</div>
        <h2 className="tutorial-title">{confirmed ? 'Got it' : step.title}</h2>
        <p className="tutorial-instruction">
          {confirmed ? 'Nice — that is exactly it.' : step.instruction}
        </p>

        {needsCamera && !confirmed && (
          <div className="tutorial-camera-note">
            <span>The camera is off, so nothing can confirm the move.</span>
            <button className="hud-button" onClick={onEnableHands}>
              Turn camera on
            </button>
          </div>
        )}

        <p className="tutorial-mouse-hint">{step.mouseHint}</p>

        <div className="tutorial-actions">
          <button className="hud-button" onClick={end}>
            Skip tutorial
          </button>
          <button className="hud-button" onClick={advance}>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
