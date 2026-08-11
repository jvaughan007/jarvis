import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { anyHandTracked, gestureBus, handFrames } from '../input/handFrames'
import type { GestureEvent } from '../gestures/stateMachine'
import { useInteraction } from '../state/interactionStore'
import { grabTarget, partWorldPos } from './HeroModel'

/** How close a cursor must be to a part to pick it up. */
const GRAB_RADIUS = 0.85
/** Hand travel (world units) mapped to a full 0→1 explode sweep. */
const PULL_APART_SPAN = 2.2
const CURSOR_COLOR = '#00eaff'
const GRAB_COLOR = '#ffb347'

interface OrbitLike {
  enabled: boolean
}

/** Nearest part to a point, or null if nothing is within reach. */
function nearestPart(point: THREE.Vector3, maxDist: number): string | null {
  let best: string | null = null
  let bestDist = maxDist
  for (const [id, pos] of partWorldPos) {
    const d = point.distanceTo(pos)
    if (d < bestDist) {
      bestDist = d
      best = id
    }
  }
  return best
}

/**
 * Turns tracked hands into scene actions:
 *   pinch      → grab the nearest part and carry it
 *   open palm  → let go of everything
 *   fist       → spin the whole model
 *   two pinches→ pull apart / push together (explode)
 *
 * Orbit controls are disabled whenever a hand is doing something, so the camera
 * doesn't fight the gesture.
 */
export default function HandCursor() {
  const controls = useThree((s) => s.controls) as OrbitLike | null
  const cursors = useRef<(THREE.Group | null)[]>([])
  const rings = useRef<(THREE.Mesh | null)[]>([])

  /** Offset from cursor to part at the moment of grabbing, so it doesn't snap to centre. */
  const grabOffset = useMemo(() => new THREE.Vector3(), [])
  const dragPoint = useMemo(() => new THREE.Vector3(), [])
  /** Fist-spin bookkeeping: last cursor position per hand. */
  const lastFistPos = useRef<(THREE.Vector3 | null)[]>([null, null])
  /** Two-hand pull-apart baseline, captured when the second pinch starts. */
  const pullApart = useRef<{ baseDist: number; baseExplode: number } | null>(null)
  /** Whether the hands (rather than the mouse) currently own the hover highlight. */
  const handsOwnHover = useRef(false)

  useEffect(() => {
    const onGesture = (e: Event) => {
      const event = (e as CustomEvent<GestureEvent>).detail
      const store = useInteraction.getState()

      if (event.type === 'pinchStart') {
        const frame = handFrames[event.hand]
        const partId = nearestPart(frame.cursor3D, GRAB_RADIUS)
        if (partId && !store.grabbed) {
          const partPos = partWorldPos.get(partId)!
          grabOffset.copy(partPos).sub(frame.cursor3D)
          grabTarget.pos = dragPoint.copy(partPos)
          store.grab(partId, event.hand)
        }
        return
      }

      if (event.type === 'pinchEnd' || event.type === 'handLost') {
        const { grabbed } = useInteraction.getState()
        if (grabbed && grabbed.hand === event.hand) {
          grabTarget.pos = null
          store.release()
        }
        pullApart.current = null
        lastFistPos.current[event.hand] = null
        return
      }

      if (event.type === 'palmOpen') {
        // The universal "drop everything" — works even if a pinch never registered ending.
        if (useInteraction.getState().grabbed) {
          grabTarget.pos = null
          store.release()
        }
        return
      }

      if (event.type === 'fistStart') {
        lastFistPos.current[event.hand] = handFrames[event.hand].cursor3D.clone()
        return
      }

      if (event.type === 'fistEnd') {
        lastFistPos.current[event.hand] = null
      }
    }

    gestureBus.addEventListener('gesture', onGesture)
    return () => gestureBus.removeEventListener('gesture', onGesture)
  }, [grabOffset, dragPoint])

  useFrame((_, dt) => {
    const store = useInteraction.getState()
    const [left, right] = handFrames
    let anyGesture = false

    // --- cursors ------------------------------------------------------------
    for (let hand = 0; hand < 2; hand++) {
      const frame = handFrames[hand]
      const group = cursors.current[hand]
      const ring = rings.current[hand]
      if (!group) continue

      const tracked = frame.landmarks !== null
      group.visible = tracked
      if (!tracked) continue

      group.position.copy(frame.cursor3D)
      if (ring) {
        // Ring tightens as the pinch closes — the pinch-strength indicator.
        const s = 1 - frame.pinchStrength * 0.55
        ring.scale.setScalar(THREE.MathUtils.damp(ring.scale.x, s, 12, dt))
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.color.set(frame.pinching ? GRAB_COLOR : CURSOR_COLOR)
      }
      if (frame.pinching || frame.fisting) anyGesture = true
    }

    // --- carry a grabbed part ----------------------------------------------
    const grabbed = store.grabbed
    if (grabbed && grabbed.hand < 2) {
      const frame = handFrames[grabbed.hand]
      if (frame.landmarks) {
        grabTarget.pos = dragPoint.copy(frame.cursor3D).add(grabOffset)
      }
    }

    // --- hover feedback -----------------------------------------------------
    // Hands only own the hover state while hands are actually visible; otherwise
    // the mouse owns it. Without this, an untracked hand would clear the
    // pointer's hover highlight every frame and mouse-only demos would lose it.
    if (!grabbed) {
      if (anyHandTracked()) {
        let hover: string | null = null
        for (const frame of handFrames) {
          if (!frame.landmarks) continue
          hover = nearestPart(frame.cursor3D, GRAB_RADIUS)
          if (hover) break
        }
        if (hover !== store.hoveredPartId) store.setHovered(hover)
        handsOwnHover.current = true
      } else if (handsOwnHover.current) {
        // Hands just left the frame — clear their highlight once, then hand over.
        store.setHovered(null)
        handsOwnHover.current = false
      }
    }

    // --- fist spin ----------------------------------------------------------
    for (let hand = 0; hand < 2; hand++) {
      const frame = handFrames[hand]
      const last = lastFistPos.current[hand]
      if (frame.fisting && frame.landmarks && last) {
        const dx = frame.cursor3D.x - last.x
        const dy = frame.cursor3D.y - last.y
        if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
          store.rotateBy(dx * 1.4, -dy * 1.0)
        }
        last.copy(frame.cursor3D)
      }
    }

    // --- two-hand pull apart ------------------------------------------------
    const bothPinching = left.pinching && right.pinching && left.landmarks && right.landmarks
    if (bothPinching) {
      const dist = left.cursor3D.distanceTo(right.cursor3D)
      if (!pullApart.current) {
        pullApart.current = { baseDist: dist, baseExplode: store.targetExplode }
      } else {
        const delta = (dist - pullApart.current.baseDist) / PULL_APART_SPAN
        store.setTargetExplode(pullApart.current.baseExplode + delta)
      }
      anyGesture = true
    } else if (pullApart.current) {
      pullApart.current = null
    }

    if (controls) controls.enabled = !anyGesture
  })

  return (
    <>
      {[0, 1].map((hand) => (
        <group
          key={hand}
          ref={(el) => {
            cursors.current[hand] = el
          }}
          visible={false}
        >
          <mesh>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial color={CURSOR_COLOR} toneMapped={false} />
          </mesh>
          <mesh
            ref={(el) => {
              rings.current[hand] = el
            }}
          >
            <torusGeometry args={[0.16, 0.008, 8, 40]} />
            <meshBasicMaterial
              color={CURSOR_COLOR}
              transparent
              opacity={0.8}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}
