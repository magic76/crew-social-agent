#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/../../.." && pwd)"
RENDERS_DIR="$PROJECT_DIR/renders"
INTERMEDIATE="$RENDERS_DIR/hyperframes-with-voice.mp4"
RENDER_OUTPUT="$PROJECT_DIR/output.mp4"
OUTPUT="$REPO_ROOT/content/video-handoffs/assets/grok-ai-pm-crew-magic-20261101.mp4"
DURATION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["video"]["duration"])' "$PROJECT_DIR/story.json")"

mkdir -p "$RENDERS_DIR" "$(dirname "$OUTPUT")"
rm -f "$RENDER_OUTPUT"
node "$REPO_ROOT/scripts/video-lab.mjs" validate "$PROJECT_DIR"
node "$REPO_ROOT/scripts/video-lab.mjs" check "$PROJECT_DIR"
node "$REPO_ROOT/scripts/video-lab.mjs" render "$PROJECT_DIR"
mv -f "$RENDER_OUTPUT" "$INTERMEDIATE"

ffmpeg -hide_banner -y -i "$INTERMEDIATE" \
  -map 0:v:0 -map 0:a:0 \
  -af 'loudnorm=I=-16:TP=-1.5:LRA=9' \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -metadata:s:a:0 language=zho \
  -movflags +faststart -t "$DURATION" "$OUTPUT"

ffprobe -v error -show_streams -show_format -of json "$OUTPUT" > "$PROJECT_DIR/renders/final-ffprobe.json"
printf 'Rendered %s seconds to %s\n' "$DURATION" "$OUTPUT"
