---
name: crew-video-storyboard
description: Convert an educational topic into a short Traditional Chinese narration, timed scenes, animated visual metaphors and video-lab story.json.
---
# Script and storyboard

Audience: Taiwanese casual viewers; concise, accessible and mildly witty only where accurate. This is not a copy of the social-post style: captions must be readable and the narration must teach something.

- Hook: 0–3 seconds; a surprising but verified fact or a useful question.
- Explanation: simple causal sequence, one concept per shot.
- Takeaway: concrete action or mental model, not vague promotion.
- Default video size 1080x1920, fps 30, 4–6 scenes in ~24–40 seconds. Timings must fill the entire duration without gaps or overlaps.
- Voiceover should be read aloud; estimate ~3–4 Traditional Chinese characters per second as a starting heuristic, but rely on measured speech duration for final pacing.
- Each scene specifies id, start, duration, title, body, narration and visual instructions. Avoid more than two short lines of large on-screen text.
- Images and motion must describe an idea; a moving background alone is not an explanation.
- Never overstate correlation as causation. If using hypothetical diagrams, label as schematic.

Use video-lab/examples/permissions-101/story.json as schema example. Keep content in JSON, visual implementation in index.html. Readable font 40px+ for captions on 1080-wide portrait; keep essential content away from outer ~80px and bottom platform overlay area.

Before handoff: check source links, total scene duration, narration pacing, initial 3-second hook and final takeaway. Deliver a storyboard storyboard.md only when needed; story.json is the machine-readable contract.
