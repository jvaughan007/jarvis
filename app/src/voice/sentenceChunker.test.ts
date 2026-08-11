import { describe, expect, it } from 'vitest'
import { SentenceChunker } from './sentenceChunker'

/** Collect every sentence a chunker emits for a sequence of token deltas. */
function feed(deltas: string[], { flush = true } = {}): string[] {
  const out: string[] = []
  const chunker = new SentenceChunker((s) => out.push(s))
  for (const d of deltas) chunker.push(d)
  if (flush) chunker.flush()
  return out
}

describe('SentenceChunker', () => {
  it('emits a sentence as soon as it completes, before the rest arrives', () => {
    const out: string[] = []
    const chunker = new SentenceChunker((s) => out.push(s))
    chunker.push('This is the email agent. ')
    expect(out).toEqual(['This is the email agent.'])
    chunker.push('It handles the inbox.')
    expect(out).toEqual(['This is the email agent.'])
    chunker.flush()
    expect(out).toEqual(['This is the email agent.', 'It handles the inbox.'])
  })

  it('reassembles sentences split across arbitrary token boundaries', () => {
    expect(feed(['Hel', 'lo the', 're. How ', 'are you?'])).toEqual([
      'Hello there.',
      'How are you?',
    ])
  })

  it('handles all sentence terminators', () => {
    expect(feed(['Stop. ', 'Wait! ', 'Really? ', 'Well…  '])).toEqual([
      'Stop.',
      'Wait!',
      'Really?',
      'Well…',
    ])
  })

  it('treats a newline as a break so lists still get spoken', () => {
    expect(feed(['First thing\n', 'second thing'])).toEqual(['First thing', 'second thing'])
  })

  it('does not split on a decimal point', () => {
    expect(feed(['It costs 1.5 million dollars.'])).toEqual(['It costs 1.5 million dollars.'])
  })

  it('does not split on common abbreviations', () => {
    expect(feed(['Dr. Smith runs it.'])).toEqual(['Dr. Smith runs it.'])
    expect(feed(['Josh works with e.g. plumbers.'])).toEqual(['Josh works with e.g. plumbers.'])
  })

  it('keeps a closing quote or bracket with its sentence', () => {
    expect(feed(['He said "yes." ', 'Then left.'])).toEqual(['He said "yes."', 'Then left.'])
  })

  it('emits nothing for whitespace-only input', () => {
    expect(feed(['   ', '\n', '  '])).toEqual([])
  })

  it('flush emits a trailing fragment that never got punctuation', () => {
    expect(feed(['No terminator here'])).toEqual(['No terminator here'])
  })

  it('flush is idempotent and does not re-emit', () => {
    const out: string[] = []
    const chunker = new SentenceChunker((s) => out.push(s))
    chunker.push('Only once')
    chunker.flush()
    chunker.flush()
    expect(out).toEqual(['Only once'])
  })

  it('reset discards buffered text so an interrupted turn is not spoken later', () => {
    const out: string[] = []
    const chunker = new SentenceChunker((s) => out.push(s))
    chunker.push('Half a sen')
    chunker.reset()
    chunker.flush()
    expect(out).toEqual([])
  })
})
