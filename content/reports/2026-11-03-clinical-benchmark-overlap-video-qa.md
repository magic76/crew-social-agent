# 2026-11-03 clinical benchmark explainer video QA

- Source: Scientific Reports, published 2026-11-02 — https://www.nature.com/articles/s41598-026-77367-y
- Video: 1080×1920, 30 fps, 32.0 seconds, H.264/AAC, yuv420p; 8,119,546 bytes.
- SHA-256: `9efc64fb98f684e218c6662ec26af081917e220648a153160577793dc8b303c9`
- Narration: actual Gemini TTS WAV, Kore voice, zh-TW; source WAV 23.28 seconds. Rendered with pitch-preserving FFmpeg `atempo=0.78` to about 29.85 seconds. The seven burned-in Traditional Chinese caption cues end at 29.49 seconds; the closing animated tail is about 2.15 seconds.
- Style/render: Crew Light v1; orange Crew Cloud host, cream background with blue/purple glow, rounded cards, white capsule captions, continuous pan/zoom and slide/crossfade motion. No screen recording.
- Passed: story contract (5 contiguous scenes and source), `ffprobe`, full FFmpeg audio/video decode, and opening/middle/ending visual inspection. Automated first-four-second AAC-to-retimed-WAV alignment correlation: 0.999776, lag 0 samples. This check does not verify spoken wording or audio quality.
- Not verified: human listening review and independent transcript review. Therefore the video handoff remains `draft_handoff_only`, `publish_permitted:false`, with no schedule.
- Publisher: local `SOCIAL_AGENT_MODE` and platform credentials were not available for verification here. Current main video Publisher does not process `first_replies`; keep the two source replies in the handoff and update the local video Publisher before any release.
