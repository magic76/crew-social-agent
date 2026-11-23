#!/usr/bin/env python3
import asyncio, json, subprocess, wave, array, math, struct
from pathlib import Path
import edge_tts

from kit_paths import WORK, ensure_dirs
ensure_dirs()
OUT = WORK / "vo"
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100
NARR = "zh-TW-HsiaoChenNeural"

ITEMS = [
    ("01a-hook",      "背了十年單字，",                 NARR, "+6%", "+2Hz"),
    ("01b-hook",      "還是不敢開口？",                 NARR, "+7%", "+5Hz"),
    ("02-pain",       "別再一個人練習了！",             NARR, "+11%", "+4Hz"),
    ("03-start",      "打個招呼，就開始！",             NARR, "+13%", "+4Hz"),
    ("g-01-hi",       "Hi!",                           "en-US-JennyNeural",  "+12%", "+8Hz"),
    ("g-02-ja",       "こんにちは！",                   "ja-JP-NanamiNeural", "+10%", "+5Hz"),
    ("g-03-es",       "¡Hola!",                        "es-MX-DaliaNeural",  "+12%", "+6Hz"),
    ("g-04-fr",       "Bonjour !",                     "fr-FR-DeniseNeural", "+10%", "+5Hz"),
    ("g-05-ko",       "안녕!",                         "ko-KR-SunHiNeural",  "+12%", "+6Hz"),
    ("04-shorts",     "看到喜歡的，直接跟朋友聊！",      NARR, "+11%", "+4Hz"),
    ("05-nopressure", "不必準備話題，不考試，也不強迫糾錯。", NARR, "+12%", "+3Hz"),
    ("06-play",       "玩遊戲、讀故事、看運勢，一起玩著學語言！", NARR, "+11%", "+4Hz"),
    ("07a-lai",       "來",                            NARR, "+8%", "+3Hz"),
    ("07b-koolo",     "Koolo",                         "en-US-JennyNeural",  "-6%", "+4Hz"),
    ("07c-rest",      "打個招呼，免費開始！",           NARR, "+9%", "+4Hz"),
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

def trim_clip(fs, head=0.03, tail=0.06):
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
    g = target / pk
    return [x * g for x in fs]

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
    # Also save trimmed version ready for exact placement
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
        print(f"{info['id']:14} trim={info['trim_dur']:5.3f}s  speech={st0:5.3f}-{st1:5.3f} ({info['speech_dur']:5.3f}s)  {info['text']}")

    # Splice 07-cta: 來 + Koolo (Jenny) + 打個招呼，免費開始！
    lai = read_mono(OUT / "07a-lai_trim.wav")
    koo = read_mono(OUT / "07b-koolo_trim.wav")
    rest = read_mono(OUT / "07c-rest_trim.wav")
    G1, G2 = 0.055, 0.070
    spliced = lai + [0.0]*int(G1*SR) + koo + [0.0]*int(G2*SR) + rest
    write_mono(OUT / "07-cta_trim.wav", spliced)

    t_lai = 0.0
    t_koo = len(lai)/SR + G1
    t_rest = t_koo + len(koo)/SR + G2
    cta_words = []
    for w in meta["07a-lai"]["words_trim"]:
        cta_words.append({"text": w["text"], "offset": round(t_lai + w["offset"], 4), "dur": w["dur"]})
    for w in meta["07b-koolo"]["words_trim"]:
        cta_words.append({"text": w["text"], "offset": round(t_koo + w["offset"], 4), "dur": w["dur"]})
    for w in meta["07c-rest"]["words_trim"]:
        cta_words.append({"text": w["text"], "offset": round(t_rest + w["offset"], 4), "dur": w["dur"]})

    meta["07-cta"] = {
        "id": "07-cta",
        "text": "來 Koolo 打個招呼，免費開始！",
        "trim_dur": round(len(spliced)/SR, 4),
        "koolo_window": [round(t_koo + meta["07b-koolo"]["speech_in_trim"][0], 4),
                         round(t_koo + meta["07b-koolo"]["speech_in_trim"][1], 4)],
        "words_trim": cta_words,
    }
    print(f"07-cta         trim={meta['07-cta']['trim_dur']:5.3f}s  koolo={meta['07-cta']['koolo_window']}")
    (OUT / "meta_final.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

asyncio.run(main())
