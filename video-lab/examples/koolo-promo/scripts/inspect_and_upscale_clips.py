#!/usr/bin/env python3
"""Extract inspection frames from 3s I2V clips, then upscale a chosen 2s window to 1080x1920 30fps.

Default windows are the ones used for v4 (mouth-open / wave, avoiding late-clip morphing).
Override with --windows zoe=0.65,1.92 if you generated new clips.
"""
from __future__ import annotations
import argparse, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from kit_paths import CLIPS, WORK, OUTPUT, cjk_font, ensure_dirs

# v4.1 chosen windows: (start_sec, duration_sec). Iris and Max are trimmed short to avoid artifacts.
DEFAULT_WINDOWS = {
    "zoe":  (0.65, 1.92),
    "noah": (0.50, 1.92),
    "iris": (0.21, 1.45),  # stop before brush covers the face (~1.71s) and tip distorts (~2.25s)
    "max":  (0.48, 1.90),  # stop before 2.50s lower-edge double-arm morph
    "yuna": (0.75, 1.92),
}
NAMES = list(DEFAULT_WINDOWS)
TIMES = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 2.95]


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def inspect(name: str, mp4: Path, outdir: Path, font) -> Path:
    d = outdir / name
    d.mkdir(parents=True, exist_ok=True)
    for t in TIMES:
        run(["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(mp4), "-map", "0:v:0",
             "-frames:v", "1", str(d / f"{t:.2f}.png")])
    tw, th = 216, 384
    cols, rows = 7, 2
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 8, rows * (th + 32) + 50), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    dr.text((12, 10), f"{name.upper()} — inspect 0.00s to 2.95s (map 0:v:0 only)", font=font, fill=(245, 245, 245))
    for i, t in enumerate(TIMES):
        c, r = i % cols, i // cols
        x = 8 + c * (tw + 8)
        y = 44 + r * (th + 32)
        im = Image.open(d / f"{t:.2f}.png").resize((tw, th), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y))
        dr.text((x + 6, y + th + 4), f"{t:.2f}s", font=font, fill=(130, 230, 180))
    dest = outdir / f"inspect-{name}.jpg"
    sheet.save(dest, quality=90)
    print("wrote", dest)
    return dest


def upscale(name: str, mp4: Path, ss: float, dur: float, dest_dir: Path) -> int:
    dest_dir.mkdir(parents=True, exist_ok=True)
    for p in dest_dir.glob("*.png"):
        p.unlink()
    # Must map 0:v:0 — these clips often have an attached MJPEG thumbnail as 0:v:1
    run([
        "ffmpeg", "-y", "-ss", f"{ss:.3f}", "-t", f"{dur:.3f}",
        "-i", str(mp4), "-map", "0:v:0",
        "-vf", "fps=30,scale=1080:1920:flags=lanczos,unsharp=5:5:0.55:3:3:0.0",
        str(dest_dir / "f%04d.png"),
    ])
    n = len(list(dest_dir.glob("*.png")))
    print(f"{name:5} ss={ss:.2f} dur={dur:.2f} -> {n} frames at 1080x1920 30fps")
    return n


def main():
    ensure_dirs()
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", default=str(CLIPS))
    ap.add_argument("--inspect-only", action="store_true")
    ap.add_argument("--windows", default="",
                    help="Override windows, e.g. zoe=0.65,1.92:iris=0.21,1.45")
    args = ap.parse_args()
    windows = dict(DEFAULT_WINDOWS)
    if args.windows:
        for part in args.windows.split(":"):
            name, rest = part.split("=")
            ss, dur = rest.split(",")
            windows[name.strip()] = (float(ss), float(dur))
    try:
        fp, idx = cjk_font(False)
        font = ImageFont.truetype(fp, 22, index=idx)
    except Exception:
        font = ImageFont.load_default()

    insp = WORK / "clip_inspect"
    insp.mkdir(parents=True, exist_ok=True)
    clips = Path(args.clips)
    for name in NAMES:
        mp4 = clips / f"{name}.mp4"
        if not mp4.exists():
            print("MISSING clip:", mp4, file=sys.stderr)
            continue
        inspect(name, mp4, insp, font)
        if not args.inspect_only:
            ss, dur = windows[name]
            upscale(name, mp4, ss, dur, WORK / "up_clips" / name)


if __name__ == "__main__":
    main()
