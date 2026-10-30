---
name: crew-video-hyperframes
description: Build deterministic HTML, CSS, SVG and GSAP animations, validate them with HyperFrames, preview and render an explainer MP4.
---
# HTML motion / HyperFrames

HyperFrames is the default. Reference: https://github.com/heygen-com/hyperframes and https://hyperframes.app/docs/1-startup/2-quickstart. The installed CLI help and official upstream Skills take precedence if the framework changes.

## Composition contract
- Root is explicitly sized and positioned: data-composition-id, data-start="0", data-width, data-height, data-duration. Root CSS width/height must match. Use 1080×1920 for Reels.
- Each visible scene is a direct root child with a stable id, class="clip", data-start, data-duration and data-track-index. Keep visible clips on a suitable z layer. No unintended overlapping time ranges.
- Initialize one GSAP timeline with paused:true; synchronously register it on window.__timelines[composition-id]. Build every motion at an absolute timeline time or fixed relative time; never use setTimeout or real-time rAF animation for output-critical effects.
- Do not manually play/pause/seek audio/video; HyperFrames owns media playback. Avoid unbounded loops, random layouts, time-dependent state and runtime network APIs. Use finite seek-safe animation.
- For icons, use original SVG or properly licensed ones, not screenshots or copyright logos without appropriate use rights.
- Favor reveal/translate/opacity/scale, step-by-step arrows, annotations, timelines and charts. Animate the concept, not decoration.
- Freeze exact versions of external runtime assets when possible; better use local checked-in licensed static assets, not a CDN for repeatable rendering.
- On every new composition run lint/check, seek to random timestamps and view the first/middle/last frames.

## Local commands
~~~sh
npx hyperframes skills update
npx hyperframes preview
npx hyperframes check
npx hyperframes render --output output.mp4
~~~

From repo root use the wrapper: node scripts/video-lab.mjs <validate|check|preview|render> <project-directory>. The wrapper validates the story before running an external CLI; it does not install FFmpeg or bypass failed checks.

Do not claim successful rendering from HTML compilation or a preview alone. Render an actual MP4 and inspect its media metadata.
