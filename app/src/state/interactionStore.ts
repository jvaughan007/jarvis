import { create } from 'zustand'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export interface InteractionState {
  targetExplode: number
  grabbed: { partId: string; hand: number } | null
  hoveredPartId: string | null
  modelYaw: number
  modelPitch: number
  modelScale: number
  tutorialStep: number | null
  cheatSheet: boolean
  demoBanner: string | null
  /** A brief flash on one part — how Jarvis points at something while talking. */
  pulsed: { partId: string; at: number } | null
  setTargetExplode(v: number): void
  grab(partId: string, hand: number): void
  release(): void
  setHovered(id: string | null): void
  rotateBy(dYaw: number, dPitch: number): void
  scaleBy(f: number): void
  startTutorial(): void
  advanceTutorial(): void
  endTutorial(): void
  toggleCheatSheet(): void
  setCheatSheet(visible: boolean): void
  setDemoBanner(msg: string | null): void
  pulse(partId: string): void
  /** Return the model to its default orientation and size. */
  resetView(): void
}

export const useInteraction = create<InteractionState>()((set, get) => ({
  targetExplode: 0,
  grabbed: null,
  hoveredPartId: null,
  modelYaw: 0,
  modelPitch: 0,
  modelScale: 1,
  tutorialStep: null,
  cheatSheet: true,
  demoBanner: null,
  pulsed: null,

  setTargetExplode: (v) => set({ targetExplode: clamp(v, 0, 1) }),
  grab: (partId, hand) => {
    if (get().grabbed) return
    set({ grabbed: { partId, hand } })
  },
  release: () => set({ grabbed: null }),
  setHovered: (id) => set({ hoveredPartId: id }),
  rotateBy: (dYaw, dPitch) =>
    set((st) => ({
      modelYaw: st.modelYaw + dYaw,
      modelPitch: clamp(st.modelPitch + dPitch, -1.2, 1.2),
    })),
  scaleBy: (f) => set((st) => ({ modelScale: clamp(st.modelScale * f, 0.5, 2.5) })),
  startTutorial: () => set({ tutorialStep: 0 }),
  advanceTutorial: () =>
    set((st) => (st.tutorialStep === null ? {} : { tutorialStep: st.tutorialStep + 1 })),
  endTutorial: () => set({ tutorialStep: null }),
  toggleCheatSheet: () => set((st) => ({ cheatSheet: !st.cheatSheet })),
  setCheatSheet: (visible) => set({ cheatSheet: visible }),
  setDemoBanner: (msg) => set({ demoBanner: msg }),
  pulse: (partId) => set({ pulsed: { partId, at: performance.now() } }),
  resetView: () => set({ modelYaw: 0, modelPitch: 0, modelScale: 1 }),
}))
