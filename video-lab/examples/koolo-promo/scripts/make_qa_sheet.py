#!/usr/bin/env python3
"""Build frames.jpg (timestamp + caption contact sheet) and cuts_strip.jpg from the PNG sequence."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from kit_paths import WORK, OUTPUT, cjk_font, ensure_dirs

KEY_TS = [
    (0.35,  "0.35s Hook1: 背了十年單字"),
    (1.55,  "1.55s Hook2: 還是不敢開口？"),
    (2.50,  "2.50s Drop Flash"),
    (3.25,  "3.25s 別再一個人練習了！"),
    (5.15,  "5.15s 打個招呼 就開始！"),
    (6.05,  "6.05s Zoe: Hi!"),
    (7.90,  "7.90s Noah: こんにちは！"),
    (10.15, "10.15s Iris: ¡Hola!"),
    (11.20, "11.20s Max: Bonjour !"),
    (13.05, "13.05s Yuna: 안녕!"),
    (14.85, "14.85s Shorts: 看到喜歡的"),
    (16.10, "16.10s Finn Tap + 直接跟朋友聊"),
    (17.25, "17.25s Card: 不必準備話題"),
    (19.20, "19.20s Card: 不考試/不強迫糾錯"),
    (20.55, "20.55s 玩遊戲"),
    (21.45, "21.45s 讀故事"),
    (22.40, "22.40s 看運勢"),
    (23.50, "23.50s 一起玩著學語言！"),
    (24.95, "24.95s Koolo Blink + 來 Koolo"),
    (26.80, "26.80s 免費開始 · koolo.app"),
]
CUT_TS = [1.13, 1.20, 2.77, 2.84, 5.59, 5.66, 7.47, 7.53, 9.34, 9.41,
          10.75, 10.81, 12.62, 12.69, 14.50, 14.57, 24.34, 24.41]


def main():
    ensure_dirs()
    SEQ = WORK / "seq"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    try:
        fp, idx = cjk_font(True)
        f = ImageFont.truetype(fp, 24, index=idx)
        f_sm = ImageFont.truetype(fp, 18, index=idx)
    except Exception:
        f = f_sm = ImageFont.load_default()

    tw, th = 270, 480
    cols, rows = 5, 4
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 10, rows * (th + 38) + 56), (18, 22, 20))
    dr = ImageDraw.Draw(sheet)
    dr.text((14, 12), "Koolo Promo v4.1 — Timeline & Sync QA (28.00s, 1080x1920, 30fps, 128 BPM)", font=f, fill=(245, 250, 245))
    for i, (ts, label) in enumerate(KEY_TS):
        fi = min(839, max(0, int(round(ts * 30))))
        im = Image.open(SEQ / f"f{fi:04d}.png").resize((tw, th), Image.Resampling.LANCZOS)
        c, r = i % cols, i // cols
        x = 10 + c * (tw + 10)
        y = 52 + r * (th + 38)
        sheet.paste(im, (x, y))
        dr.text((x + 4, y + th + 4), label, font=f_sm, fill=(130, 232, 182))
    sheet.save(OUTPUT / "frames.jpg", quality=92)
    print("wrote", OUTPUT / "frames.jpg")

    tw2, th2 = 180, 320
    cols2, rows2 = 6, 3
    strip = Image.new("RGB", (cols2 * tw2 + (cols2 + 1) * 8, rows2 * (th2 + 30) + 46), (16, 16, 20))
    dr2 = ImageDraw.Draw(strip)
    dr2.text((12, 10), "Beat Cut Boundary Strip (pre-cut / post-cut pairs)", font=f, fill=(245, 245, 245))
    for i, ts in enumerate(CUT_TS):
        fi = min(839, max(0, int(round(ts * 30))))
        im = Image.open(SEQ / f"f{fi:04d}.png").resize((tw2, th2), Image.Resampling.LANCZOS)
        c, r = i % cols2, i // cols2
        x = 8 + c * (tw2 + 8)
        y = 44 + r * (th2 + 30)
        strip.paste(im, (x, y))
        dr2.text((x + 4, y + th2 + 2), f"{ts:.2f}s (f{fi})", font=f_sm,
                 fill=(255, 224, 102) if i % 2 == 0 else (120, 232, 182))
    strip.save(OUTPUT / "cuts_strip.jpg", quality=90)
    print("wrote", OUTPUT / "cuts_strip.jpg")


if __name__ == "__main__":
    main()
