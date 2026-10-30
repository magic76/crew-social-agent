---
name: crew-video-qa
description: Validate programmatic-video input, HTML animation, timing, resolution, audio, caption quality, factual accuracy and reproducibility.
---
# QA gates

Required gates, in order:
1. Story JSON parses and contains unique scene ids, sources, positive durations, time-aligned contiguous scenes and sane text limits. Run node scripts/video-lab.mjs validate PATH.
2. Verify expected composition properties: 1080×1920, 30 fps, intended duration, no missing fonts/local media, paused GSAP master timeline. Run node scripts/video-lab.mjs check PATH and read the actual errors.
3. Preview at beginning/middle/end and at each scene boundary; watch for blank frames, flickers, clipping, wrong diagram direction, black background after transition, misleading charts, and too much text. Check mobile readability and safe areas.
4. Render an MP4; verify actual file exists and nonzero; inspect ffprobe JSON for width/height/fps/duration/audio streams. Do not claim full acceptance from command exit code alone.
5. Compare rendered captions against the narration, look for Traditional Chinese glyph issues, incorrect numbers/units, sound clipping and desync. Use only legally usable sources/media.
6. Record qa.json with render engine/version, input revision, FPS, resolution, duration, inspected timestamps, audio present/absent, failures and approval. If a gate is not executed, use state "not_verified", not "passed".

Publishing is a separate step: passing Video Lab QA does not imply the Social Agent can post a video. Existing social Queue has no video schema or Meta Reels/video adapter.

A broken render or missing voice cannot be hidden by a green summary. If resources are unavailable, leave the output as a reproducible project and report remaining steps.
