#!/usr/bin/env python3
"""128 BPM punchy Western-ad music bed + SFX + ducked VO master (-14 LUFS) for Koolo v4."""
from __future__ import annotations
import json, math, wave, array, struct, subprocess, re
from pathlib import Path
import numpy as np

SR = 44100
DUR = 28.000
N = int(round(DUR * SR))
BEAT = 60.0 / 128.0  # 0.46875 s

from kit_paths import WORK, OUTPUT, ensure_dirs
ensure_dirs()
OUT = WORK / "audio"
VO_DIR = WORK / "vo_mix"
OUT.mkdir(parents=True, exist_ok=True)

rng = np.random.default_rng(42)

def read_mono_np(path):
    with wave.open(str(path), "r") as w:
        n = w.getnframes()
        d = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32767.0
    return d

def write_stereo_wav(path, L, R):
    L = np.clip(L, -0.99, 0.99)
    R = np.clip(R, -0.99, 0.99)
    inter = np.empty(len(L) * 2, dtype=np.int16)
    inter[0::2] = np.round(L * 32767.0).astype(np.int16)
    inter[1::2] = np.round(R * 32767.0).astype(np.int16)
    with wave.open(str(path), "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(inter.tobytes())

def add_mono(bufL, bufR, sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    i1 = min(N, i0 + len(sig))
    if i1 <= 0:
        return
    s0 = max(0, -i0)
    d0 = max(0, i0)
    chunk = sig[s0:s0 + (i1 - d0)] * gain
    gl = math.cos((pan + 1.0) * math.pi / 4.0)
    gr = math.sin((pan + 1.0) * math.pi / 4.0)
    bufL[d0:i1] += chunk * gl
    bufR[d0:i1] += chunk * gr

# --- Synth drums & instruments ---
def make_kick(dur=0.22, f_hi=145.0, f_lo=46.0):
    t = np.arange(int(dur * SR)) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.028)
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / 0.085) * (1.0 - np.exp(-t / 0.002))
    click = np.exp(-t / 0.004) * 0.35
    return np.tanh((np.sin(ph) * 0.9 + click) * 1.4) * env * 0.72

def make_sub_impact(dur=0.55):
    t = np.arange(int(dur * SR)) / SR
    f = 42.0 + 95.0 * np.exp(-t / 0.045)
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / 0.19) * (1.0 - np.exp(-t / 0.003))
    thump = rng.normal(0, 0.25, len(t)) * np.exp(-t / 0.025)
    return np.tanh((np.sin(ph) * 0.95 + thump) * 1.3) * env * 0.75

def make_clap(dur=0.17):
    t = np.arange(int(dur * SR)) / SR
    n = rng.normal(0, 1.0, len(t))
    # simple band-ish emphasis via diff + smooth
    hp = np.concatenate([[0.0], np.diff(n)])
    # multi-burst envelope for crisp clap
    env = (np.exp(-t / 0.012) * 0.6 +
           np.exp(-np.maximum(0, t - 0.011) / 0.012) * (t >= 0.011) * 0.7 +
           np.exp(-np.maximum(0, t - 0.022) / 0.048) * (t >= 0.022) * 0.95)
    return hp * env * 0.28

def make_hat(dur=0.06, open_hat=False):
    t = np.arange(int(dur * SR)) / SR
    n = rng.normal(0, 1.0, len(t))
    hp = np.concatenate([[0.0], np.diff(n)])
    hp = np.concatenate([[0.0], np.diff(hp)]) * 0.5
    tau = 0.045 if open_hat else 0.014
    return hp * np.exp(-t / tau) * 0.14

def make_bass(freq, dur):
    t = np.arange(int(dur * SR)) / SR
    # punchy saw-ish + sub
    saw = 0.0
    for k in range(1, 6):
        saw += (1.0 / k) * np.sin(2 * np.pi * freq * k * t)
    sub = np.sin(2 * np.pi * freq * t)
    env = (1.0 - np.exp(-t / 0.006)) * np.exp(-t / (dur * 0.55)) * np.minimum(1.0, (dur - t) / 0.015)
    return (sub * 0.65 + saw * 0.28) * np.maximum(0.0, env) * 0.36

def make_pluck(freq, dur=0.28):
    t = np.arange(int(dur * SR)) / SR
    sig = (0.65 * np.sin(2 * np.pi * freq * t) +
           0.25 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t / 0.06) +
           0.12 * np.sin(2 * np.pi * freq * 3.0 * t) * np.exp(-t / 0.03))
    env = (1.0 - np.exp(-t / 0.004)) * np.exp(-t / 0.11)
    return sig * env * 0.22

def make_pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    sig = np.zeros_like(t)
    for f in freqs:
        sig += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 1.003 * t)
    sig /= max(1, len(freqs))
    env = np.minimum(1.0, t / 0.06) * np.minimum(1.0, (dur - t) / 0.08)
    return sig * np.maximum(0.0, env) * 0.16

def make_riser(dur):
    t = np.arange(int(dur * SR)) / SR
    p = t / dur
    f = 180.0 * (4.5 ** p)
    ph = 2 * np.pi * np.cumsum(f) / SR
    n = rng.normal(0, 1.0, len(t))
    hp = np.concatenate([[0.0], np.diff(n)]) * 0.35
    env = (p ** 1.8) * np.minimum(1.0, (dur - t) / 0.03)
    return (np.sin(ph) * 0.35 + hp * 0.45) * np.maximum(0.0, env) * 0.26

def make_whoosh(dur=0.26):
    t = np.arange(int(dur * SR)) / SR
    p = t / dur
    n = rng.normal(0, 1.0, len(t))
    # simple moving resonance
    f = 320.0 + 1400.0 * np.sin(np.pi * p)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * p) ** 1.4
    return (n * 0.32 + np.sin(ph) * 0.15) * env * 0.24

def make_pop(f0=540.0, f1=980.0, dur=0.075):
    t = np.arange(int(dur * SR)) / SR
    f = f0 + (f1 - f0) * (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = (1.0 - np.exp(-t / 0.003)) * np.exp(-t / 0.024)
    return np.sin(ph) * env * 0.28

def make_tap(dur=0.05):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * 1450 * t) * 0.5 + np.sin(2 * np.pi * 2400 * t) * 0.35) * np.exp(-t / 0.011) * 0.28

def make_chime(dur=0.75):
    t = np.arange(int(dur * SR)) / SR
    freqs = [1046.5, 1318.5, 1568.0, 2093.0]  # C6 E6 G6 C7
    sig = np.zeros_like(t)
    for k, f in enumerate(freqs):
        t0 = k * 0.045
        m = np.maximum(0.0, t - t0)
        e = (t >= t0) * (1.0 - np.exp(-m / 0.004)) * np.exp(-m / 0.24)
        sig += np.sin(2 * np.pi * f * t) * e
    return sig * 0.14

def make_slam(dur=0.18):
    t = np.arange(int(dur * SR)) / SR
    f = 48.0 + 110.0 * np.exp(-t / 0.02)
    ph = 2 * np.pi * np.cumsum(f) / SR
    n = rng.normal(0, 0.3, len(t)) * np.exp(-t / 0.025)
    return (np.sin(ph) * np.exp(-t / 0.07) + n) * 0.38

# Build music bed & SFX separately
musL, musR = np.zeros(N), np.zeros(N)
sfxL, sfxR = np.zeros(N), np.zeros(N)

KICK = make_kick()
SUB = make_sub_impact()
CLAP = make_clap()
HAT_C = make_hat(0.05, False)
HAT_O = make_hat(0.09, True)

# Chord progression (Am - F - C - G) in 2-bar (8 beat) or 1-bar (4 beat) cycles
# Bass roots (Hz): A1=55.0, F1=43.65, C2=65.41, G1=49.0
CHORDS = [
    (55.00, [220.00, 261.63, 329.63, 440.00]),  # Am
    (43.65, [174.61, 220.00, 261.63, 349.23]),  # F
    (65.41, [261.63, 329.63, 392.00, 523.25]),  # C
    (49.00, [196.00, 246.94, 293.66, 392.00]),  # G
]

# 0..4 beats (0.000 - 1.875s): sparse moody hook hits
add_mono(musL, musR, SUB, 0.000, 0.90)
add_mono(musL, musR, SUB, 2.5 * BEAT, 0.85)  # 1.172s
add_mono(musL, musR, make_pad([220.0, 261.63, 329.63], 4 * BEAT), 0.0, 0.55)
for k in range(0, 8):
    add_mono(musL, musR, HAT_C, k * 0.5 * BEAT, 0.35 if k % 2 else 0.55)

# 4..6 beats (1.875 - 2.8125s): energetic drum fill + riser into beat 6
add_mono(musL, musR, make_riser(2 * BEAT), 4 * BEAT, 0.95)
for s in [4.0, 4.5, 5.0, 5.25, 5.5, 5.75]:
    add_mono(musL, musR, CLAP, s * BEAT, 0.65 + 0.1 * (s - 4.0))

# Beats 6..56 (2.8125 - 26.250s): 128 BPM driving groove
for b in range(6, 56):
    tb = b * BEAT
    bar_idx = ((b - 6) // 4) % 4
    root, notes = CHORDS[bar_idx]
    in_bar = (b - 6) % 4

    # Kick on every beat (punchier from beat 31 onward)
    kg = 0.82 if b < 31 else 0.98
    if b in (51,):  # tiny anticipation cut right before CTA beat 52
        pass
    else:
        add_mono(musL, musR, KICK, tb, kg)

    # Claps on 2 & 4 of each bar
    if in_bar in (1, 3) and b != 51:
        add_mono(musL, musR, CLAP, tb, 0.85 if b < 31 else 1.0)

    # Offbeat open hat + 16th hats
    if b != 51:
        add_mono(musL, musR, HAT_C, tb + 0.25 * BEAT, 0.45)
        add_mono(musL, musR, HAT_O, tb + 0.50 * BEAT, 0.65 if b >= 12 else 0.45)
        add_mono(musL, musR, HAT_C, tb + 0.75 * BEAT, 0.50)

    # Pumping offbeat / syncopated bass
    if b != 51:
        add_mono(musL, musR, make_bass(root, 0.40 * BEAT), tb + 0.5 * BEAT, 0.90)
        if in_bar in (0, 2):
            add_mono(musL, musR, make_bass(root * 2.0, 0.28 * BEAT), tb, 0.55)

    # Pad every 4 beats
    if in_bar == 0:
        dur_p = min(4 * BEAT, 26.25 - tb)
        if dur_p > 0.2:
            add_mono(musL, musR, make_pad(notes, dur_p), tb, 0.70)

    # Bright rhythmic pluck melody during friends (12..31) & features (31..50)
    if 12 <= b < 51:
        pat = [notes[0], notes[2], notes[1], notes[3]]
        p0 = pat[in_bar]
        p1 = pat[(in_bar + 1) % 4]
        pan = -0.22 if (b % 2 == 0) else 0.22
        add_mono(musL, musR, make_pluck(p0 * 2.0, 0.22), tb, 0.65, pan=pan)
        if b >= 31:
            add_mono(musL, musR, make_pluck(p1 * 2.0, 0.18), tb + 0.5 * BEAT, 0.50, pan=-pan)

# Riser into CTA (beats 49..52: 22.969 - 24.375s)
add_mono(musL, musR, make_riser(3 * BEAT), 49 * BEAT, 0.90)
for s in [50.5, 51.0, 51.25, 51.5, 51.75]:
    add_mono(musL, musR, CLAP, s * BEAT, 0.75)

# CTA big drop & uplifting resolution (52..60: 24.375 - 28.000s)
add_mono(musL, musR, SUB, 52 * BEAT, 0.85)
add_mono(musL, musR, make_pad([261.63, 329.63, 392.00, 523.25], 1.875), 52 * BEAT, 0.95)
add_mono(musL, musR, make_pluck(523.25, 0.35), 52 * BEAT, 0.75, pan=-0.15)
add_mono(musL, musR, make_pluck(659.25, 0.35), 53 * BEAT, 0.70, pan=0.15)
add_mono(musL, musR, make_pluck(783.99, 0.35), 54 * BEAT, 0.70, pan=-0.15)
add_mono(musL, musR, make_pluck(1046.5, 0.45), 55 * BEAT, 0.75, pan=0.15)

# Beat 56 (26.250s): Final uplifting tonic hit & clean ring-out
add_mono(musL, musR, KICK, 56 * BEAT, 0.85)
add_mono(musL, musR, CLAP, 56 * BEAT, 0.80)
add_mono(musL, musR, make_pad([261.63, 329.63, 392.00, 523.25], 1.72), 56 * BEAT, 0.85)
add_mono(musL, musR, make_chime(0.85), 56 * BEAT, 0.55)

# Smooth master fade out on last 0.45s of music
fade_n = int(0.45 * SR)
musL[-fade_n:] *= np.linspace(1.0, 0.0, fade_n)
musR[-fade_n:] *= np.linspace(1.0, 0.0, fade_n)

# --- Place SFX ---
for t_slam in [0.000, 2.5 * BEAT, 6 * BEAT, 9 * BEAT, 31 * BEAT, 36 * BEAT, 38.5 * BEAT, 43 * BEAT, 45 * BEAT, 47 * BEAT, 49 * BEAT, 52 * BEAT, 56 * BEAT]:
    add_mono(sfxL, sfxR, make_slam(), t_slam, 0.55)

for t_whoosh in [4.8 * BEAT, 30.5 * BEAT, 42.5 * BEAT, 51.4 * BEAT]:
    add_mono(sfxL, sfxR, make_whoosh(0.24), t_whoosh, 0.60)

# Bubble pop right when each friend enters
for t_pop, pan in [(12 * BEAT, -0.2), (16 * BEAT, 0.2), (20 * BEAT, -0.2), (23 * BEAT, 0.2), (27 * BEAT, 0.0)]:
    add_mono(sfxL, sfxR, make_pop(), t_pop, 0.55, pan=pan)

# Tap on Shorts CTA
add_mono(sfxL, sfxR, make_tap(), 15.92, 0.75)

# Chime right on Jenny "Koolo" (24.40 + 0.415 = 24.815s)
add_mono(sfxL, sfxR, make_chime(0.75), 24.82, 0.85)

# --- Place VOs + Build Ducking Envelope ---
# Exact start times of trimmed VO files:
VO_PLACEMENTS = [
    ("01a-hook_trim.wav",       0.000),
    ("01b-hook_trim.wav",       1.175),
    ("02-pain_trim.wav",        2.815),
    ("03-start_trim.wav",       4.100),
    ("g-01-hi_trim.wav",        5.900),   # Zoe mouth open (+0.275s into 5.625s shot)
    ("g-02-ja_trim.wav",        7.720),   # Noah mouth open (+0.220s into 7.500s shot)
    ("g-03-es_trim.wav",       10.030),   # Iris mouth open (+0.655s into 9.375s shot)
    ("g-04-fr_trim.wav",       11.040),   # Max mouth open (+0.259s into 10.781s shot)
    ("g-05-ko_trim.wav",       12.860),   # Yuna mouth open (+0.204s into 12.656s shot)
    ("04-shorts_trim.wav",     14.540),
    ("05-nopressure_trim.wav", 16.820),
    ("06-play_trim.wav",       20.180),
    ("07-cta_trim.wav",        24.400),
]

voL, voR = np.zeros(N), np.zeros(N)
vo_mask = np.zeros(N, dtype=np.float64)

for fname, t0 in VO_PLACEMENTS:
    d = read_mono_np(VO_DIR / fname)
    add_mono(voL, voR, d, t0, 1.0, pan=0.0)
    # Mark active envelope where VO energy exists
    i0 = int(round(t0 * SR))
    win = int(0.02 * SR)
    for k in range(0, len(d), win):
        rms = float(np.sqrt(np.mean(d[k:k+win] ** 2)))
        if rms > 0.012:
            a = max(0, i0 + k - int(0.03 * SR))
            b = min(N, i0 + k + win + int(0.05 * SR))
            vo_mask[a:b] = 1.0

# Smooth ducking envelope (1.0 -> 0.25 ~= -12 dB under speech)
duck = np.ones(N, dtype=np.float64)
cur = 1.0
att = math.exp(-1.0 / (0.035 * SR))
rel = math.exp(-1.0 / (0.140 * SR))
target_arr = 1.0 - 0.75 * vo_mask  # 0.25 when speaking, 1.0 when silent
for i in range(N):
    tgt = target_arr[i]
    c = att if tgt < cur else rel
    cur = c * cur + (1.0 - c) * tgt
    duck[i] = cur

# Mix music (ducked) + SFX (light ducking -4 dB under VO) + VO
sfx_duck = 1.0 - 0.35 * (1.0 - duck)
mixL = musL * duck * 0.62 + sfxL * sfx_duck * 0.72 + voL * 1.15
mixR = musR * duck * 0.62 + sfxR * sfx_duck * 0.72 + voR * 1.15

raw_wav = OUT / "mix_raw_v41.wav"
norm_wav = OUT / "mix_norm_v41.wav"
write_stereo_wav(raw_wav, mixL, mixR)

# Measure raw loudness
res = subprocess.run([
    "ffmpeg", "-y", "-i", str(raw_wav), "-af", "ebur128=peak=true", "-f", "null", "-"
], capture_output=True, text=True, check=True)
m_i = re.findall(r"I:\s+([-\d.]+)\s+LUFS", res.stderr)
m_p = re.findall(r"Peak:\s+([-\d.]+)\s+dBFS", res.stderr)
raw_i = float(m_i[-1])
raw_pk = float(m_p[-1])
gain_db = -13.92 - raw_i
print(f"Raw mix: I={raw_i:.2f} LUFS, TruePeak={raw_pk:.2f} dBFS -> applying +{gain_db:.2f} dB + gentle limiter")

subprocess.run([
    "ffmpeg", "-y", "-i", str(raw_wav),
    "-af", f"aresample=192000,volume={gain_db:.3f}dB,alimiter=level_in=1:level_out=1:limit=0.79:attack=5:release=80:level=false,aresample=44100",
    "-c:a", "pcm_s16le", str(norm_wav)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

res2 = subprocess.run([
    "ffmpeg", "-y", "-i", str(norm_wav), "-af", "ebur128=peak=true", "-f", "null", "-"
], capture_output=True, text=True, check=True)
m_i2 = re.findall(r"I:\s+([-\d.]+)\s+LUFS", res2.stderr)
m_p2 = re.findall(r"Peak:\s+([-\d.]+)\s+dBFS", res2.stderr)
import shutil
shutil.copy2(norm_wav, OUTPUT / "mix_norm_v41.wav")
print(f"Mastered mix_norm_v41.wav: I={float(m_i2[-1]):.2f} LUFS, TruePeak={float(m_p2[-1]):.2f} dBFS")
print("also copied to", OUTPUT / "mix_norm_v41.wav")

# Save placement metadata for sync QA
(OUT / "placements_v41.json").write_text(json.dumps(VO_PLACEMENTS, indent=2))
