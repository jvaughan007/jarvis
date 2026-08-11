import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from '../gestures/detect'
import { cursorPoint, depthProxy, pinchRatio } from '../gestures/detect'
import { GestureTracker, PINCH_OFF, PINCH_ON } from '../gestures/stateMachine'
import { emitGesture, handFrames, trackingStatus, type TrackingState } from './handFrames'

/** Exponential smoothing on landmarks — raw MediaPipe output is too jittery to grab with. */
const SMOOTHING = 0.35
/** How far the working plane spans in world units, so hands reach the whole model. */
const PLANE_WIDTH = 7.5
const PLANE_HEIGHT = 4.6
/** Apparent hand size maps to depth; these bracket a comfortable arm's reach. */
const NEAR_SCALE = 0.28
const FAR_SCALE = 0.1
const DEPTH_RANGE = 1.2

/** Raised when the tracking model/wasm can't be fetched, as opposed to a camera problem. */
class ModelLoadError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = 'ModelLoadError'
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

function smooth(prev: Landmark[] | null, next: Landmark[]): Landmark[] {
  if (!prev || prev.length !== next.length) return next
  return next.map((lm, i) => ({
    x: prev[i].x + (lm.x - prev[i].x) * SMOOTHING,
    y: prev[i].y + (lm.y - prev[i].y) * SMOOTHING,
    z: prev[i].z + (lm.z - prev[i].z) * SMOOTHING,
  }))
}

/**
 * Webcam hand tracking. Starts only on an explicit user action (browsers require
 * a gesture for camera access anyway), and degrades to 'error' state rather than
 * throwing — the app stays fully usable by mouse if this never starts.
 */
export function useHandTracking() {
  const [state, setState] = useState<TrackingState>('off')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const trackerRef = useRef(new GestureTracker())
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runningRef = useRef(false)

  const setStatus = useCallback((next: TrackingState, message: string | null = null) => {
    trackingStatus.state = next
    trackingStatus.message = message
    setState(next)
  }, [])

  const stop = useCallback(() => {
    runningRef.current = false
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    handFrames.forEach((f) => {
      f.landmarks = null
      f.pinching = false
      f.fisting = false
      f.pinchStrength = 0
    })
    setStatus('off')
  }, [setStatus])

  const start = useCallback(async () => {
    if (runningRef.current) return
    setStatus('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream

      const video = document.createElement('video')
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.srcObject = stream
      await video.play()
      videoRef.current = video

      // Loading the tracking model is a separate failure mode from the camera,
      // and it needs its own message: the usual cause is the dev server not
      // running, which is invisible from a browser tab that's already loaded.
      let landmarker: HandLandmarker
      try {
        const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'GPU',
          },
          numHands: 2,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      } catch (err) {
        throw new ModelLoadError(String(err))
      }
      landmarkerRef.current = landmarker

      runningRef.current = true
      setStatus('on')

      let lastVideoTime = -1
      let frames = 0
      let fpsWindowStart = performance.now()

      const loop = () => {
        if (!runningRef.current) return
        rafRef.current = requestAnimationFrame(loop)

        const now = performance.now()
        if (video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime

        let results
        try {
          results = landmarker.detectForVideo(video, now)
        } catch {
          return // a dropped frame is not worth killing the session over
        }

        const detected: (Landmark[] | null)[] = [null, null]
        const raw = results.landmarks ?? []
        for (let i = 0; i < Math.min(raw.length, 2); i++) {
          detected[i] = raw[i] as Landmark[]
        }

        for (let hand = 0; hand < 2; hand++) {
          const frame = handFrames[hand]
          const lm = detected[hand]
          if (!lm) {
            frame.landmarks = null
            frame.pinchStrength = 0
            continue
          }
          const smoothed = smooth(frame.landmarks, lm)
          frame.landmarks = smoothed

          // Mirror x so moving right moves the cursor right (the video is a mirror).
          const point = cursorPoint(smoothed)
          const depth = depthProxy(smoothed)
          const depthT = clamp01((depth - FAR_SCALE) / (NEAR_SCALE - FAR_SCALE))
          frame.cursor3D.set(
            (0.5 - point.x) * PLANE_WIDTH,
            (0.5 - point.y) * PLANE_HEIGHT,
            (depthT - 0.5) * DEPTH_RANGE,
          )

          const ratio = pinchRatio(smoothed)
          frame.pinchStrength = 1 - Math.min(1, Math.max(0, (ratio - PINCH_ON) / (PINCH_OFF - PINCH_ON)))
        }

        for (const event of trackerRef.current.update(detected, now)) {
          if (event.type === 'pinchStart') handFrames[event.hand].pinching = true
          if (event.type === 'pinchEnd') handFrames[event.hand].pinching = false
          if (event.type === 'fistStart') handFrames[event.hand].fisting = true
          if (event.type === 'fistEnd') handFrames[event.hand].fisting = false
          emitGesture(event)
        }

        frames++
        if (now - fpsWindowStart >= 1000) {
          trackingStatus.fps = Math.round((frames * 1000) / (now - fpsWindowStart))
          frames = 0
          fpsWindowStart = now
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      let message: string
      if (err instanceof ModelLoadError) {
        message =
          "Couldn't load the hand-tracking files. If the page has been open a while, " +
          'reload it — the dev server may have restarted. Mouse control works either way.'
      } else if (err instanceof DOMException && err.name === 'NotAllowedError') {
        message = 'Camera permission denied. Allow it in the address bar, or use mouse control.'
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        message = 'No camera found. Mouse control still works.'
      } else if (err instanceof DOMException && err.name === 'NotReadableError') {
        message = 'The camera is in use by another app. Close it and try again, or use the mouse.'
      } else {
        message = 'Hand tracking unavailable — mouse control still works.'
      }
      console.warn('[jarvis] hand tracking failed to start:', err)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStatus('error', message)
    }
  }, [setStatus])

  useEffect(() => stop, [stop])

  return { state, start, stop, video: videoRef }
}
