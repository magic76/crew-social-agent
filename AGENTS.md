# Crew Social Agent — shared AI agent instructions

Read the relevant Skill before editing this repository. These instructions apply to Codex, Claude Code, Cursor, Gemini CLI and other local AI agents.

## Video creation
When asked to make science explainers, tutorials, HTML animations, voice-over videos or short-form Reels:
1. Start with [skills/crew-video-lab/SKILL.md](skills/crew-video-lab/SKILL.md). New daily explainers must then use [Crew Light v1](content/video-style/STYLE.md) and `node scripts/video-lab.mjs style PROJECT`; its Crew Cloud orange mascot, light palette, Kore voice and caption/motion rules supersede older visual defaults. Existing videos remain renderable without conversion.
2. Follow the specialist Skills for research, storyboard, HTML animation, audio/captions, QA and delivery.
3. Use the starter under video-lab/examples/permissions-101; adapt the topic but keep timing and QA constraints.
4. HyperFrames is the default renderer, Remotion is a documented fallback. Install upstream framework Skills from their official repository only when needed.
5. Never say an MP4 has been rendered without a real file plus ffprobe/visual checks.

## Product promo videos (Koolo)
When asked to remake or create a Koolo (or Crew) product promo, Reels/Shorts ad, talking-character greeting film, or anything matching the “打個招呼就開始” pipeline: start with [docs/video-promo-workflow.md](docs/video-promo-workflow.md) and the scripts in [video-lab/examples/koolo-promo](video-lab/examples/koolo-promo). That path uses site screenshots, image-to-video clips, edge-tts and a 128 BPM synth bed — not HyperFrames or Crew Light. Social captions for the finished film still follow [docs/editorial-guidelines.md](docs/editorial-guidelines.md). Video handoffs stay in `content/video-handoffs/`; never put the MP4 in the image/text Queue.

## Social publishing
Read [skills/crew-social-agent/SKILL.md](skills/crew-social-agent/SKILL.md) and, when creating or reviewing social content, [skills/crew-social-editor/SKILL.md](skills/crew-social-editor/SKILL.md). A passing editorial review is not publication authorization. Keep the existing `draft_handoff_only` / `ready_for_local_agent`, `mode`, safety flags, request IDs, platform states, retries and deduplication semantics. Never rewrite an existing, authorized, scheduled or published Queue item to meet a new editorial rule. Never place video files in the image/text Queue. Video handoffs use their own contract and publisher; only `ready_for_video_publisher` plus `publish_permitted=true`, a due schedule, global live mode and valid credentials can publish. Preserve production publisher safety and idempotency.

## Boundaries
- Never commit API keys, Meta tokens, generated voice secrets or private data.
- Keep temp files, downloaded dependencies and caches out of Git. Generated MP4 and voice assets may be committed only when the owner requests a repository-hosted video handoff and the materials are suitable for that repository's visibility; otherwise keep them out of Git.
- Prefer source-backed educational accuracy; no invented demonstrations, tests or statistics.
- Do not change existing social Queue entries or Meta publication logic for a video request unless explicitly requested.
