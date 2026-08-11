import { useInteraction } from '../state/interactionStore'
import type { TrackingState } from '../input/handFrames'

interface Props {
  trackingState: TrackingState
  onStartHands: () => void
  onStopHands: () => void
  onDemoTour: () => void
}

/**
 * Mouse-reachable equivalent of every gesture, plus the demo controls.
 * Deliberately always visible: if the hands stop working mid-demo, the recovery
 * path has to be one visible click away, not a remembered keyboard shortcut.
 */
export default function ControlsBar({
  trackingState,
  onStartHands,
  onStopHands,
  onDemoTour,
}: Props) {
  const setTargetExplode = useInteraction((s) => s.setTargetExplode)
  const resetView = useInteraction((s) => s.resetView)
  const startTutorial = useInteraction((s) => s.startTutorial)
  const toggleCheatSheet = useInteraction((s) => s.toggleCheatSheet)

  const handsOn = trackingState === 'on'

  return (
    <div className="controls-bar">
      <button className="hud-button" onClick={() => setTargetExplode(1)}>
        Pull apart
      </button>
      <button className="hud-button" onClick={() => setTargetExplode(0)}>
        Assemble
      </button>
      <button className="hud-button" onClick={resetView}>
        Reset view
      </button>
      <span className="controls-divider" />
      <button className="hud-button" onClick={handsOn ? onStopHands : onStartHands}>
        {handsOn ? 'Stop hands' : trackingState === 'starting' ? 'Starting…' : 'Enable hands'}
      </button>
      <button className="hud-button" onClick={startTutorial}>
        Tutorial
      </button>
      <button className="hud-button" onClick={onDemoTour}>
        Auto tour
      </button>
      <button className="hud-button hud-button--icon" onClick={toggleCheatSheet} title="Show controls (H)">
        ?
      </button>
    </div>
  )
}
