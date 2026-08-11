import { useEffect } from 'react'
import SceneRoot from './scene/SceneRoot'
import HeroModel from './scene/HeroModel'
import HandCursor from './scene/HandCursor'
import PointerDrag from './scene/PointerDrag'
import HandPip from './input/HandPip'
import ControlsBar from './ui/ControlsBar'
import CheatSheet from './ui/CheatSheet'
import IdleHint from './ui/IdleHint'
import VoicePanel from './ui/VoicePanel'
import { useJarvisVoice } from './voice/useJarvisVoice'
import Tutorial from './tutorial/Tutorial'
import { useDemoTour } from './ui/useDemoTour'
import { useHandTracking } from './input/useHandTracking'
import { trackingStatus } from './input/handFrames'
import { useInteraction } from './state/interactionStore'
import { SESSION_COUNT_KEY, TUTORIAL_DONE_KEY } from './tutorial/steps'

/** The cheat sheet stays up by default for a new user's first few sessions. */
const CHEAT_SHEET_SESSIONS = 3

/**
 * Module-level so React StrictMode's double-invoked mount effect can't count the
 * same launch twice — otherwise the cheat sheet disappears after ~1.5 real sessions.
 */
let sessionCounted = false

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private browsing — preferences just don't persist. Not worth failing over.
  }
}

export default function App() {
  const setTargetExplode = useInteraction((s) => s.setTargetExplode)
  const toggleCheatSheet = useInteraction((s) => s.toggleCheatSheet)
  const startTutorial = useInteraction((s) => s.startTutorial)
  const demoBanner = useInteraction((s) => s.demoBanner)
  const { state, start, stop, video } = useHandTracking()
  const tour = useDemoTour()
  const voice = useJarvisVoice()

  // First run: offer the tutorial straight away, and keep the cheat sheet up
  // for the first few sessions while the moves are still unfamiliar.
  useEffect(() => {
    if (sessionCounted) return
    sessionCounted = true

    const sessions = Number(readLocal(SESSION_COUNT_KEY) ?? '0') + 1
    writeLocal(SESSION_COUNT_KEY, String(sessions))

    const store = useInteraction.getState()
    store.setCheatSheet(sessions <= CHEAT_SHEET_SESSIONS)
    if (!readLocal(TUTORIAL_DONE_KEY)) store.startTutorial()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Demo Mode: the keyboard path that works when everything else fails.
      switch (e.key) {
        case '1':
          tour.cancel()
          setTargetExplode(1)
          break
        case '2':
          tour.cancel()
          setTargetExplode(0)
          break
        case '3':
          tour.start()
          break
        case 'h':
        case 'H':
          toggleCheatSheet()
          break
        case 't':
        case 'T':
          tour.cancel()
          startTutorial()
          break
        case 'Escape':
          tour.cancel()
          useInteraction.getState().endTutorial()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTargetExplode, toggleCheatSheet, startTutorial, tour])

  return (
    <div id="app-root">
      <SceneRoot>
        <HeroModel />
        <HandCursor />
        <PointerDrag />
      </SceneRoot>

      <HandPip video={video} state={state} />
      <CheatSheet />
      <IdleHint />
      <Tutorial trackingState={state} onEnableHands={start} />

      <VoicePanel
        state={voice.state}
        transcript={voice.transcript}
        reply={voice.reply}
        error={voice.error}
        supported={voice.supported}
        onStart={voice.start}
        onStop={voice.stop}
        onInterrupt={voice.interrupt}
      />

      <ControlsBar
        trackingState={state}
        onStartHands={start}
        onStopHands={stop}
        onDemoTour={tour.start}
      />

      {demoBanner && <div className="demo-banner">{demoBanner}</div>}

      {state === 'error' && trackingStatus.message && (
        <div className="tracking-warning">{trackingStatus.message}</div>
      )}
    </div>
  )
}
