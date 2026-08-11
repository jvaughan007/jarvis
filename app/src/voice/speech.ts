/**
 * Thin wrappers over the browser's speech APIs.
 *
 * Both are Chrome-first and quirky, so the workarounds live here rather than
 * leaking into the conversation logic.
 */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

export interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >
}

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = () => getRecognitionCtor() !== null
export const synthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Speaks sentences one at a time, in order.
 *
 * Queuing whole sentences rather than a whole reply is deliberate: Chrome
 * silently stops a single utterance after ~15 seconds, and short utterances
 * also let speech start while the reply is still being generated.
 */
export class SpeechQueue {
  private queue: string[] = []
  private speaking = false
  private cancelled = false
  private voice: SpeechSynthesisVoice | null = null
  private idleCallbacks: (() => void)[] = []

  constructor() {
    if (synthesisSupported()) this.pickVoice()
  }

  /**
   * Run once when the queue next finishes speaking. This is how the microphone
   * gets handed back — reopening it any earlier means Jarvis hears itself.
   */
  onIdleOnce(callback: () => void): void {
    if (!this.speaking) {
      callback()
      return
    }
    this.idleCallbacks.push(callback)
  }

  private pickVoice() {
    const choose = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      // Prefer a natural-sounding English voice; fall back to whatever exists.
      this.voice =
        voices.find((v) => /en-(US|GB)/i.test(v.lang) && /natural|premium|enhanced/i.test(v.name)) ??
        voices.find((v) => /en-US/i.test(v.lang)) ??
        voices[0]
    }
    choose()
    // getVoices() is empty until this fires on first load.
    window.speechSynthesis.addEventListener('voiceschanged', choose, { once: true })
  }

  say(sentence: string): void {
    if (!synthesisSupported() || this.cancelled) return
    this.queue.push(sentence)
    if (!this.speaking) this.next()
  }

  private next(): void {
    const sentence = this.queue.shift()
    if (sentence === undefined) {
      this.speaking = false
      const callbacks = this.idleCallbacks
      this.idleCallbacks = []
      for (const callback of callbacks) callback()
      return
    }

    this.speaking = true
    const utterance = new SpeechSynthesisUtterance(sentence)
    if (this.voice) utterance.voice = this.voice
    utterance.rate = 1.05
    utterance.pitch = 1

    let advanced = false
    const advance = () => {
      if (advanced) return
      advanced = true
      this.next()
    }
    utterance.onend = advance
    utterance.onerror = advance
    // Watchdog: if an utterance never fires 'end' (a known Chrome failure),
    // move on anyway rather than leaving Jarvis mute for the rest of the demo.
    const watchdog = window.setTimeout(advance, 3000 + sentence.length * 90)
    const clear = () => window.clearTimeout(watchdog)
    utterance.addEventListener('end', clear)
    utterance.addEventListener('error', clear)

    window.speechSynthesis.speak(utterance)
  }

  /** Stop immediately and drop anything pending — used on interruption. */
  cancel(): void {
    this.cancelled = true
    this.queue = []
    this.speaking = false
    this.idleCallbacks = []
    if (synthesisSupported()) window.speechSynthesis.cancel()
  }

  /** Re-arm after a cancel so the next turn can speak. */
  resume(): void {
    this.cancelled = false
  }

  get isSpeaking(): boolean {
    return this.speaking
  }
}
