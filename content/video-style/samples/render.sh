#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
node "$ROOT/scripts/video-lab.mjs" validate "$HERE"
npx --yes hyperframes@0.8.226 check "$HERE"
RAW="$(mktemp --suffix=.mp4)"
trap 'rm -f "$RAW"' EXIT
npx --yes hyperframes@0.8.226 render "$HERE" --output "$RAW" --fps 30 --quality delivery --workers 2
ffmpeg -hide_banner -y -i "$RAW" -map 0:v:0 -map 0:a:0 -af 'apad,loudnorm=I=-16:TP=-1.5:LRA=9' -c:v copy -c:a aac -b:a 192k -t 30.2 -movflags +faststart "$HERE/crew-light-v1.mp4"
ffprobe -v error -show_streams -show_format -of json "$HERE/crew-light-v1.mp4" > "$HERE/ffprobe.json"
ffmpeg -v error -i "$HERE/crew-light-v1.mp4" -f null -
