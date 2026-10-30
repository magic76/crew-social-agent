---
name: crew-video-lab
description: Produce reusable short educational videos for Crew Lab SI, from verified research to storyboard, HTML animation, narration, subtitles, deterministic render, QA and handoff. Use when asked to make a 科普影片, 教學短片, HTML 特效影片, Reels or programmatic MP4.
---
# Crew Video Lab — orchestrator

This is the canonical entry point. Read the entire Skill before creating videos. Work from the local repository root. The output is a real independently reproducible video project, not a prose prompt.

## Production pipeline
1. **Research** — read [../crew-video-research/SKILL.md](../crew-video-research/SKILL.md). Verify material claims and identify which are facts, estimates or examples. Include dated original links.
2. **Story** — read [../crew-video-storyboard/SKILL.md](../crew-video-storyboard/SKILL.md). Write short voiceover, an explicit hook and takeaway, and shot timing in story.json.
3. **Animate** — read [../crew-video-hyperframes/SKILL.md](../crew-video-hyperframes/SKILL.md). Default to HTML/SVG/CSS with a seekable GSAP timeline and HyperFrames; consult its official Skills for framework-specific details. Motion Canvas or Remotion is optional; see [../crew-video-remotion/SKILL.md](../crew-video-remotion/SKILL.md).
4. **Voice/captions** — read [../crew-video-audio/SKILL.md](../crew-video-audio/SKILL.md). Record or synthesize authorized narration, generate captions and align every beat.
5. **QA** — read [../crew-video-qa/SKILL.md](../crew-video-qa/SKILL.md). Validate story and HTML, lint/check composition, render real MP4 and review sampled frames and sound.
6. **Handoff** — read [../crew-video-handoff/SKILL.md](../crew-video-handoff/SKILL.md). Package source, video, caption file, credits, QA report; do not use the existing image-only Social Queue for video.

## Default specification
- Portrait 1080 × 1920, 30 fps; 20–45 s for a first version; accessible margins.
- Traditional Chinese copy/voice/subtitles for Taiwan; correct Traditional Chinese glyphs and punctuation.
- Aim for 4–6 scenes; 1 idea per scene; no wall of text, fake interfaces, or misleading visual emphasis.
- Minimal warm editorial visuals: dark/slate base, one accent color, strong typography, clear SVG symbols. Avoid noisy backgrounds, unreadable fine print, watermark, copyrighted stock.
- Narrative: what happened / how it works / why it matters / one takeaway. Distinguish explanatory illustration from an actual reconstruction.
- Use sourced facts, not model speculation. Headlines and numerical claims must be fact checked.
- Generate distinct production IDs/slugs. Never replace other video projects without approval.

## Starting a new video
Copy video-lab/examples/permissions-101 to a unique folder in video-lab/work/<slug>. Change story.json and index.html together. Run:

~~~sh
node scripts/video-lab.mjs validate video-lab/work/<slug>
node scripts/video-lab.mjs check video-lab/work/<slug>
node scripts/video-lab.mjs preview video-lab/work/<slug>
node scripts/video-lab.mjs render video-lab/work/<slug>
~~~

Preview and render require HyperFrames and its browser/FFmpeg prerequisites on the executing machine. Check installed CLI help before changing flags. The starter is intentionally a **silent HTML animation demo** until narration is supplied. Do not imply voice/audio is present.

## Framework Skill source (install locally as needed)
- HyperFrames: https://github.com/heygen-com/hyperframes ; command: npx hyperframes skills update
- Remotion: https://github.com/remotion-dev/skills ; command: npx skills add remotion-dev/skills
- Use framework-native up-to-date rules instead of copying/vendor-locking their changing full skill catalogs.
- Repo-owned Skill files here are the stable editorial and safety contract. Framework Skills are tooling knowledge.

## Acceptance definition
A completed video must have story.json, index.html, source/credit ledger, optional licensed assets + audio, successful render, mp4 metadata (resolution/fps/duration), reviewed keyframes, subtitles where speech exists, and an honest QA summary. For a scaffold, state that it is NOT YET a rendered or voice-ready video.
