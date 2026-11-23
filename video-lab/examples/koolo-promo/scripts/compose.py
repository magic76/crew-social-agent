#!/usr/bin/env python3
"""Render Koolo promo v4 (28.00s, 1080x1920, 30fps, 128 BPM Western-ad kinetic energy)."""
from __future__ import annotations
from pathlib import Path
import math, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

from kit_paths import ASSETS, WORK, OUTPUT, PORTRAITS, STILLS, CARDS, WORDMARK, cjk_font, ensure_dirs
ensure_dirs()
UP = WORK / 'up_clips'
PORT = PORTRAITS
V3A = CARDS
RAW = ASSETS  # wordmark.png lives at assets/wordmark.png; Image.open(RAW / 'wordmark.png') still works if we also copy? we use WORDMARK below
SEQ = WORK / 'seq'
SEQ.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
for p in SEQ.glob('*.png'):
    p.unlink()

W, H, FPS = 1080, 1920, 30
TOTAL_SEC = 28.000
TOTAL_FRAMES = int(round(TOTAL_SEC * FPS))  # 840
BEAT = 60.0 / 128.0  # 0.46875s

GREEN = (21, 58, 53)
MINT = (85, 182, 141)
MINT_BRIGHT = (120, 232, 182)
CORAL = (255, 150, 120)
GOLD = (255, 224, 102)
LIGHT = (244, 248, 245)
CREAM = (252, 249, 249)
DARK = (14, 24, 22)

FONT_C, _FONT_INDEX = cjk_font(prefer_black=True)
FONT_B, _ = cjk_font(prefer_black=False)
_FONTS = {}

def font(size, black=True):
    k = (size, black)
    if k not in _FONTS:
        path = FONT_C if (black and Path(FONT_C).exists()) else FONT_B
        _FONTS[k] = ImageFont.truetype(path, size=size, index=_FONT_INDEX)
    return _FONTS[k]

def clamp(x, a=0.0, b=1.0):
    return a if x < a else (b if x > b else x)

def lerp(a, b, t):
    return a + (b - a) * t

def ease_out(t):
    t = clamp(t)
    return 1.0 - (1.0 - t) ** 3

def ease_back(t):
    """Overshoot spring for kinetic type pops."""
    t = clamp(t)
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + c1 * ((t - 1.0) ** 2)

def cover_f(im: Image.Image, fx=0.5, fy=0.4, zoom=1.0, dx=0.0, dy=0.0, w=W, h=H) -> Image.Image:
    sw, sh = im.size
    aspect = w / h
    if sw / sh > aspect:
        ch = sh / zoom
        cw = ch * aspect
    else:
        cw = sw / zoom
        ch = cw / aspect
    cw = min(sw, cw)
    ch = min(sh, ch)
    cx = clamp(fx * sw + dx, cw / 2.0, sw - cw / 2.0)
    cy = clamp(fy * sh + dy, ch / 2.0, sh - ch / 2.0)
    box = (cx - cw / 2.0, cy - ch / 2.0, cx + cw / 2.0, cy + ch / 2.0)
    return im.resize((w, h), Image.Resampling.LANCZOS, box=box)

def rounded_paste(base, src, xy, radius=32):
    src = src.convert('RGBA')
    mask = Image.new('L', src.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, src.size[0], src.size[1]), radius=radius, fill=255)
    base.paste(src, xy, mask)
    return base

def shake_xy(t_rel, dur=0.18, amp=10.0):
    if t_rel < 0 or t_rel > dur:
        return 0.0, 0.0
    env = 1.0 - t_rel / dur
    return (math.sin(t_rel * 95.0) * amp * env, math.cos(t_rel * 120.0) * amp * 0.7 * env)

def draw_kinetic_text(im, lines, cy=H//2, t_anim=1.0, bg_pill=None, stroke=8, stagger=0.07):
    """
    lines: list of dicts: {text, size, color, pill_color(opt), text_color(opt)}
    """
    im = im.convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    # Measure line heights
    rendered = []
    tot_h = 0
    gap = 26
    for idx, ln in enumerate(lines):
        lt = clamp((t_anim - idx * stagger) / 0.14)
        if lt <= 0.01:
            rendered.append(None)
            continue
        sc = lerp(0.62, 1.0, ease_back(lt))
        alpha = 255
        f = font(ln['size'], black=True)
        tmp = ImageDraw.Draw(ov)
        bb = tmp.textbbox((0, 0), ln['text'], font=f, stroke_width=stroke)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        pad_x = 34 if ln.get('pill') else 20
        pad_y = 18 if ln.get('pill') else 10
        cw, ch = tw + pad_x * 2, th + pad_y * 2
        card = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        if ln.get('pill'):
            pc = ln['pill']
            cd.rounded_rectangle((0, 0, cw, ch), radius=ch // 2, fill=(*pc, alpha))
            if ln.get('pill_border'):
                cd.rounded_rectangle((0, 0, cw, ch), radius=ch // 2, outline=(*ln['pill_border'], alpha), width=5)
            cd.text((pad_x - bb[0], pad_y - bb[1]), ln['text'], font=f, fill=(*ln['color'], alpha))
        else:
            # Drop shadow + thick stroke
            cd.text((pad_x - bb[0] + 4, pad_y - bb[1] + 8), ln['text'], font=f,
                    fill=(0, 0, 0, int(170 * alpha / 255)), stroke_width=stroke + 3, stroke_fill=(0, 0, 0, int(170 * alpha / 255)))
            cd.text((pad_x - bb[0], pad_y - bb[1]), ln['text'], font=f,
                    fill=(*ln['color'], alpha), stroke_width=stroke, stroke_fill=(*DARK, alpha))
        rw = max(1, int(round(cw * sc)))
        rh = max(1, int(round(ch * sc)))
        card_s = card.resize((rw, rh), Image.Resampling.LANCZOS)
        rendered.append((card_s, rw, rh))
        tot_h += rh + gap
    if not rendered:
        return im.convert('RGB')
    tot_h = max(0, tot_h - gap)
    y = cy - tot_h // 2
    for item in rendered:
        if item is None:
            continue
        card_s, rw, rh = item
        x = (W - rw) // 2
        ov.paste(card_s, (x, y), card_s)
        y += rh + gap
    return Image.alpha_composite(im, ov).convert('RGB')

def draw_badge(im, text, x, y, appear=1.0, bg=DARK, border=MINT, fg=(255, 255, 255), size=34):
    if appear <= 0.02:
        return im
    im = im.convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    f = font(size, black=False)
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    px, py = 24, 12
    bw, bh = tw + px * 2, th + py * 2
    a = int(235 * appear)
    d.rounded_rectangle((x, y, x + bw, y + bh), radius=bh // 2, fill=(*bg, a), outline=(*border, a), width=3)
    d.text((x + px - bb[0], y + py - bb[1]), text, font=f, fill=(*fg, a))
    return Image.alpha_composite(im, ov).convert('RGB')

def add_bottom_scrim(im, strength=0.62, top_y=0.58):
    im = im.convert('RGBA')
    grad = Image.new('L', (1, H), 0)
    y0 = int(H * top_y)
    for yy in range(y0, H):
        p = (yy - y0) / max(1, H - y0)
        grad.putpixel((0, yy), int(255 * strength * (p ** 1.3)))
    alpha = grad.resize((W, H))
    black = Image.new('RGBA', (W, H), (*DARK, 255))
    black.putalpha(alpha)
    return Image.alpha_composite(im, black).convert('RGB')

def add_flash(im, amount):
    if amount <= 0.01:
        return im
    white = Image.new('RGB', (W, H), (255, 255, 255))
    return Image.blend(im, white, clamp(amount, 0.0, 0.65))

def tap_ripple(im, cx, cy, t, ring=GREEN, fill=MINT):
    if t <= 0 or t >= 1:
        return im
    im = im.convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    r = int(22 + 78 * ease_out(t))
    a = int(235 * (1.0 - t * 0.55))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(*ring, a), width=10)
    d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=(*fill, int(220 * (1.0 - t))))
    return Image.alpha_composite(im, ov).convert('RGB')

# ---- Load assets ----
portraits = {n: Image.open(PORT / f'{n}.png').convert('RGB') for n in ['zoe', 'noah', 'iris', 'max', 'yuna']}
up_clips = {}
for n in ['zoe', 'noah', 'iris', 'max', 'yuna']:
    frames = sorted((UP / n).glob('*.png'))
    up_clips[n] = [Image.open(p).convert('RGB') for p in frames]
    print(f"Loaded {n}: {len(up_clips[n])} upscaled frames")

shorts_finn = Image.open(STILLS / 'still-shorts.png').convert('RGB')
games_full = Image.open(STILLS / 'still-games.png').convert('RGB')
gw, gh = games_full.size
games_crop = games_full.crop((0, int(gh * 0.075), gw, int(gh * 0.88)))

explore = Image.open(STILLS / 'still-explore.png').convert('RGB')
ew, eh = explore.size
explore_crop = explore.crop((0, int(eh * 0.07), ew, int(eh * 0.89)))

explore2 = Image.open(STILLS / 'still-explore-2.png').convert('RGB')
sw2, sh2 = explore2.size
story_card = explore2.crop((int(sw2 * 0.045), int(sh2 * 0.11), int(sw2 * 0.49), int(sh2 * 0.48)))

fortune_raw = Image.open(STILLS / 'still-fortune.png').convert('RGB')
fw, fh = fortune_raw.size
fortune_crop = fortune_raw.crop((0, int(fh * 0.075), fw, int(fh * 0.665)))

topic_card = Image.open(V3A / 'card-topic.png').convert('RGB')
voice_card = Image.open(V3A / 'card-voice.png').convert('RGB')
topic_heading = Image.open(V3A / 'card-heading.png').convert('RGB')
wordmark = Image.open(RAW / 'wordmark.png').convert('RGBA')

def map_src_to_frame(fx, fy, zoom, sx, sy, sw, sh):
    aspect = W / H
    if sw / sh > aspect:
        ch = sh / zoom; cw = ch * aspect
    else:
        cw = sw / zoom; ch = cw / aspect
    cw = min(sw, cw); ch = min(sh, ch)
    cx = clamp(fx * sw, cw / 2.0, sw - cw / 2.0)
    cy = clamp(fy * sh, ch / 2.0, sh - ch / 2.0)
    return ((sx - (cx - cw / 2.0)) / cw * W, (sy - (cy - ch / 2.0)) / ch * H)

def card_on_backdrop(src, zoom_u, w0=960, w1=1030, y_shift=0, bg_color=(232, 241, 236)):
    img = Image.new('RGB', (W, H), bg_color)
    # Subtle soft mint glow behind card
    glow = Image.new('RGB', (W, H), bg_color)
    ImageDraw.Draw(glow).ellipse((W//2 - 420, H//2 - 420, W//2 + 420, H//2 + 420), fill=(198, 232, 214))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.blend(img, glow, 0.55)
    cw = int(round(lerp(w0, w1, zoom_u)))
    ch = int(round(src.size[1] * cw / src.size[0]))
    card = src.resize((cw, ch), Image.Resampling.LANCZOS)
    x = (W - cw) // 2
    y = (H - ch) // 2 + y_shift
    sh_im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh_im).rounded_rectangle((x + 8, y + 18, x + cw + 8, y + ch + 18), radius=38, fill=(0, 0, 0, 46))
    sh_im = sh_im.filter(ImageFilter.GaussianBlur(16))
    rgba = Image.alpha_composite(img.convert('RGBA'), sh_im)
    rounded_paste(rgba, card, (x, y), radius=38)
    return rgba.convert('RGB')

# ---- Shot renderers ----
def render_frame(fi):
    t = fi / FPS

    # 1. Hook A: 0.000 - 1.172s (Beats 0..2.5)
    if t < 1.172:
        tr = t
        punch = 1.0 + 0.08 * (1.0 - ease_out(min(1.0, tr / 0.16)))
        dx, dy = shake_xy(tr, 0.16, 11.0)
        bg = cover_f(portraits['zoe'], fx=0.50, fy=0.35, zoom=1.28 * punch + 0.04 * tr, dx=dx, dy=dy)
        bg = ImageEnhance.Brightness(bg).enhance(0.26)
        bg = draw_kinetic_text(bg, [
            {'text': '背了', 'size': 108, 'color': (255, 255, 255)},
            {'text': '十年單字', 'size': 142, 'color': CORAL},
        ], cy=int(H * 0.46), t_anim=tr, stagger=0.14)
        return bg

    # 2. Hook B: 1.172 - 2.344s (Beats 2.5..5)
    if t < 2.344:
        tr = t - 1.172
        punch = 1.0 + 0.10 * (1.0 - ease_out(min(1.0, tr / 0.15)))
        dx, dy = shake_xy(tr, 0.18, 13.0)
        bg = cover_f(portraits['noah'], fx=0.50, fy=0.34, zoom=1.34 * punch + 0.05 * tr, dx=dx, dy=dy)
        bg = ImageEnhance.Brightness(bg).enhance(0.24)
        bg = draw_kinetic_text(bg, [
            {'text': '還是', 'size': 108, 'color': (255, 255, 255)},
            {'text': '不敢開口？', 'size': 144, 'color': GOLD},
        ], cy=int(H * 0.46), t_anim=tr, stagger=0.14)
        if tr < 0.06:
            bg = add_flash(bg, 0.25 * (1.0 - tr / 0.06))
        return bg

    # 3. 4-Frame Eye/Smile Drop Flash: 2.344 - 2.8125s (Beats 5..6)
    if t < 2.8125:
        tr = t - 2.344
        idx = min(3, int(tr / (0.46875 / 4.0)))
        who = ['zoe', 'iris', 'max', 'yuna'][idx]
        fys = {'zoe': 0.31, 'iris': 0.29, 'max': 0.28, 'yuna': 0.30}
        bg = cover_f(portraits[who], fx=0.50, fy=fys[who], zoom=1.62 + 0.08 * (idx % 2))
        bg = ImageEnhance.Contrast(bg).enhance(1.12)
        bg = draw_kinetic_text(bg, [
            {'text': '？', 'size': 210, 'color': GOLD},
        ], cy=int(H * 0.50), t_anim=1.0)
        if (tr % (0.46875 / 4.0)) < 0.04:
            bg = add_flash(bg, 0.20)
        return bg

    # 4. Pain Relief: 2.8125 - 4.219s (Beats 6..9)
    if t < 4.219:
        tr = t - 2.8125
        bg = Image.new('RGB', (W, H), GREEN)
        dr = ImageDraw.Draw(bg)
        r = int(200 + 950 * ease_out(tr / 0.40))
        dr.ellipse((W//2 - r, H//2 - r, W//2 + r, H//2 + r), outline=MINT, width=18)
        dx, dy = shake_xy(tr, 0.16, 10.0)
        bg = draw_kinetic_text(bg, [
            {'text': '別再', 'size': 98, 'color': MINT_BRIGHT},
            {'text': '一個人練習了！', 'size': 112, 'color': (255, 255, 255)},
        ], cy=int(H * 0.48 + dy), t_anim=tr, stagger=0.14)
        if tr < 0.07:
            bg = add_flash(bg, 0.35 * (1.0 - tr / 0.07))
        return bg

    # 5. Turn / Start: 4.219 - 5.625s (Beats 9..12)
    if t < 5.625:
        tr = t - 4.219
        punch = 1.0 + 0.07 * (1.0 - ease_out(min(1.0, tr / 0.16)))
        bg = cover_f(portraits['zoe'], fx=0.50, fy=0.35, zoom=1.04 * punch + 0.03 * tr)
        bg = add_bottom_scrim(bg, 0.55, 0.45)
        lines = [{'text': '打個招呼', 'size': 112, 'color': (255, 255, 255)}]
        if tr >= 0.72:
            lines.append({'text': '就開始！', 'size': 114, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT})
        bg = draw_kinetic_text(bg, lines, cy=int(H * 0.73), t_anim=tr, stagger=0.05)
        if tr < 0.06:
            bg = add_flash(bg, 0.28 * (1.0 - tr / 0.06))
        return bg

    # 6-10. 5 Talking AI Friends!
    FRIEND_SLOTS = [
        ('zoe',  5.625,  7.500,  'Hi!',          0.24, GREEN,            'Zoe · English'),
        ('noah', 7.500,  9.375,  'こんにちは！',  0.18, (45, 118, 138),   'Noah · 日本語'),
        ('iris', 9.375,  10.781, '¡Hola!',       0.60, (186, 86, 62),    'Iris · Español'),
        ('max',  10.781, 12.656, 'Bonjour !',    0.22, (58, 112, 86),    'Max · Français'),
        ('yuna', 12.656, 14.531, '안녕!',        0.18, (104, 82, 162),   'Yuna · 한국어'),
    ]
    for name, t0, t1, greet, greet_delay, accent, tag in FRIEND_SLOTS:
        if t < t1:
            tr = t - t0
            dur = t1 - t0
            clips = up_clips[name]
            idx = min(len(clips) - 1, int(round(tr * FPS)))
            src = clips[idx]
            punch = 1.0 + 0.065 * (1.0 - ease_out(min(1.0, tr / 0.14))) + 0.025 * (tr / dur)
            bg = cover_f(src, fx=0.50, fy=0.45 if name != 'iris' else 0.40, zoom=punch)
            bg = add_bottom_scrim(bg, 0.50, 0.62)
            # Top-left friend language badge
            bg = draw_badge(bg, tag, 56, 96, appear=ease_out(min(1.0, tr / 0.12)), bg=DARK, border=accent)
            # Big kinetic greeting popping on mouth open
            if tr >= greet_delay:
                bg = draw_kinetic_text(bg, [
                    {'text': greet, 'size': 126, 'color': (255, 255, 255), 'pill': accent, 'pill_border': (255, 255, 255)}
                ], cy=int(H * 0.78), t_anim=tr - greet_delay)
            if tr < 0.05:
                bg = add_flash(bg, 0.22 * (1.0 - tr / 0.05))
            return bg

    # 11. Shorts Finn 1: 14.531 - 15.469s (看到喜歡的)
    if t < 15.469:
        tr = t - 14.531
        u = tr / (15.469 - 14.531)
        punch = 1.0 + 0.06 * (1.0 - ease_out(min(1.0, tr / 0.14)))
        bg = cover_f(shorts_finn, fx=0.49, fy=lerp(0.38, 0.44, u), zoom=lerp(1.03, 1.06, u) * punch)
        bg = add_bottom_scrim(bg, 0.45, 0.66)
        bg = draw_kinetic_text(bg, [
            {'text': '看到喜歡的', 'size': 102, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT}
        ], cy=int(H * 0.13), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.16 * (1.0 - tr / 0.05))
        return bg

    # 12. Shorts Finn 2 + Tap: 15.469 - 16.875s (直接跟朋友聊！)
    if t < 16.875:
        tr = t - 15.469
        u = tr / (16.875 - 15.469)
        fx, fy, z = 0.50, lerp(0.46, 0.60, ease_out(min(1.0, u * 1.4))), lerp(1.07, 1.15, u)
        bg = cover_f(shorts_finn, fx=fx, fy=fy, zoom=z)
        tap_t = (t - 15.88) / 0.65
        if 0.0 <= tap_t <= 1.0:
            sw, sh = shorts_finn.size
            cx, cy = map_src_to_frame(fx, fy, z, 583, 1728, sw, sh)
            bg = tap_ripple(bg, int(round(cx)), int(round(cy)), tap_t)
        bg = draw_kinetic_text(bg, [
            {'text': '直接跟朋友聊！', 'size': 100, 'color': (255, 255, 255), 'pill': DARK, 'pill_border': MINT}
        ], cy=int(H * 0.20), t_anim=tr)
        return bg

    # Helper for stacked official topic+voice cards with active card focus
    def stacked_chat_cards(active_idx, tr_local, u_local):
        img = Image.new('RGB', (W, H), (232, 241, 236))
        glow = Image.new('RGB', (W, H), (232, 241, 236))
        ImageDraw.Draw(glow).ellipse((W//2 - 440, 260, W//2 + 440, 1180), fill=(194, 232, 212))
        glow = glow.filter(ImageFilter.GaussianBlur(70))
        img = Image.blend(img, glow, 0.55).convert('RGBA')
        cw_base = 960
        hs = topic_heading.resize((cw_base, int(round(topic_heading.size[1] * cw_base / topic_heading.size[0]))), Image.Resampling.LANCZOS)
        img.paste(hs, ((W - cw_base) // 2, 250))
        y_cur = 250 + hs.size[1] + 42
        for ci, csrc in enumerate([topic_card, voice_card]):
            is_act = (ci == active_idx)
            punch = 1.0 + 0.045 * (1.0 - ease_out(min(1.0, tr_local / 0.14)))
            cw = int(round((1010 * punch if is_act else 930) + (18 * u_local if is_act else 0)))
            ch = int(round(csrc.size[1] * cw / csrc.size[0]))
            cr = csrc.resize((cw, ch), Image.Resampling.LANCZOS)
            if not is_act:
                cr = ImageEnhance.Brightness(cr).enhance(0.86)
            cx = (W - cw) // 2
            sh_im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(sh_im).rounded_rectangle((cx + 6, y_cur + 14, cx + cw + 6, y_cur + ch + 14), radius=34, fill=(0, 0, 0, 52 if is_act else 22))
            sh_im = sh_im.filter(ImageFilter.GaussianBlur(14))
            img = Image.alpha_composite(img, sh_im)
            rounded_paste(img, cr, (cx, y_cur), radius=34)
            if is_act:
                d_ring = ImageDraw.Draw(img)
                d_ring.rounded_rectangle((cx, y_cur, cx + cw, y_cur + ch), radius=34, outline=MINT, width=6)
            y_cur += ch + 44
        return img.convert('RGB')

    # 13. Topic Card: 16.875 - 17.8125s (不必準備話題)
    if t < 17.8125:
        tr = t - 16.875
        u = tr / (17.8125 - 16.875)
        bg = stacked_chat_cards(0, tr, u)
        bg = draw_kinetic_text(bg, [
            {'text': '不必準備話題', 'size': 104, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT}
        ], cy=int(H * 0.77), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.15 * (1.0 - tr / 0.05))
        return bg

    # 14. Voice Card: 17.8125 - 20.156s (不考試 / 也不強迫糾錯)
    if t < 20.156:
        tr = t - 17.8125
        u = tr / (20.156 - 17.8125)
        bg = stacked_chat_cards(1, tr, u)
        lines = [{'text': '不考試', 'size': 108, 'color': (255, 255, 255), 'pill': DARK, 'pill_border': GOLD}]
        if tr >= 1.15:
            lines.append({'text': '也不強迫糾錯', 'size': 96, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT})
        bg = draw_kinetic_text(bg, lines, cy=int(H * 0.76), t_anim=tr, stagger=0.05)
        if tr < 0.05:
            bg = add_flash(bg, 0.15 * (1.0 - tr / 0.05))
        return bg

    # 15. Games: 20.156 - 21.094s (玩遊戲)
    if t < 21.094:
        tr = t - 20.156
        u = tr / (21.094 - 20.156)
        punch = 1.0 + 0.07 * (1.0 - ease_out(min(1.0, tr / 0.14)))
        bg = cover_f(games_crop, fx=0.50, fy=0.49, zoom=lerp(1.03, 1.09, u) * punch)
        bg = add_bottom_scrim(bg, 0.45, 0.65)
        bg = draw_kinetic_text(bg, [
            {'text': '玩遊戲', 'size': 124, 'color': GOLD, 'pill': DARK, 'pill_border': GOLD}
        ], cy=int(H * 0.78), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.20 * (1.0 - tr / 0.05))
        return bg

    # 16. Story: 21.094 - 22.031s (讀故事)
    if t < 22.031:
        tr = t - 21.094
        u = tr / (22.031 - 21.094)
        punch = 1.0 + 0.07 * (1.0 - ease_out(min(1.0, tr / 0.14)))
        bg = card_on_backdrop(story_card, u, w0=830, w1=890 * punch, y_shift=-70)
        bg = draw_kinetic_text(bg, [
            {'text': '讀故事', 'size': 124, 'color': (255, 255, 255), 'pill': (49, 120, 140), 'pill_border': (255, 255, 255)}
        ], cy=int(H * 0.79), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.20 * (1.0 - tr / 0.05))
        return bg

    # 17. Fortune (cropped cleanly, no empty state!): 22.031 - 22.969s (看運勢)
    if t < 22.969:
        tr = t - 22.031
        u = tr / (22.969 - 22.031)
        punch = 1.0 + 0.07 * (1.0 - ease_out(min(1.0, tr / 0.14)))
        bg = card_on_backdrop(fortune_crop, u, w0=980, w1=1040 * punch, y_shift=-80)
        bg = draw_kinetic_text(bg, [
            {'text': '看運勢', 'size': 124, 'color': (255, 255, 255), 'pill': (186, 86, 62), 'pill_border': GOLD}
        ], cy=int(H * 0.78), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.20 * (1.0 - tr / 0.05))
        return bg

    # 18. Explore Overview + Riser: 22.969 - 24.375s (一起玩著學語言！)
    if t < 24.375:
        tr = t - 22.969
        u = tr / (24.375 - 22.969)
        punch = 1.0 + 0.06 * (1.0 - ease_out(min(1.0, tr / 0.14)))
        bg = card_on_backdrop(explore_crop, u, w0=1020, w1=1070 * punch, y_shift=-30)
        bg = add_bottom_scrim(bg, 0.55, 0.52)
        bg = draw_kinetic_text(bg, [
            {'text': '一起玩著學語言！', 'size': 102, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT_BRIGHT}
        ], cy=int(H * 0.76), t_anim=tr)
        if tr < 0.05:
            bg = add_flash(bg, 0.20 * (1.0 - tr / 0.05))
        return bg

    # 19. CTA End Card: 24.375 - 28.000s (來 Koolo 打個招呼 / 免費開始 · koolo.app)
    tr = t - 24.375
    dur = 28.000 - 24.375
    img = Image.new('RGB', (W, H), LIGHT)
    glow = Image.new('RGB', (W, H), LIGHT)
    ImageDraw.Draw(glow).ellipse((W//2 - 380, 500, W//2 + 380, 1140), fill=(196, 236, 214))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.blend(img, glow, 0.62)

    appear = ease_back(min(1.0, tr / 0.28))
    breath = 1.0 + 0.02 * clamp((tr - 0.30) / max(0.1, dur - 0.30))
    wm = wordmark.copy()
    tw = 820
    th = int(wm.size[1] * tw / wm.size[0])
    wm = wm.resize((tw, th), Image.Resampling.LANCZOS)

    # Blink right during Jenny "Koolo" (24.82..25.12s -> tr = 0.44..0.74)
    if 0.44 <= tr <= 0.72:
        ov = Image.new('RGBA', wm.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        sx, sy = wm.size[0] / 160.0, wm.size[1] / 48.0
        for cx in (55, 81):
            x = cx * sx
            y = 22.7 * sy
            rx, ry = 4.8 * sx, 3.2 * sy
            od.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(*CREAM, 255))
            od.arc((x - rx * 0.95, y - ry * 0.2, x + rx * 0.95, y + ry * 1.6),
                   200, 340, fill=(21, 58, 53, 255), width=max(3, int(2.2 * sx / 2)))
        wm = Image.alpha_composite(wm, ov)

    s = lerp(0.84, 1.0, appear) * breath
    ww, hh = int(round(wm.size[0] * s)), int(round(wm.size[1] * s))
    wm2 = wm.resize((ww, hh), Image.Resampling.LANCZOS)
    lx = (W - ww) // 2
    ly = 620
    base = img.convert('RGBA')
    base.paste(wm2, (lx, ly), wm2)
    out = base.convert('RGB')

    if t < 26.250:
        out = draw_kinetic_text(out, [
            {'text': '來 Koolo 打個招呼', 'size': 92, 'color': GREEN, 'pill': (255, 255, 255), 'pill_border': MINT}
        ], cy=1050, t_anim=tr)
    else:
        tr2 = t - 26.250
        out = draw_kinetic_text(out, [
            {'text': '免費開始！', 'size': 114, 'color': (255, 255, 255), 'pill': GREEN, 'pill_border': MINT_BRIGHT},
            {'text': 'koolo.app', 'size': 72, 'color': GOLD, 'pill': DARK, 'pill_border': GOLD},
        ], cy=1110, t_anim=tr2, stagger=0.08)

    if tr < 0.06:
        out = add_flash(out, 0.30 * (1.0 - tr / 0.06))
    return out

for fi in range(TOTAL_FRAMES):
    im = render_frame(fi)
    im.save(SEQ / f'f{fi:04d}.png', compress_level=1)
    if fi % 120 == 0:
        print(f'rendered frame {fi}/{TOTAL_FRAMES}')
print(f'Rendered all {TOTAL_FRAMES} frames cleanly.')
