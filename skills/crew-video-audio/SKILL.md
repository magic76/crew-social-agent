---
name: crew-video-audio
description: Add consented licensed narration, accurately timed Traditional Chinese subtitles, optional sound effects and audio QA to educational videos.
---
# Audio / captions

1. Draft a plain spoken Traditional Chinese script scene by scene. Do not copy source text verbatim beyond small quotes; do not imitate an identifiable person's voice without permission.
2. Use an available authorized TTS service or locally recorded narration; save the generated audio under the project assets folder with source/tool/voice/usage details in credits.md. A voice API is optional; never claim TTS is available merely because the repository has HTML.
3. Measure the real audio duration, update scene start/duration and captions to match. Include breathing gaps and emphasis. Never force 100 words into 10 seconds.
4. Generate UTF-8 SRT or VTT captions with actual cues; no overlapping cues, incorrect UTF-8 or words that aren't spoken. For visuals, display high-contrast caption text in the platform-safe region.
5. For HyperFrames, insert an audio clip with explicit data-start and data-volume. Let the framework handle play/pause/seek. Avoid browser speechSynthesis or asynchronous TTS calls during render (nondeterministic).
6. If background music is used, require original/user-provided or appropriately licensed assets. Keep speech clear; don't hard-code loud sound effects. Record credit/license where applicable.
7. Run ffprobe to confirm audio exists and matches duration, inspect samples for clipping and off-sync; if audio is omitted, label the output as "silent" and use text-only education.

Output: narration audio, cue captions (.srt), provenance/credits and explicit QC notes. No external voice subscription or hidden key is required for the silent starter.

## Working CLI (Gemini 3.8 TTS)

Run `node scripts/video-voice.mjs PROJECT --provider=gemini --video=/absolute/path/original.mp4 --out=/absolute/path/narrated.mp4` with local `GEMINI_API_KEY`. The CLI uses the official Interactions API, requests Taiwan Mandarin, measures each generated WAV, fails on overflow with `generated-voice/retime-required.json`, creates SRT cues and muxes AAC audio to the rendered video. Optional `--provider=espeak` is a low-quality offline smoke test only, not a Gemini substitute. Keep API keys local and generated media out of Git. See video-lab/README.md for exact usage. No Gemini calls have been verified in an environment without credentials.
