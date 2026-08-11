import { useEffect, useRef, type RefObject } from 'react'
import { handFrames, trackingStatus, type TrackingState } from './handFrames'

const W = 220
const H = 165

/** MediaPipe's hand skeleton: which landmark indices connect to which. */
const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
]

const CYAN = '#00eaff'
const AMBER = '#ffb347'

/**
 * The webcam picture-in-picture with the tracked skeleton drawn over it.
 * This is deliberately visible during demos: seeing the skeleton follow your
 * hand is what convinces an audience the tracking is live and not a video.
 */
export default function HandPip({
  video,
  state,
}: {
  video: RefObject<HTMLVideoElement | null>
  state: TrackingState
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0, 8, 14, 0.85)'
      ctx.fillRect(0, 0, W, H)

      const v = video.current
      if (v && v.readyState >= 2 && state === 'on') {
        ctx.save()
        ctx.translate(W, 0)
        ctx.scale(-1, 1) // mirror, so it reads like a bathroom mirror
        ctx.globalAlpha = 0.55
        ctx.drawImage(v, 0, 0, W, H)
        ctx.restore()
        ctx.globalAlpha = 1
      }

      for (const frame of handFrames) {
        const lm = frame.landmarks
        if (!lm) continue
        const px = (i: number) => [(1 - lm[i].x) * W, lm[i].y * H] as const

        ctx.strokeStyle = frame.fisting ? AMBER : CYAN
        ctx.lineWidth = 1.6
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        for (const [a, b] of CONNECTIONS) {
          const [ax, ay] = px(a)
          const [bx, by] = px(b)
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
        }
        ctx.stroke()

        ctx.globalAlpha = 1
        for (let i = 0; i < lm.length; i++) {
          const [x, y] = px(i)
          // Thumb and index tips go amber while pinching — the gesture made visible.
          const isPinchPoint = i === 4 || i === 8
          ctx.fillStyle = isPinchPoint && frame.pinching ? AMBER : CYAN
          ctx.beginPath()
          ctx.arc(x, y, isPinchPoint ? 3.2 : 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Status chip
      ctx.font = '600 10px -apple-system, system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      if (state === 'on') {
        ctx.fillStyle = CYAN
        ctx.fillText(`HANDS ONLINE · ${trackingStatus.fps} FPS`, 8, H - 12)
      } else {
        ctx.fillStyle = '#6b8b93'
        const label =
          state === 'starting'
            ? 'STARTING CAMERA…'
            : state === 'error'
              ? 'HANDS OFFLINE · MOUSE OK'
              : 'HANDS OFF · MOUSE OK'
        ctx.fillText(label, 8, H - 12)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [video, state])

  return (
    <canvas
      ref={canvas}
      width={W}
      height={H}
      className="hand-pip"
      aria-label="Webcam hand tracking preview"
    />
  )
}
