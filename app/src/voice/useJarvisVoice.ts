import { useCallback, useEffect, useRef, useState } from 'react'
import { parseCommands } from '../scene/commands'
import { executeCommands, sceneIndex } from '../scene/executeCommands'
import { SentenceChunker } from './sentenceChunker'
import {
  SpeechQueue,
  getRecognitionCtor,
  speechSupported,
  synthesisSupported,
  type SpeechRecognitionLike,
} from './speech'

/**
 * The full conversation loop: listen, think, speak, move the scene.
 *
 * Runs half-duplex on purpose — the microphone is off while Jarvis talks.
 * Full duplex means the recogniser transcribes Jarvis's own voice and the
 * conversation loops on itself, which is unrecoverable in front of a client.
 */

/** Silence after the last final result before we treat the turn as finished. */
const END_OF_UTTERANCE_MS = 900

export type VoiceState = 'off' | 'listening' | 'thinking' | 'speaking' | 'error'

interface Turn {
  role: 'user' | 'assistant'
  content: unknown
}

export function useJarvisVoice() {
  const [state, setState] = useState<VoiceState>('off')
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const speech = useRef<SpeechQueue | null>(null)
  const history = useRef<Turn[]>([])
  const abort = useRef<AbortController | null>(null)
  const endTimer = useRef<number | null>(null)
  const pending = useRef('')
  const wantsToListen = useRef(false)
  const busy = useRef(false)

  const stopListening = useCallback(() => {
    if (endTimer.current) window.clearTimeout(endTimer.current)
    endTimer.current = null
    try {
      recognition.current?.stop()
    } catch {
      // Already stopped — nothing to do.
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognition.current || busy.current) return
    try {
      recognition.current.start()
      setState('listening')
    } catch {
      // start() throws if it is already running; that is the state we want.
    }
  }, [])

  /** Send one turn and stream the reply into speech and scene motion. */
  const ask = useCallback(
    async (utterance: string) => {
      busy.current = true
      stopListening()
      setState('thinking')
      setReply('')

      const queue = speech.current!
      queue.resume()

      history.current.push({ role: 'user', content: utterance })

      const chunker = new SentenceChunker((sentence) => {
        setState('speaking')
        queue.say(sentence)
      })

      abort.current = new AbortController()

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.current, sceneIndex: sceneIndex() }),
          signal: abort.current.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`Brain returned ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''

          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data: '))
            if (!line) continue
            const event = JSON.parse(line.slice(6))

            if (event.type === 'text') {
              chunker.push(event.text)
              setReply((r) => r + event.text)
            } else if (event.type === 'commands') {
              const parsed = parseCommands({ commands: event.commands })
              if (parsed.ok) executeCommands(parsed.commands)
              else console.warn('[jarvis] rejected commands:', parsed.error)
            } else if (event.type === 'done') {
              history.current.push({ role: 'assistant', content: event.content })
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          }
        }

        chunker.flush()
      } catch (err) {
        chunker.reset()
        if ((err as Error).name !== 'AbortError') {
          console.warn('[jarvis] turn failed:', err)
          setError((err as Error).message)
          setState('error')
          busy.current = false
          return
        }
      }

      // Hand the microphone back once the last sentence finishes.
      const release = () => {
        busy.current = false
        if (wantsToListen.current) startListening()
        else setState('off')
      }
      if (queue.isSpeaking) queue.onIdleOnce(release)
      else release()
    },
    [startListening, stopListening],
  )

  const start = useCallback(() => {
    if (!speechSupported()) {
      setError('Speech recognition needs Chrome. Everything else works without it.')
      setState('error')
      return
    }

    speech.current ??= new SpeechQueue()

    const Recognition = getRecognitionCtor()!
    const rec = new Recognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) pending.current += text
        else interim += text
      }
      setTranscript((pending.current + interim).trim())

      if (endTimer.current) window.clearTimeout(endTimer.current)
      if (pending.current.trim()) {
        endTimer.current = window.setTimeout(() => {
          const utterance = pending.current.trim()
          pending.current = ''
          setTranscript('')
          if (utterance) void ask(utterance)
        }, END_OF_UTTERANCE_MS)
      }
    }

    rec.onerror = (event) => {
      // 'no-speech' and 'aborted' are routine; anything else is worth showing.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(
          event.error === 'not-allowed'
            ? 'Microphone permission denied. Allow it in the address bar.'
            : `Microphone error: ${event.error}`,
        )
        setState('error')
      }
    }

    rec.onend = () => {
      // Chrome ends the session on silence; restart unless we stopped on purpose.
      if (wantsToListen.current && !busy.current) startListening()
    }

    recognition.current = rec
    wantsToListen.current = true
    setError(null)
    startListening()
  }, [ask, startListening])

  const stop = useCallback(() => {
    wantsToListen.current = false
    busy.current = false
    abort.current?.abort()
    speech.current?.cancel()
    stopListening()
    recognition.current = null
    pending.current = ''
    setTranscript('')
    setState('off')
  }, [stopListening])

  /** Cut Jarvis off mid-sentence and go straight back to listening. */
  const interrupt = useCallback(() => {
    abort.current?.abort()
    speech.current?.cancel()
    busy.current = false
    if (wantsToListen.current) startListening()
    else setState('off')
  }, [startListening])

  useEffect(() => stop, [stop])

  return {
    state,
    transcript,
    reply,
    error,
    start,
    stop,
    interrupt,
    supported: speechSupported() && synthesisSupported(),
  }
}
