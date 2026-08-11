/**
 * The hero object: a stylised "AI Agent System" — the thing Josh actually sells.
 * A brain core with the business systems an OpenClaw install wires into.
 *
 * Part ids are the address space the LLM uses in Phase 2 (scene_commands targets),
 * so they must stay stable and human-guessable.
 */
export interface PartDef {
  id: string
  label: string
  home: [number, number, number]
  color: string
  radius: number
}

export const PARTS: PartDef[] = [
  { id: 'core', label: 'Brain Core', home: [0, 0, 0], color: '#00eaff', radius: 0.55 },
  { id: 'email', label: 'Email Agent', home: [1.4, 0.5, 0], color: '#00eaff', radius: 0.28 },
  { id: 'calendar', label: 'Calendar', home: [-1.3, 0.7, 0.4], color: '#ffb347', radius: 0.26 },
  { id: 'files', label: 'Files', home: [0.9, -0.9, 0.6], color: '#00eaff', radius: 0.26 },
  { id: 'messaging', label: 'Messaging', home: [-1.0, -0.7, -0.6], color: '#ffb347', radius: 0.26 },
  { id: 'tasks', label: 'Tasks', home: [0.2, 1.2, -0.7], color: '#00eaff', radius: 0.24 },
]

export const PART_BY_ID: ReadonlyMap<string, PartDef> = new Map(PARTS.map((p) => [p.id, p]))
