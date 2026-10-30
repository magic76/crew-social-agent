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

Gemini 3.8 TTS narration: choose a single consistent voice and Taiwan Mandarin `speech_metadata.style`. The pipeline has a mock REST regression test and adds fade-in/out on scene audio, soft background mixing and loudness normalization. Don't claim a real voice-quality test without calling the model with locally configured credentials. See video-lab/README.md.

## Crew Web Gemini TTS (automatic queue, no GitHub Actions)

Read the current [Crew Web integration guide](https://github.com/magic76/magic76.github.io/blob/master/docs/CREW_VIDEO_TTS.md). For fully assistant-run voice generation, add a uniquely identified request to `content/video-tts/requests/index.json` on the **protected main branch** of this repo, **once the updated Crew Web Worker has been deployed**. The first authorized job auto-creates its isolated D1 table. No new API Key or settings are needed. Keep the script factual and publicly shareable (the WAV download is public). The queue item shape is `{id:"crew-tts-...",day:"YYYY-MM-DD",voice:"Kore",text:"10–300 chars"}` with UTC day. Worker checks every 5 minutes and returns WAV at `https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id=<id>`. Max 3 new requests per UTC day, no retry of failed jobs with the same ID. Never submit API keys to GitHub. Only claim audio generated after actually retrieving and verifying a real WAV.

