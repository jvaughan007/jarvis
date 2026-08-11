import { useInteraction } from '../state/interactionStore'
import { TUTORIAL_STEPS } from '../tutorial/steps'

/**
 * Always-available reminder of the four moves. Shown by default for the first
 * few sessions, then hidden — but one keypress (H) or button click away, because
 * the person driving might be a prospect who has never seen this before.
 */
export default function CheatSheet() {
  const visible = useInteraction((s) => s.cheatSheet)
  const tutorialStep = useInteraction((s) => s.tutorialStep)

  // The tutorial teaches these one at a time; showing the whole list would spoil it.
  if (!visible || tutorialStep !== null) return null

  return (
    <div className="cheat-sheet" aria-label="Gesture controls">
      {TUTORIAL_STEPS.map((step) => (
        <div className="cheat-row" key={step.id}>
          <span className="cheat-icon">{step.icon}</span>
          <span className="cheat-labels">
            <span className="cheat-name">{step.title}</span>
            <span className="cheat-mouse">{step.mouseHint.replace(/^Mouse: /, '')}</span>
          </span>
        </div>
      ))}
      <div className="cheat-footer">H to hide</div>
    </div>
  )
}
