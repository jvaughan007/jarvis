/**
 * Splits a stream of token deltas into whole sentences.
 *
 * This is what makes Jarvis start talking about a second sooner: rather than
 * waiting for the full reply, each finished sentence is handed to the speech
 * synthesiser immediately. It also sidesteps a long-standing Chrome bug where
 * a single utterance over ~15 seconds simply stops mid-word.
 */

/** Words that end in a period without ending the sentence. */
const ABBREVIATIONS = [
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'inc',
  'ltd',
  'co',
  'approx',
  'e.g',
  'i.e',
  'a.m',
  'p.m',
]

/** Terminator, optional closing quote/bracket, then whitespace — or a newline. */
const BREAK = /([.!?…]["'”’)\]]*\s|\n)/

function endsWithAbbreviation(text: string): boolean {
  const match = text.match(/([A-Za-z.]+)\.\s*$/)
  if (!match) return false
  return ABBREVIATIONS.includes(match[1].toLowerCase().replace(/\.$/, ''))
}

/** A period between two digits is a decimal, not a full stop. */
function isDecimalPoint(text: string, index: number): boolean {
  return /\d/.test(text[index - 1] ?? '') && /\d/.test(text[index + 1] ?? '')
}

export class SentenceChunker {
  private buffer = ''

  constructor(private readonly onSentence: (sentence: string) => void) {}

  /** Feed one token delta. Emits every sentence that completed. */
  push(delta: string): void {
    this.buffer += delta

    for (;;) {
      const match = this.buffer.match(BREAK)
      if (!match || match.index === undefined) break

      const end = match.index + match[0].length
      const candidate = this.buffer.slice(0, end)

      if (isDecimalPoint(this.buffer, match.index) || endsWithAbbreviation(candidate)) {
        // Not a real break — look for the next one past this point.
        const rest = this.buffer.slice(end)
        const next = rest.match(BREAK)
        if (!next || next.index === undefined) break
        const nextEnd = end + next.index + next[0].length
        this.emit(this.buffer.slice(0, nextEnd))
        this.buffer = this.buffer.slice(nextEnd)
        continue
      }

      this.emit(candidate)
      this.buffer = this.buffer.slice(end)
    }
  }

  /** Emit whatever is left, for replies that end without punctuation. */
  flush(): void {
    const remaining = this.buffer
    this.buffer = ''
    this.emit(remaining)
  }

  /** Drop buffered text — used when the user interrupts and the turn is abandoned. */
  reset(): void {
    this.buffer = ''
  }

  private emit(text: string): void {
    const trimmed = text.trim()
    if (trimmed) this.onSentence(trimmed)
  }
}
