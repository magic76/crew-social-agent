#!/usr/bin/env python3
"""Retimes this project from the seven verified Crew Web TTS WAV files."""
from __future__ import annotations

import hashlib
import html as html_lib
import json
import re
import subprocess
import wave
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[2]
LEAD_IN = 0.45
SCENE_GAP = 1.50
END_HOLD = 2.70
VOICE_STYLE = (
    "Natural Taiwan Mandarin (zh-TW); calm, warm, conversational explanation; "
    "consistent one-take flow, subtle pauses, clear articulation. Do not add or omit words."
)
CAPTIONS = {
    "scene1": "我最近讓 Grok 當監工，\nChatGPT 當工程師。",
    "scene2": "我說出想做的功能，Grok 拆成任務，\n交給 ChatGPT 寫程式。",
    "scene3": "寫完不是就算了。Grok 還會看測試、\n檢查畫面，找出問題。",
    "scene4": "找到問題，再請 ChatGPT 修。\n修完繼續驗收，直到結果能用。",
    "scene5": "我的 Crew Magic，\n就是這樣一步步改出來的。",
    "scene6": "以前 AI 寫完，我還要花好多時間自己驗收。\n現在 Grok 先做掉大半。",
    "scene7": "我專心決定方向，再確認最後成果。\n這才像有一個真的 AI 團隊。",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=codec_name,sample_rate,channels,bits_per_sample",
            "-show_entries", "format=duration,size", "-of", "json", str(path),
        ],
        check=True, capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    duration = float(data["format"]["duration"])
    if (stream.get("codec_name") != "pcm_s16le"
            or stream.get("sample_rate") != "24000"
            or stream.get("channels") != 1
            or stream.get("bits_per_sample") != 16):
        raise SystemExit(f"Unexpected WAV format: {path}: {stream}")
    return {"duration": duration, "stream": stream, "bytes": int(data["format"]["size"])}


def timecode(seconds: float) -> str:
    total_ms = round(seconds * 1000)
    hours, rest = divmod(total_ms, 3_600_000)
    minutes, rest = divmod(rest, 60_000)
    secs, millis = divmod(rest, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def seconds(value: float) -> str:
    return f"{value:.3f}".rstrip("0").rstrip(".")


def main() -> None:
    story_path = PROJECT / "story.json"
    jobs_path = PROJECT / "voice-jobs.json"
    story = json.loads(story_path.read_text(encoding="utf-8"))
    jobs = json.loads(jobs_path.read_text(encoding="utf-8"))
    queue_path = REPO / "content/video-tts/requests/index.json"
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    queue_jobs = {job["id"]: job for job in queue.get("jobs", [])}
    voice_jobs = {job["scene"]: job for job in jobs["jobs"]}
    scenes = story["scenes"]
    if len(scenes) != 7 or set(CAPTIONS) != {scene["id"] for scene in scenes}:
        raise SystemExit("Expected exactly the seven documented scenes/captions")

    cursor = LEAD_IN
    results = []
    srt = []
    audio_elements = []
    for index, scene in enumerate(scenes):
        voice_job = voice_jobs.get(scene["id"])
        if not voice_job or voice_job["id"] not in queue_jobs:
            raise SystemExit(f"Missing queued job for {scene['id']}")
        if queue_jobs[voice_job["id"]]["text"].strip() != scene["narration"].strip():
            raise SystemExit(f"Queued text differs from narration for {scene['id']}")
        caption = CAPTIONS[scene["id"]]
        if caption.replace("\n", "") != scene["narration"]:
            raise SystemExit(f"Caption text differs from narration for {scene['id']}")
        wav_path = PROJECT / "assets/voice" / f"{scene['id']}.wav"
        if not wav_path.is_file():
            raise SystemExit(f"Missing WAV: {wav_path}")
        measured = probe(wav_path)
        scene_start = 0.0 if index == 0 else cursor
        voice_start = scene_start + LEAD_IN if index == 0 else scene_start
        voice_end = voice_start + measured["duration"]
        tail = END_HOLD if index == len(scenes) - 1 else SCENE_GAP
        scene_end = voice_end + tail
        scene["start"] = round(scene_start, 3)
        scene["duration"] = round(scene_end - scene_start, 3)
        scene["voice_start"] = round(voice_start, 3)
        scene["voice_duration"] = round(measured["duration"], 3)
        scene["voice_file"] = f"assets/voice/{scene['id']}.wav"
        cursor = scene_end

        result = {
            "scene": scene["id"],
            "id": voice_job["id"],
            "http_status": 200,
            "content_type": "audio/wav",
            "status": "downloaded_and_verified",
            "file": scene["voice_file"],
            "duration_seconds": round(measured["duration"], 3),
            "bytes": measured["bytes"],
            "sha256": sha256(wav_path),
            "sample_rate_hz": 24000,
            "channels": 1,
            "sample_format": "pcm_s16le",
            "result_url": jobs["result_endpoint"] + "?id=" + voice_job["id"],
        }
        voice_job.update(result)
        results.append(result)
        srt.append(
            f"{index + 1}\n{timecode(voice_start)} --> {timecode(voice_end)}\n{caption}\n"
        )
        audio_elements.append(
            f'  <audio id="voice-{scene["id"]}" src="assets/voice/{scene["id"]}.wav" '
            f'data-start="{seconds(voice_start)}" data-volume="1"></audio>'
        )

    total_duration = round(cursor, 3)
    story["video"]["duration"] = total_duration
    story["audio_timing"] = {
        "lead_in_seconds": LEAD_IN,
        "gap_between_scenes_seconds": SCENE_GAP,
        "end_hold_seconds": END_HOLD,
        "timeline_source": "ffprobe durations of the downloaded scene WAVs",
    }
    silence_path = PROJECT / "assets/voice/end-silence.wav"
    silence_frames = round(END_HOLD * 24000)
    with wave.open(str(silence_path), "wb") as silence:
        silence.setnchannels(1)
        silence.setsampwidth(2)
        silence.setframerate(24000)
        silence.writeframes(b"\0\0" * silence_frames)
    final_scene = scenes[-1]
    tail_start = final_scene["voice_start"] + final_scene["voice_duration"]
    audio_elements.append(
        f'  <audio id="narration-end-silence" src="assets/voice/end-silence.wav" '
        f'data-start="{seconds(tail_start)}" data-volume="1"></audio>'
    )

    html_path = PROJECT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    html, replaced = re.subn(
        r'(<div id="root"[^>]*data-duration=")[^"]+("[^>]*>)',
        lambda match: match.group(1) + seconds(total_duration) + match.group(2),
        html, count=1,
    )
    if replaced != 1:
        raise SystemExit("Could not update the root duration in index.html")
    for scene in scenes:
        pattern = re.compile(
            rf'(<section id="{re.escape(scene["id"])}" class="clip" data-start=")[^"]+'
            rf'(" data-duration=")[^"]+(")'
        )
        html, replaced = pattern.subn(
            lambda match, current=scene: (
                match.group(1) + seconds(current["start"]) + match.group(2)
                + seconds(current["duration"]) + match.group(3)
            ),
            html, count=1,
        )
        if replaced != 1:
            raise SystemExit(f"Could not update HTML timing for {scene['id']}")

    html = re.sub(
        r'\s*<div class="caption" id="caption-scene[1-7]">.*?</div>',
        "",
        html,
        flags=re.S,
    )
    for scene in scenes:
        caption = html_lib.escape(CAPTIONS[scene["id"]]).replace("\n", "<br>")
        pattern = re.compile(rf'(<section id="{re.escape(scene["id"])}"[^>]*>.*?)(</section>)', re.S)
        html, replaced = pattern.subn(
            lambda match, current=scene, text=caption: (
                match.group(1)
                + f'<div class="caption" id="caption-{current["id"]}">{text}</div>'
                + match.group(2)
            ),
            html,
            count=1,
        )
        if replaced != 1:
            raise SystemExit(f"Could not insert HTML subtitle for {scene['id']}")

    html = re.sub(
        r'\s*<audio id="(?:voice-scene[1-7]|narration-end-silence)"[^>]*></audio>',
        "",
        html,
    )
    root_match = re.search(r'(<div id="root"[^>]*>)', html)
    if not root_match:
        raise SystemExit("Could not find root composition")
    html = html[:root_match.end()] + "\n" + "\n".join(audio_elements) + html[root_match.end():]

    timeline = [
        '<script>',
        'window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});',
    ]
    for index, scene in enumerate(scenes):
        start = scene["start"]
        duration = scene["duration"]
        selector = f'"#{scene["id"]}"'
        timeline.extend([
            f'tl.set({selector},{{opacity:1}},{seconds(start)});',
            f'tl.from("#{scene["id"]} h1",{{opacity:0,y:70,duration:.8,ease:"power3.out"}},{seconds(start + .15)});',
            f'tl.from("#{scene["id"]} .diagram",{{opacity:0,y:100,scale:.86,duration:.9,ease:"power3.out"}},{seconds(start + .55)});',
            f'tl.from("#{scene["id"]} p",{{opacity:0,y:40,duration:.6}},{seconds(start + 1.35)});',
            f'tl.to("#{scene["id"]} .diagram",{{scale:1.025,duration:{seconds(duration - 1.75)},ease:"none"}},{seconds(start + 1.5)});',
            f'tl.fromTo("#caption-{scene["id"]}",{{opacity:0,y:12}},{{opacity:1,y:0,duration:.18,ease:"power2.out"}},{seconds(scene["voice_start"])});',
            f'tl.to("#caption-{scene["id"]}",{{opacity:0,y:-6,duration:.12,ease:"power1.in"}},{seconds(scene["voice_start"] + scene["voice_duration"] - .12)});',
        ])
        if index < len(scenes) - 1:
            timeline.append(
                f'tl.to({selector},{{opacity:0,duration:.24}},{seconds(start + duration - .24)});'
            )
    timeline.extend(['window.__timelines["main"]=tl;', '</script>'])
    html, replaced = re.subn(
        r'<script>\s*window\.__timelines=.*?</script>',
        "\n".join(timeline),
        html,
        count=1,
        flags=re.S,
    )
    if replaced != 1:
        raise SystemExit("Could not replace the GSAP timeline")
    html_path.write_text(html, encoding="utf-8")

    (PROJECT / "captions.srt").write_text("\n".join(srt).rstrip() + "\n", encoding="utf-8")
    jobs["status"] = "completed_verified"
    jobs["voice_style"] = VOICE_STYLE
    jobs["style_control"] = "Worker applies one fixed style; desired_emotion fields are editorial notes, not per-job model controls."
    jobs["timing"] = story["audio_timing"]
    jobs["results"] = results
    jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    story_path.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "retimed_from_verified_wavs",
        "duration_seconds": total_duration,
        "scene_count": len(scenes),
        "voice_durations": [result["duration_seconds"] for result in results],
        "gap_seconds": SCENE_GAP,
        "end_hold_seconds": END_HOLD,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
