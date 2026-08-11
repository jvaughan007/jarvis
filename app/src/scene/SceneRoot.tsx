import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import HudRings from './HudRings'
import Particles from './Particles'
import SceneDebug from './SceneDebug'

export const BG_COLOR = '#000005'

/**
 * The holographic stage: near-black void, heavy bloom, ambient dust, HUD rings.
 * Bloom only reads because nothing here is bright except the emissive parts —
 * that's why the background has to stay near-black.
 */
export default function SceneRoot({ children }: { children?: ReactNode }) {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 6.9], fov: 50 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[BG_COLOR]} />
      <fogExp2 attach="fog" args={[BG_COLOR, 0.055]} />

      <ambientLight intensity={0.35} />
      <pointLight position={[4, 4, 5]} intensity={40} color="#8fe9ff" distance={30} />
      <pointLight position={[-5, -2, -4]} intensity={25} color="#ffb347" distance={30} />

      <Particles />
      <HudRings />
      {children}

      <OrbitControls
        makeDefault
        enablePan={false}
        /* Look slightly below centre so the opened model rides above the controls bar. */
        target={[0, -0.32, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={14}
      />

      <EffectComposer>
        <Bloom intensity={1.25} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
      </EffectComposer>

      {import.meta.env.DEV && <SceneDebug />}
    </Canvas>
  )
}
