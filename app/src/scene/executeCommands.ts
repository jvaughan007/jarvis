import { PARTS } from '../model/heroParts'
import { useInteraction } from '../state/interactionStore'
import { describeUnknownTarget, resolveTarget, type SceneCommand } from './commands'

/**
 * Runs validated scene commands against the interaction store.
 *
 * Commands write to the same store hands and mouse write to, so voice is just
 * a third input rather than a parallel system. Nothing here throws: a command
 * that cannot run returns a reason, which goes back to Claude so it can correct
 * itself on the next turn.
 */

export interface CommandOutcome {
  action: string
  ok: boolean
  detail?: string
}

/** Ids Claude is allowed to target, and what they are — sent with every turn. */
export function sceneIndex(): { id: string; label: string; kind: string }[] {
  return PARTS.map((part) => ({
    id: part.id,
    label: part.label,
    kind: part.id === 'core' ? 'the brain at the centre' : 'a business system',
  }))
}

const PART_IDS = () => PARTS.map((p) => p.id)

/** Focus is a highlight plus a nudge apart, so the part is actually visible. */
function focusOn(id: string) {
  const store = useInteraction.getState()
  store.setHovered(id)
  if (store.targetExplode < 0.5) store.setTargetExplode(0.65)
}

export function executeCommands(commands: SceneCommand[]): CommandOutcome[] {
  const store = useInteraction.getState()
  const ids = PART_IDS()
  const outcomes: CommandOutcome[] = []

  for (const command of commands) {
    const needsTarget =
      command.action === 'camera.focus' ||
      command.action === 'part.highlight' ||
      command.action === 'part.pulse'

    let target: string | null = null
    if (needsTarget) {
      target = resolveTarget(command.target, ids)
      if (!target) {
        outcomes.push({
          action: command.action,
          ok: false,
          detail: describeUnknownTarget(command.target ?? '(nothing)', ids),
        })
        continue
      }
    }

    switch (command.action) {
      case 'camera.focus':
        focusOn(target!)
        break
      case 'camera.reset':
        store.resetView()
        store.setHovered(null)
        break
      case 'model.explode':
        store.setTargetExplode(1)
        break
      case 'model.assemble':
        store.setTargetExplode(0)
        store.setHovered(null)
        break
      case 'part.highlight':
        store.setHovered(target!)
        break
      case 'part.pulse':
        store.pulse(target!)
        break
      case 'clear.highlight':
        store.setHovered(null)
        break
    }

    outcomes.push({ action: command.action, ok: true, detail: target ?? undefined })
  }

  return outcomes
}
