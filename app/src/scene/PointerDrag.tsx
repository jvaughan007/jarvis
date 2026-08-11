import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useInteraction } from '../state/interactionStore'
import { grabTarget, partWorldPos } from './HeroModel'

/** Sentinel hand id for pointer-driven grabs, so it never collides with hands 0/1. */
export const MOUSE_HAND = 2

interface OrbitLike {
  enabled: boolean
}

/**
 * Mouse parity for every hand gesture. A demo has to survive a denied camera,
 * a dark room, or a laptop with tape over the lens — so anything the hands can
 * do, the pointer can do too:
 *   drag a part      = pinch-grab
 *   release          = open palm
 *   drag background  = orbit (OrbitControls)
 *   ⌥ + wheel        = scale
 */
export default function PointerDrag() {
  const { camera, gl, controls } = useThree()
  const setHovered = useInteraction((s) => s.setHovered)

  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointer = useMemo(() => new THREE.Vector2(), [])
  const plane = useMemo(() => new THREE.Plane(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])
  const dragging = useRef<string | null>(null)

  /** Screen point → world point on a camera-facing plane through the given depth. */
  const projectToPlane = useCallback(
    (event: PointerEvent, through: THREE.Vector3, out: THREE.Vector3) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), through)
      return raycaster.ray.intersectPlane(plane, out)
    },
    [camera, gl, plane, pointer, raycaster],
  )

  /** Nearest part to the pointer ray, within a generous screen-space radius. */
  const partUnderPointer = useCallback(
    (event: PointerEvent): string | null => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)

      let best: string | null = null
      let bestDist = 0.55
      for (const [id, pos] of partWorldPos) {
        const d = raycaster.ray.distanceToPoint(pos)
        if (d < bestDist) {
          bestDist = d
          best = id
        }
      }
      return best
    },
    [camera, gl, pointer, raycaster],
  )

  useEffect(() => {
    const canvas = gl.domElement
    const orbit = controls as OrbitLike | null

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const id = partUnderPointer(event)
      if (!id) return

      const partPos = partWorldPos.get(id)!
      if (!projectToPlane(event, partPos, hit)) return

      offset.copy(partPos).sub(hit)
      dragging.current = id
      grabTarget.pos = hit.clone().add(offset)
      useInteraction.getState().grab(id, MOUSE_HAND)
      if (orbit) orbit.enabled = false
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) {
        setHovered(partUnderPointer(event))
        return
      }
      const partPos = partWorldPos.get(dragging.current)
      if (!partPos) return
      if (projectToPlane(event, partPos, hit)) {
        grabTarget.pos = hit.clone().add(offset)
      }
    }

    const endDrag = (event?: PointerEvent) => {
      if (!dragging.current) return
      dragging.current = null
      grabTarget.pos = null
      useInteraction.getState().release()
      if (orbit) orbit.enabled = true
      if (event && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.altKey) return // plain wheel stays with OrbitControls dolly
      event.preventDefault()
      useInteraction.getState().scaleBy(event.deltaY < 0 ? 1.06 : 0.94)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
    canvas.addEventListener('pointerleave', endDrag)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('pointerleave', endDrag)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [controls, gl, hit, offset, partUnderPointer, projectToPlane, setHovered])

  return null
}
