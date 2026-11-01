---
name: crew-video-qa
description: Validate programmatic-video input, HTML animation, timing, resolution, audio, caption quality, factual accuracy and reproducibility.
---
# QA gates

Required gates, in order:
1. Story JSON parses and contains unique scene ids, sources, positive durations, time-aligned contiguous scenes and sane text limits. Run node scripts/video-lab.mjs validate PATH.
2. Verify expected composition properties: 1080×1920, 30 fps, intended duration, no missing fonts/local media, paused GSAP master timeline. Run node scripts/video-lab.mjs check PATH and read the actual errors.
3. Preview at beginning/middle/end and at each scene boundary; watch for blank frames, flickers, clipping, wrong diagram direction, black background after transition, misleading charts, and too much text. Check mobile readability and safe areas.
4. Render an MP4; verify the file exists and is nonzero, fully decode it, and inspect ffprobe JSON for width/height/fps/duration/audio streams. Record its size and SHA-256. Do not claim full acceptance from a render command exit code alone.
5. Inspect captions for Traditional Chinese glyph issues, safe-area readability and timing; check each voice segment for alignment, coverage, clipping and truncated starts/ends. Compare each source WAV to decoded output audio at the expected offset (e.g. correlation). Separately listen or transcribe and compare narration with captions: signal matching alone cannot validate words or audio quality. Use only legally usable sources/media.
6. Record qa.json with render engine/version, input revision, FPS, resolution, duration, inspected timestamps, audio presence, individual checks and failures. Distinguish automated measurements, visual samples and listening/transcription. Mark each unperformed gate "not_verified", not "passed", and do not claim overall QA passed if required checks remain unverified.

Publishing is a separate step: passing Video Lab QA does not authorize publication. Use the separate video handoff and current local video publisher, not the image-only social Queue; follow the handoff skill's publication gates.

A broken render or missing voice cannot be hidden by a green summary. If resources are unavailable, leave the output as a reproducible project and report remaining steps.
