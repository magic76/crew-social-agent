#!/usr/bin/env bash
# Mux 30fps PNG sequence + mastered WAV into the final H.264/AAC MP4, then measure loudness.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIT="$(cd "$SCRIPT_DIR/.." && pwd)"
KIT="${KOLO_KIT_ROOT:-$KIT}"
SEQ="${1:-$KIT/work/seq}"
WAV="${2:-$KIT/work/audio/mix_norm_v41.wav}"
OUT="${3:-$KIT/output/koolo-promo-v4.1.mp4}"
mkdir -p "$(dirname "$OUT")"

if [[ ! -f "$SEQ/f0000.png" ]]; then
  echo "missing $SEQ/f0000.png — run: python scripts/compose.py" >&2
  exit 1
fi
if [[ ! -f "$WAV" ]]; then
  echo "missing $WAV — run: python scripts/make_audio.py" >&2
  exit 1
fi

ffmpeg -y -framerate 30 -i "$SEQ/f%04d.png" -i "$WAV" \
  -c:v libx264 -preset medium -crf 18 -profile:v high -level:v 4.1 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart -shortest \
  "$OUT"

echo "======= ffprobe ======="
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,duration,nb_frames,profile,sample_rate,channels -show_entries format=duration,size,bit_rate -of default=nw=1 "$OUT"
echo "======= decoded loudness (target I=-14.0 LUFS, TP<=-1.5 dBTP) ======="
ffmpeg -y -i "$OUT" -af "ebur128=peak=true" -f null - 2>&1 | tail -n 20
echo "wrote $OUT"
