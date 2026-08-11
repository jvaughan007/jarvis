#!/usr/bin/env bash
# Vendors everything MediaPipe needs at runtime into public/mediapipe/.
#
# Why vendor instead of using the CDN: this app has to run a live demo in a
# client's office or at a networking table where the wifi may be captive,
# throttled, or absent. Nothing about the hand tracking should touch the network
# once installed.
#
# Run once after `npm install` (and again after upgrading @mediapipe/tasks-vision).
set -euo pipefail

cd "$(dirname "$0")/.."

WASM_SRC="node_modules/@mediapipe/tasks-vision/wasm"
DEST="public/mediapipe"
MODEL_URL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

if [ ! -d "$WASM_SRC" ]; then
  echo "error: $WASM_SRC not found — run 'npm install' first." >&2
  exit 1
fi

mkdir -p "$DEST/wasm"

# The SIMD build is what modern Chrome actually loads; the nosimd fallback is
# ~11MB we don't need for a Mac demo machine, so it's skipped to keep the repo lean.
cp "$WASM_SRC/vision_wasm_internal.js" "$DEST/wasm/"
cp "$WASM_SRC/vision_wasm_internal.wasm" "$DEST/wasm/"
echo "copied wasm runtime → $DEST/wasm"

if [ -f "$DEST/hand_landmarker.task" ]; then
  echo "model already present → $DEST/hand_landmarker.task"
else
  echo "downloading hand landmarker model…"
  curl -fL --retry 3 -o "$DEST/hand_landmarker.task" "$MODEL_URL"
  echo "downloaded model → $DEST/hand_landmarker.task"
fi

ls -lh "$DEST" "$DEST/wasm"
