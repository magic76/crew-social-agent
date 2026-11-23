#!/usr/bin/env python3
"""Pad official 1024x1024 friend portraits to 1080x1920 (9:16) with a blurred fill."""
from __future__ import annotations
import argparse, sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw

from kit_paths import PORTRAITS, OUTPUT, ensure_dirs

NAMES = ["zoe", "noah", "iris", "max", "yuna"]
W, H = 1080, 1920


def one(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    # Cover-scale a blurred copy to fill 9:16
    bg = im.convert("RGB")
    scale = max(W / bg.width, H / bg.height) * 1.15
    bw, bh = int(bg.width * scale), int(bg.height * scale)
    bg = bg.resize((bw, bh), Image.Resampling.LANCZOS)
    bg = bg.crop(((bw - W) // 2, (bh - H) // 2, (bw - W) // 2 + W, (bh - H) // 2 + H))
    bg = bg.filter(ImageFilter.GaussianBlur(28))
    # Place the original square in the upper-middle, slightly larger than the frame width
    side = 1080
    fg = im.resize((side, side), Image.Resampling.LANCZOS)
    # Feather the square's edges so it blends into the bokeh
    mask = Image.new("L", (side, side), 255)
    md = ImageDraw.Draw(mask)
    fade = 48
    for i in range(fade):
        a = int(255 * (i / fade))
        md.rectangle((i, i, side - 1 - i, side - 1 - i), outline=a)
    y = 220  # sit the face in the upper half
    canvas = bg.convert("RGBA")
    canvas.paste(fg, ((W - side) // 2, y), Image.merge("RGBA", (*fg.split()[:3], mask)) if fg.mode == "RGBA" else fg)
    # simpler paste with an alpha mask
    out = bg.convert("RGB")
    fg_rgb = fg.convert("RGB")
    out.paste(fg_rgb, ((W - side) // 2, y), mask)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG")
    print(f"wrote {dest} {out.size}")


def main():
    ensure_dirs()
    ap = argparse.ArgumentParser(description="Pad crew_friend_*.webp (1024x1024) to 9:16 PNGs")
    ap.add_argument("--friends-dir", required=True,
                    help="Directory containing crew_friend_zoe.webp etc. "
                         "(usually magic76/magic76.github.io/assets/friends)")
    ap.add_argument("--out", default=str(PORTRAITS))
    args = ap.parse_args()
    srcdir = Path(args.friends_dir)
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)
    missing = []
    for n in NAMES:
        src = srcdir / f"crew_friend_{n}.webp"
        if not src.exists():
            # also try .png
            alt = srcdir / f"crew_friend_{n}.png"
            if alt.exists():
                src = alt
            else:
                missing.append(str(src))
                continue
        one(src, outdir / f"{n}.png")
    if missing:
        print("MISSING:", *missing, file=sys.stderr)
        sys.exit(1)
    # contact sheet
    tw, th = 216, 384
    sheet = Image.new("RGB", (5 * tw + 6 * 8, th + 40), (24, 24, 28))
    from PIL import ImageDraw, ImageFont
    try:
        from kit_paths import cjk_font
        fp, idx = cjk_font(False)
        font = ImageFont.truetype(fp, 18, index=idx)
    except Exception:
        font = ImageFont.load_default()
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(NAMES):
        im = Image.open(outdir / f"{n}.png").resize((tw, th), Image.Resampling.LANCZOS)
        x = 8 + i * (tw + 8)
        sheet.paste(im, (x, 28))
        d.text((x + 8, 6), n, font=font, fill=(200, 230, 200))
    sheet.save(outdir / "sheet.jpg", quality=90)
    print("wrote", outdir / "sheet.jpg")


if __name__ == "__main__":
    main()
