---
name: crew-video-handoff
description: Package a verified Crew educational MP4 with its source, captions, claims/credits and metadata for a separate video publishing Agent.
---
# Handoff / distribution

Deliver in a versioned directory:
- index.html and story.json (editable source, scene timing)
- assets/ for licensed images, voice and other actual media
- output.mp4 (only if actually rendered), captions.srt (when narrated)
- sources.md or source ledger in story.json, credits.md, qa.json
- manifest.json: id, created_at, duration, width, height, fps, format, file SHA-256, public_media_url (only if uploaded), suggested caption, platforms, status.

Status progression: project_draft → rendered → verified → draft_handoff_only → ready_for_video_publisher → published. Do not reuse the image-only Queue's `mode=live` field for videos.

Do not put video content under `content/queue/*.json`. Keep it under `content/video-handoffs/` with the separate schema; replacing `.jpg` with `.mp4` is invalid. A handoff must include `schema_version`, a stable `id`, `created_date`, `status`, `publish_permitted`, `schedule`, `platforms`, platform captions with fixed UUID `requestId`s, and MP4 metadata (`path`, public HTTPS URL, byte size, SHA-256, width, height, fps and duration). The publisher verifies the MP4, public URL and hash before any API call. `draft_handoff_only` and `publish_permitted=false` must remain blocked until explicitly approved by the owner.

Before live publication, verify media format and size, separate platform IDs, persistent idempotency journal, provider processing status, remote receipt, and reconciliation on ambiguous timeouts. The current cross-post profile is MP4, H.264/HEVC, 9:16, 540×960 minimum, 23–60 fps, 4–60 seconds, up to 1 GB. Never silently downgrade a requested video to a text or image post.

GitHub is used for this repository's handoff and public test media. Larger production MP4s should use a trusted public host allowlisted by `SOCIAL_VIDEO_HOSTS` to avoid repository bloat. Report only actual Meta post links; never construct or invent one.
