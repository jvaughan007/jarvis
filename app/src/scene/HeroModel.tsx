import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Line, Text } from '@react-three/drei'
import { easing } from 'maath'
import * as THREE from 'three'
import { PARTS, type PartDef } from '../model/heroParts'
import { explodedPosition } from '../model/explode'
import { useInteraction } from '../state/interactionStore'

/**
 * Shared, damped explode amount (0 = assembled, 1 = apart). One number that the
 * whole model reads, so hands, mouse and voice can't fight over separate copies.
 */
export const explodeRef = { current: 0 }

/**
 * Live world positions of every part, refreshed each frame. Input layers read
 * this to decide what's grabbable without walking the scene graph.
 */
export const partWorldPos = new Map<string, THREE.Vector3>()

/**
 * Where a grabbed part is being dragged to, in world space. Set by whichever
 * input owns the grab (hand or mouse); null when nothing is being dragged.
 */
export const grabTarget: { pos: THREE.Vector3 | null } = { pos: null }

const IDLE_EMISSIVE = 1.1
const HOT_EMISSIVE = 2.8
const PULSE_EMISSIVE = 5
const PULSE_MS = 900

function PartMesh({ part }: { part: PartDef }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const desired = useMemo(() => new THREE.Vector3(), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const localFromWorld = useMemo(() => new THREE.Vector3(), [])
  const isCore = part.id === 'core'

  useFrame((_, dt) => {
    const node = mesh.current
    if (!node) return

    const { grabbed, hoveredPartId } = useInteraction.getState()
    const dragging = grabbed?.partId === part.id && grabTarget.pos !== null

    if (dragging) {
      // grabTarget is world space; the part lives inside a rotated/scaled group.
      localFromWorld.copy(grabTarget.pos!)
      node.parent?.worldToLocal(localFromWorld)
      desired.copy(localFromWorld)
    } else {
      const [x, y, z] = explodedPosition(part.home, explodeRef.current)
      desired.set(x, y, z)
    }
    // A grabbed part tracks the hand tightly; a released one glides home.
    easing.damp3(node.position, desired, dragging ? 0.06 : 0.28, dt)

    const { pulsed } = useInteraction.getState()
    // A pulse is a short bright flash that decays — Jarvis pointing at a part.
    let flash = 0
    if (pulsed?.partId === part.id) {
      const age = (performance.now() - pulsed.at) / PULSE_MS
      if (age < 1) flash = (1 - age) * PULSE_EMISSIVE
    }

    const hot = grabbed?.partId === part.id || hoveredPartId === part.id
    if (material.current) {
      material.current.emissiveIntensity = THREE.MathUtils.damp(
        material.current.emissiveIntensity,
        (hot ? HOT_EMISSIVE : IDLE_EMISSIVE) + flash,
        8,
        dt,
      )
    }

    node.rotation.y += dt * (isCore ? 0.25 : 0.5)
    partWorldPos.set(part.id, node.getWorldPosition(world))
  })

  return (
    <mesh ref={mesh} name={part.id} position={part.home}>
      {isCore ? (
        <icosahedronGeometry args={[part.radius, 1]} />
      ) : (
        <sphereGeometry args={[part.radius, 24, 24]} />
      )}
      <meshStandardMaterial
        ref={material}
        color="#04222c"
        emissive={new THREE.Color(part.color)}
        emissiveIntensity={IDLE_EMISSIVE}
        roughness={0.35}
        metalness={0.1}
        toneMapped={false}
      />
      {/* Wireframe shell — the schematic read. */}
      <mesh scale={1.14}>
        {isCore ? (
          <icosahedronGeometry args={[part.radius, 1]} />
        ) : (
          <sphereGeometry args={[part.radius, 12, 12]} />
        )}
        <meshBasicMaterial
          color={part.color}
          wireframe
          transparent
          opacity={isCore ? 0.4 : 0.25}
          toneMapped={false}
        />
      </mesh>
    </mesh>
  )
}

interface TroikaText extends THREE.Object3D {
  fillOpacity: number
}

/** Label under a satellite; fades in as the model comes apart, or on hover. */
function PartLabel({ part }: { part: PartDef }) {
  const group = useRef<THREE.Group>(null)
  const text = useRef<TroikaText>(null)
  const scratch = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const node = group.current
    if (!node) return

    const pos = partWorldPos.get(part.id)
    if (pos) {
      scratch.copy(pos)
      scratch.y -= part.radius + 0.3
      node.position.copy(scratch)
    }

    const { hoveredPartId, grabbed } = useInteraction.getState()
    const visible =
      explodeRef.current > 0.25 || hoveredPartId === part.id || grabbed?.partId === part.id
    if (text.current) {
      text.current.fillOpacity = THREE.MathUtils.damp(
        text.current.fillOpacity,
        visible ? 0.95 : 0,
        6,
        dt,
      )
    }
  })

  return (
    <group ref={group}>
      <Billboard>
        <Text
          ref={text as never}
          fontSize={0.13}
          letterSpacing={0.12}
          color={part.color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0}
          material-toneMapped={false}
        >
          {part.label.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  )
}

interface Line2Like extends THREE.Object3D {
  geometry: { setPositions(points: number[]): void }
  material: { opacity: number }
}

/** Core-to-satellite links, in the model's local space; they fade as it opens up. */
function CoreLinks() {
  const satellites = useMemo(() => PARTS.filter((p) => p.id !== 'core'), [])
  const lines = useRef<(Line2Like | null)[]>([])

  useFrame(() => {
    const amount = explodeRef.current
    const [cx, cy, cz] = explodedPosition([0, 0, 0], amount)
    satellites.forEach((part, i) => {
      const line = lines.current[i]
      if (!line) return
      const [x, y, z] = explodedPosition(part.home, amount)
      line.geometry.setPositions([cx, cy, cz, x, y, z])
      line.material.opacity = Math.max(0, 0.55 - amount * 0.55)
    })
  })

  return (
    <>
      {satellites.map((part, i) => (
        <Line
          key={part.id}
          ref={(el) => {
            lines.current[i] = el as unknown as Line2Like
          }}
          points={[
            [0, 0, 0],
            [part.home[0], part.home[1], part.home[2]],
          ]}
          color={part.color}
          lineWidth={1}
          transparent
          opacity={0.55}
          toneMapped={false}
        />
      ))}
    </>
  )
}

/**
 * The AI Agent System: a brain core ringed by the business systems it drives.
 * Everything animates toward interaction-store state, so hands, mouse and
 * (later) voice all drive the same visuals.
 */
export default function HeroModel() {
  const group = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const { targetExplode, modelYaw, modelPitch, modelScale } = useInteraction.getState()
    explodeRef.current = THREE.MathUtils.damp(explodeRef.current, targetExplode, 5, dt)

    const node = group.current
    if (!node) return
    node.rotation.y = THREE.MathUtils.damp(node.rotation.y, modelYaw, 6, dt)
    node.rotation.x = THREE.MathUtils.damp(node.rotation.x, modelPitch, 6, dt)
    node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, modelScale, 6, dt))
  })

  return (
    <>
      <group ref={group}>
        <CoreLinks />
        {PARTS.map((part) => (
          <PartMesh key={part.id} part={part} />
        ))}
      </group>
      {PARTS.filter((p) => p.id !== 'core').map((part) => (
        <PartLabel key={part.id} part={part} />
      ))}
    </>
  )
}
