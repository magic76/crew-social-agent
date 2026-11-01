---
name: crew-video-audio
description: Add consented licensed narration, accurately timed Traditional Chinese subtitles, optional sound effects and audio QA to educational videos.
---
# Audio / captions

1. Draft a plain spoken Traditional Chinese script scene by scene. Do not copy source text verbatim beyond small quotes; do not imitate an identifiable person's voice without permission.
2. Use an available authorized TTS service or locally recorded narration; save the generated audio under the project assets folder with source/tool/voice/usage details in credits.md. A voice API is optional; never claim TTS is available merely because the repository has HTML.
3. Measure each actual WAV's duration; use those measurements to update scene starts and durations and subtitle cues, including breathing gaps and the closing hold. Never force narration to fit an estimated scene length. Preserve the WAVs and their job IDs for recovery and verification.
4. Generate UTF-8 SRT or VTT captions with actual cues; no overlapping cues, incorrect UTF-8 or words that aren't spoken. For visuals, display high-contrast caption text in the platform-safe region.
5. For HyperFrames, insert an audio clip with explicit data-start and data-volume. Let the framework handle play/pause/seek. Avoid browser speechSynthesis or asynchronous TTS calls during render (nondeterministic).
6. If background music is used, require original/user-provided or appropriately licensed assets. Keep speech clear; don't hard-code loud sound effects. Record credit/license where applicable.
7. Run ffprobe to confirm audio exists and matches duration. Compare each WAV with final decoded audio at its intended offset (e.g. cross-correlation) to check alignment and coverage; inspect starts and ends for truncation and clipping. Separately listen or transcribe the speech and compare it with the captions. A signal comparison alone does not verify spoken words or listening quality. Record each result and mark unperformed checks `not_verified`; if audio is omitted, label the output as "silent".

Output: narration audio, cue captions (.srt), provenance/credits and explicit QC notes. No external voice subscription or hidden key is required for the silent starter.

## Working CLI (Gemini 3.8 TTS)

Run `node scripts/video-voice.mjs PROJECT --provider=gemini --video=/absolute/path/original.mp4 --out=/absolute/path/narrated.mp4` with local `GEMINI_API_KEY`. The CLI uses the official Interactions API, requests Taiwan Mandarin, measures each generated WAV, fails on overflow with `generated-voice/retime-required.json`, creates SRT cues and muxes AAC audio to the rendered video. Optional `--provider=espeak` is a low-quality offline smoke test only, not a Gemini substitute. Keep API keys local; approved, shareable production assets may be committed as part of a video handoff. See video-lab/README.md for exact usage. Do not assume credentials are available in another environment.

Gemini 3.8 TTS narration: choose a single consistent voice and Taiwan Mandarin `speech_metadata.style`. The pipeline has a mock REST regression test and adds fade-in/out on scene audio, soft background mixing and loudness normalization. Don't claim a real voice-quality test without calling the model with locally configured credentials. See video-lab/README.md.

## Crew Web Gemini TTS (automatic queue, no GitHub Actions)

Read the current [Crew Web integration guide](https://github.com/magic76/magic76.github.io/blob/master/docs/CREW_VIDEO_TTS.md) and current Worker implementation. For assistant-run voice generation, add a uniquely identified request to `content/video-tts/requests/index.json` on this repo's main branch after verifying Worker availability. The first authorized job auto-creates its isolated D1 table. Keep scripts publicly shareable (WAV downloads are public); never submit API keys to GitHub. The queue item shape is `{id:"crew-tts-...",day:"YYYY-MM-DD",voice:"Kore",text:"10–300 chars"}` with UTC day. Worker checks every 5 minutes and returns WAV at `https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id=<id>`. The current code defaults to 20 new jobs per UTC day; `CREW_VIDEO_TTS_MAX_JOBS_PER_DAY` accepts whole numbers 1–50, with invalid values falling back to 20. Do not assume the deployed Worker version or configured limit; verify when possible. Failed jobs are not automatically retried with the same ID. Only claim audio generated after retrieving and verifying the WAVs.

Check the current Worker payload before promising per-scene emotional direction: editorial notes do not control the voice unless the Worker actually forwards those settings to the TTS model. Record the voice and effective style honestly.

