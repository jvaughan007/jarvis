import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDatabase, type Db } from '../src/store/db.ts'
import { Run, guardsFromEnv, DEFAULT_GUARDS } from '../src/safety/guards.ts'
import { GuardError } from '../src/errors.ts'

let db: Db
let nextRunId: number
const now = () => new Date('2026-08-12T09:00:00Z')

beforeEach(() => {
  db = openDatabase(':memory:')
  nextRunId = 1
})

afterEach(() => db.close())

function run(config: Partial<typeof DEFAULT_GUARDS> = {}, files: string[] = []) {
  return new Run(
    db,
    { id: `run-${nextRunId++}`, agent: 'LEDGER', kind: 'publish' },
    config,
    { now, fileExists: (path) => files.includes(path) },
  )
}

describe('defaults', () => {
  it('is a dry run unless told otherwise', () => {
    expect(DEFAULT_GUARDS.dryRun).toBe(true)
  })

  it('refuses to write', () => {
    expect(() => run().checkWriteAllowed('printify.publish')).toThrow(GuardError)
    expect(() => run().checkWriteAllowed('printify.publish')).toThrow(/Dry run/)
  })
})

describe('the write budget', () => {
  it('allows writes up to the cap', () => {
    const subject = run({ dryRun: false, maxWritesPerRun: 3 })

    for (let i = 0; i < 3; i++) {
      subject.checkWriteAllowed('printify.publish')
      subject.recordWrite()
    }

    expect(subject.writesRemaining).toBe(0)
  })

  it('refuses the one past the cap', () => {
    const subject = run({ dryRun: false, maxWritesPerRun: 2 })

    subject.checkWriteAllowed('printify.publish')
    subject.recordWrite()
    subject.checkWriteAllowed('printify.publish')
    subject.recordWrite()

    expect(() => subject.checkWriteAllowed('printify.publish')).toThrow(/budget of 2 writes/)
  })

  it('records usage where a later run can see it', () => {
    const subject = run({ dryRun: false })
    subject.recordWrite()

    expect(db.get<{ writes_used: number }>('SELECT writes_used FROM runs WHERE id = ?', ['run-1']))
      .toEqual({ writes_used: 1 })
  })
})

describe('the kill switch', () => {
  it('outranks everything, including a live run with budget left', () => {
    const subject = run({ dryRun: false, killSwitchPath: '/tmp/stop' }, ['/tmp/stop'])

    expect(() => subject.checkWriteAllowed('printify.publish')).toThrow(/Kill switch/)
  })

  it('lets writes through once the file is gone', () => {
    const subject = run({ dryRun: false, killSwitchPath: '/tmp/stop' }, [])

    expect(() => subject.checkWriteAllowed('printify.publish')).not.toThrow()
  })
})

describe('the error budget', () => {
  it('stops writing before the provider throttles us', () => {
    const subject = run({ dryRun: false })

    expect(() => subject.checkWriteAllowed('printify.publish', 0.08)).toThrow(/exceeds the 5% budget/)
  })

  it('permits an error rate at the line', () => {
    const subject = run({ dryRun: false })

    expect(() => subject.checkWriteAllowed('printify.publish', 0.05)).not.toThrow()
  })
})

describe('run bookkeeping', () => {
  it('opens as running and closes with its outcome', () => {
    const subject = run()
    expect(db.get<{ state: string }>('SELECT state FROM runs WHERE id = ?', ['run-1'])?.state).toBe(
      'running',
    )

    subject.finish('succeeded', 'nothing to do')

    const row = db.get<{ state: string; note: string; ended_at: string }>(
      'SELECT state, note, ended_at FROM runs WHERE id = ?',
      ['run-1'],
    )
    expect(row?.state).toBe('succeeded')
    expect(row?.note).toBe('nothing to do')
    expect(row?.ended_at).not.toBeNull()
  })
})

describe('configuration from the environment', () => {
  it('stays in dry run when nothing is set', () => {
    expect(guardsFromEnv({}).dryRun).toBe(true)
  })

  it('goes live only on an exact opt-in', () => {
    expect(guardsFromEnv({ FACTORY_LIVE: 'true' }).dryRun).toBe(true)
    expect(guardsFromEnv({ FACTORY_LIVE: 'yes' }).dryRun).toBe(true)
    expect(guardsFromEnv({ FACTORY_LIVE: '1' }).dryRun).toBe(false)
  })

  it('ignores a nonsensical write cap rather than widening it', () => {
    expect(guardsFromEnv({ FACTORY_MAX_WRITES: '0' }).maxWritesPerRun).toBe(10)
    expect(guardsFromEnv({ FACTORY_MAX_WRITES: 'lots' }).maxWritesPerRun).toBe(10)
    expect(guardsFromEnv({ FACTORY_MAX_WRITES: '-5' }).maxWritesPerRun).toBe(10)
    expect(guardsFromEnv({ FACTORY_MAX_WRITES: '3' }).maxWritesPerRun).toBe(3)
  })
})
