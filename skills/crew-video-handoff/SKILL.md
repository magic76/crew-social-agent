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

Production may progress from project draft through render and verification to handoff. The actual handoff `status` values accepted by the current publisher are `draft_handoff_only`, `ready_for_video_publisher`, and `published`. Do not reuse the image-only Queue's `mode=live` field for videos.

Do not put video content under `content/queue/*.json`. Keep it under `content/video-handoffs/` with the separate schema; replacing `.jpg` with `.mp4` is invalid. A handoff must include `schema_version`, a stable `id`, `created_date`, `status`, `publish_permitted`, `schedule`, `platforms`, platform captions with fixed UUID `requestId`s, and MP4 metadata (`path`, public HTTPS URL, byte size, SHA-256, width, height, fps and duration). The publisher verifies the MP4, public URL and hash before publishing. Keep `draft_handoff_only` and `publish_permitted=false` until the owner authorizes publication.

## Local video publisher contract

Check the current `local-publisher/video.js` before changing a handoff. By default deliver `status: "draft_handoff_only"`, `publish_permitted: false`, a null schedule, and Facebook/Threads drafts; the owner's local Agent handles Meta publishing. Preserve existing explicit user authorization or instructions about release and scheduling.

For an authorized release, the publisher checks all of the following:

- `status` is the **string** `"ready_for_video_publisher"`, `publish_permitted` is `true`, and `schedule` has a valid `date` (`YYYY-MM-DD`), `time` (`HH:mm`) and IANA `timezone`. Schedule must be due and not expired; `SOCIAL_MAX_LATE_MINUTES` defaults to 180.
- The local Agent runs with `SOCIAL_AGENT_MODE=live`, is not paused, and has the credentials for each target platform. In dry-run it does not send. `run-once` and daemon cycles process the entire eligible queue, not only one video.
- The handoff, platform text and fixed UUID request IDs validate; the local MP4's size, SHA-256 and parsed metadata match. Before sending to each platform, the publisher downloads the allowlisted public HTTPS URL and checks its bytes, size and SHA-256. A Git blob match alone is not a public download test.
- Each platform has its own durable task. Published, skipped, expired and `needs_reconciliation` tasks are not automatically resent. On an ambiguous result inspect Meta and reconcile; retry only after confirming the post was not published.

The optional separate boolean `ready_for_video_publisher` and `qa_status` are **not checked** as gates by the current publisher. Keep QA accurate and complete as a production requirement, but never claim those fields alone prevent publication. Setting the real gates and a due schedule can trigger posting at the next local cycle without a further confirmation; do not change them merely to test. Report each platform's actual result and any checks that could not be executed.

Before live publication, verify media format and size, separate platform IDs, persistent idempotency journal, provider processing status, remote receipt, and reconciliation on ambiguous timeouts. The current cross-post profile is MP4, H.264/HEVC, 9:16, 540×960 minimum, 23–60 fps, 4–60 seconds, up to 1 GB. Never silently downgrade a requested video to a text or image post.

GitHub is used for this repository's handoff and public test media. Larger production MP4s should use a trusted public host allowlisted by `SOCIAL_VIDEO_HOSTS` to avoid repository bloat. Report only actual Meta post links; never construct or invent one.
