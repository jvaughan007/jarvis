import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RINGS = [
  { radius: 2.6, thickness: 0.022, speed: 0.08, color: '#00eaff', opacity: 0.85 },
  { radius: 3.1, thickness: 0.01, speed: -0.05, color: '#00eaff', opacity: 0.5 },
  { radius: 3.6, thickness: 0.016, speed: 0.03, color: '#ffb347', opacity: 0.4 },
]

/** Slow counter-rotating rings behind the model — the "system is live" furniture. */
export default function HudRings() {
  const group = useRef<THREE.Group>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, dt) => {
    rings.current.forEach((mesh, i) => {
      if (mesh) mesh.rotation.z += RINGS[i].speed * dt
    })
    if (group.current) group.current.rotation.x = -0.35
  })

  return (
    <group ref={group}>
      {RINGS.map((ring, i) => (
        <mesh
          key={ring.radius}
          ref={(el) => {
            rings.current[i] = el
          }}
        >
          <ringGeometry args={[ring.radius, ring.radius + ring.thickness, 128]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Tick marks around the inner ring so it reads as an instrument, not a hoop. */}
      <group rotation={[0, 0, 0]}>
        {Array.from({ length: 48 }, (_, i) => {
          const angle = (i / 48) * Math.PI * 2
          const long = i % 4 === 0
          const r = 2.72
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
              rotation={[0, 0, angle]}
            >
              <planeGeometry args={[long ? 0.12 : 0.05, 0.006]} />
              <meshBasicMaterial
                color="#00eaff"
                transparent
                opacity={long ? 0.7 : 0.3}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
