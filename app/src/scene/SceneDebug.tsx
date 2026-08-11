import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * Adds the live three.js objects to the dev console handle installed by
 * devtools.ts. Not mounted in production builds.
 */
export default function SceneDebug() {
  const { camera, scene, controls, gl } = useThree()

  useEffect(() => {
    Object.assign((window.__jarvis ??= {}), { camera, scene, controls, gl })
  }, [camera, scene, controls, gl])

  return null
}
