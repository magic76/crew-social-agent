# Crew Social Agent — shared AI agent instructions

Read the relevant Skill before editing this repository. These instructions apply to Codex, Claude Code, Cursor, Gemini CLI and other local AI agents.

## Video creation
When asked to make science explainers, tutorials, HTML animations, voice-over videos or short-form Reels:
1. Start with [skills/crew-video-lab/SKILL.md](skills/crew-video-lab/SKILL.md).
2. Follow the specialist Skills for research, storyboard, HTML animation, audio/captions, QA and delivery.
3. Use the starter under video-lab/examples/permissions-101; adapt the topic but keep timing and QA constraints.
4. HyperFrames is the default renderer, Remotion is a documented fallback. Install upstream framework Skills from their official repository only when needed.
5. Never say an MP4 has been rendered without a real file plus ffprobe/visual checks.

## Social publishing
Read [skills/crew-social-agent/SKILL.md](skills/crew-social-agent/SKILL.md). Never place video files in the existing image/text Queue. Video handoffs use their own contract and publisher; only `ready_for_video_publisher` plus `publish_permitted=true`, a due schedule, global live mode and valid credentials can publish. Preserve production publisher safety and idempotency.

## Boundaries
- Never commit API keys, Meta tokens, generated voice secrets or private data.
- Keep generated MP4, temp files, downloaded dependencies, caches out of Git.
- Prefer source-backed educational accuracy; no invented demonstrations, tests or statistics.
- Do not change existing social Queue entries or Meta publication logic for a video request unless explicitly requested.
