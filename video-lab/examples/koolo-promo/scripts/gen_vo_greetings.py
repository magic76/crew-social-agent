#!/usr/bin/env python3
"""Generate distinctly gendered/timbred greeting VOs for v4.1 (audio-only)."""
import asyncio, json, subprocess, wave, array, math, struct
from pathlib import Path
import edge_tts

from kit_paths import WORK, ensure_dirs
ensure_dirs()
OUT = WORK / "vo_v41"
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100

# Distinct voices matching character gender/personality.
# Zoe uses Ana (young/bright US) so she does not share Jenny with the "Koolo" CTA.
ITEMS = [
    ("g-01-hi", "Hi!",           "en-US-AnaNeural",       "+8%",  "+4Hz"),   # Zoe: female, warm-young, clearly not Jenny
    ("g-02-ja", "こんにちは！",   "ja-JP-KeitaNeural",     "+2%",  "-2Hz"),   # Noah: male, calm
    ("g-03-es", "¡Hola!",        "es-ES-ElviraNeural",    "+14%", "+8Hz"),   # Iris: female, playful/bright
    ("g-04-fr", "Bonjour !",     "fr-FR-HenriNeural",     "+14%", "+5Hz"),   # Max: male, energetic
    ("g-05-ko", "안녕!",         "ko-KR-SunHiNeural",     "+8%",  "+10Hz"),  # Yuna: female, soft, slightly higher
]

def read_mono(path):
    with wave.open(str(path), "r") as w:
        n = w.getnframes()
        d = array.array("h"); d.frombytes(w.readframes(n))
    return [x / 32767.0 for x in d]

def write_mono(path, fs):
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        buf = bytearray()
        for x in fs:
            buf += struct.pack("<h", max(-32767, min(32767, int(round(x * 32767)))))
        w.writeframes(buf)

def speech_span(fs, thresh=180/32767.0):
    win = int(SR * 0.01)
    act = []
    for i in range(0, len(fs), win):
        c = fs[i:i+win]
        if math.sqrt(sum(x*x for x in c)/max(1,len(c))) > thresh:
            act.append(i / SR)
    return (act[0], act[-1] + 0.01) if act else (0.0, len(fs)/SR)

def trim_clip(fs, head=0.025, tail=0.05):
    s, e = speech_span(fs)
    a = max(0, int((s - head) * SR))
    b = min(len(fs), int((e + tail) * SR))
    clip = list(fs[a:b])
    fi, fo = min(len(clip)//4, int(0.010*SR)), min(len(clip)//4, int(0.015*SR))
    for i in range(fi):
        clip[i] *= 0.5 * (1 - math.cos(math.pi * i / fi))
    for i in range(fo):
        clip[len(clip)-1-i] *= 0.5 * (1 - math.cos(math.pi * i / fo))
    return clip, a/SR, b/SR, s, e

def peak_norm(fs, target=0.72):
    pk = max(abs(x) for x in fs) or 1e-9
    return [x * (target / pk) for x in fs]

async def synth_one(item):
    cid, text, voice, rate, pitch = item
    mp3 = OUT / f"{cid}.mp3"
    wav = OUT / f"{cid}.wav"
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words, audio_bytes = [], bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append({
                "text": chunk["text"],
                "offset": round(chunk["offset"] / 1e7, 4),
                "dur": round(chunk["duration"] / 1e7, 4),
            })
    mp3.write_bytes(audio_bytes)
    subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(wav)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fs = read_mono(wav)
    s, e = speech_span(fs)
    tclip, ta, tb, _, _ = trim_clip(fs, head=0.025, tail=0.05)
    tclip = peak_norm(tclip, 0.72)
    write_mono(OUT / f"{cid}_trim.wav", tclip)
    remapped = [{"text": w["text"], "offset": round(w["offset"] - ta, 4), "dur": w["dur"]} for w in words]
    return {
        "id": cid, "text": text, "voice": voice, "rate": rate, "pitch": pitch,
        "file_dur": round(len(fs)/SR, 4),
        "trim_dur": round(len(tclip)/SR, 4),
        "speech_in_trim": [round(s - ta, 4), round(e - ta, 4)],
        "speech_dur": round(e - s, 4),
        "words_trim": remapped,
    }

async def main():
    meta = {}
    for item in ITEMS:
        info = await synth_one(item)
        meta[info["id"]] = info
        st0, st1 = info["speech_in_trim"]
        print(f"{info['id']:8} {info['voice']:24} {info['rate']:>5} {info['pitch']:>5}  "
              f"trim={info['trim_dur']:5.3f}s  speech={st0:5.3f}-{st1:5.3f} ({info['speech_dur']:5.3f}s)  {info['text']}")
    (OUT / "meta_greetings.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

asyncio.run(main())
