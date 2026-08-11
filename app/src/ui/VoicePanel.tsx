import type { VoiceState } from '../voice/useJarvisVoice'

const LABEL: Record<VoiceState, string> = {
  off: 'Voice off',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Voice unavailable',
}

interface Props {
  state: VoiceState
  transcript: string
  reply: string
  error: string | null
  supported: boolean
  onStart: () => void
  onStop: () => void
  onInterrupt: () => void
}

/**
 * The visible half of the voice loop.
 *
 * Showing the live transcript matters during a demo: when a prospect sees
 * their own words appear as they speak, the thing stops looking pre-recorded.
 */
export default function VoicePanel({
  state,
  transcript,
  reply,
  error,
  supported,
  onStart,
  onStop,
  onInterrupt,
}: Props) {
  const live = state === 'listening' || state === 'thinking' || state === 'speaking'

  return (
    <div className="voice-panel">
      {live && (
        <div className="voice-caption">
          {transcript && <p className="voice-you">{transcript}</p>}
          {reply && <p className="voice-jarvis">{reply}</p>}
          {!transcript && !reply && state === 'listening' && (
            <p className="voice-prompt">Ask Jarvis something…</p>
          )}
        </div>
      )}

      {error && <div className="voice-error">{error}</div>}

      <div className="voice-controls">
        <span className={`voice-status voice-status--${state}`}>
          <span className="voice-dot" />
          {LABEL[state]}
        </span>

        {!supported ? (
          <span className="voice-unsupported">Voice needs Chrome</span>
        ) : live ? (
          <>
            {state === 'speaking' && (
              <button className="hud-button" onClick={onInterrupt}>
                Stop talking
              </button>
            )}
            <button className="hud-button" onClick={onStop}>
              End voice
            </button>
          </>
        ) : (
          <button className="hud-button" onClick={onStart}>
            Start Jarvis
          </button>
        )}
      </div>
    </div>
  )
}
