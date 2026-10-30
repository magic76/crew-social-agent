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

Status progression: project_draft → rendered → verified → ready_for_video_publisher → published. Video status must not reuse image-only Queue's live flag.

Do not put video content under content/queue/*.json: the current local-publisher expects image:null or an image and may route to text/image APIs. Replacing .jpg with .mp4 is NOT valid. Keep videos in video-lab/outbox or a future separate video/queue schema until true Threads VIDEO and Facebook Reels uploaders are implemented and tested.

Before live publication, verify media format and file size vs current Meta API, separate platform IDs, persistent idempotency journal, long-running upload/processing status, remote receipt, and reconciliation on ambiguous timeouts. Never silently downgrade a requested video to a text or image post.

GitHub is ideal for source and skills; production MP4s may need external object storage to avoid Git repository bloat and Meta URL fetch constraints. Report actual uploaded links rather than inventing a public URL. This repo does not yet publish videos.
