#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os
from kit_paths import WORK, ensure_dirs

ensure_dirs()
OUT = str(WORK / "site")
# Prefer a CJK-capable font
FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansTC-Regular.otf",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
def load_font(size, bold=False):
    paths = FONT_CANDIDATES
    if bold:
        paths = [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        ] + paths
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size=size)
            except Exception:
                continue
    return ImageFont.load_default()

# Cell layout: portrait-ish thumbs for mobile, wider for desktop
ITEMS = [
    # row of mobile key screens
    ("390-home.png", "首頁 · 390", "一起玩著學語言"),
    ("390-chat.png", "聊天 · 朋友列表", "認識 Koolo Friends"),
    ("390-friend-live.png", "語音通話（未登入）", "5 分鐘免費試玩＋驗證"),
    ("390-explore.png", "探索", "命理／時光機／遊戲／故事"),
    ("390-shorts.png", "Shorts", "今天朋友發生什麼事？"),
    ("390-learn.png", "學習（語言閘門）", "仍顯示 CREW LEARN"),
    ("390-tree.png", "Crew Tree Lab", "發光森林（空種子）"),
    ("390-me.png", "我的", "學習紀錄與帳號"),
    ("390-fortune.png", "運勢 Fortune", "八字／塔羅／印度星盤"),
    ("390-games.png", "遊戲", "13 款可玩"),
    ("390-teacher.png", "Teacher", "Emma 老師與課程"),
    ("390-story.png", "Story", "空書架狀態"),
    ("1280-home.png", "桌機首頁 · 1280", "大圖 Zoe＋功能卡"),
    ("390-home-scroll.png", "首頁頁尾", "仍見 crew@3sssi.com"),
    ("390-voice-credits.png", "語音額度", "登入後才能查看"),
    ("390-discover.png", "Discover", "和 AI 一起探索世界"),
]

# Add follow-up shots if present
EXTRAS = [
    ("390-learn-open.png", "學習（進入後）", "語言閘門關閉後"),
    ("390-home-mid.png", "首頁中段", "Shorts／遊戲／老師"),
    ("390-home-onboarding.png", "首次引導", "仍寫歡迎來到 Crew"),
    ("390-home-slide2.png", "首頁輪播 2", "其他朋友／場景"),
    ("1280-chat.png", "桌機聊天", "朋友列表"),
    ("1280-explore.png", "桌機探索", "探索卡片"),
    ("1280-shorts.png", "桌機 Shorts", "朋友動態"),
    ("1280-fortune.png", "桌機運勢", "命盤入口"),
    ("1280-tree.png", "桌機 Tree", "發光森林"),
    ("1280-friend-live.png", "桌機通話門檻", "驗證畫面"),
]

for item in EXTRAS:
    if os.path.exists(os.path.join(OUT, item[0])):
        ITEMS.append(item)

BG = (247, 247, 244)
INK = (24, 22, 32)
MUTED = (90, 88, 100)
ACCENT = (26, 120, 74)
CARD = (255, 255, 255)
LINE = (226, 224, 218)

PAD = 48
HEADER_H = 170
LABEL_H = 72
GAP = 28
COLS = 4
THUMB_W = 420

def thumb_size(path):
    im = Image.open(path)
    w, h = im.size
    # target width THUMB_W, keep aspect, cap height
    scale = THUMB_W / w
    nh = int(h * scale)
    max_h = 760 if w < h else 420
    if nh > max_h:
        scale = max_h / h
        return int(w * scale), max_h
    return THUMB_W, nh

# compute row heights
rows = [ITEMS[i:i+COLS] for i in range(0, len(ITEMS), COLS)]
row_heights = []
for row in rows:
    hs = []
    for fn, *_ in row:
        p = os.path.join(OUT, fn)
        if os.path.exists(p):
            _, nh = thumb_size(p)
            hs.append(nh + LABEL_H)
        else:
            hs.append(180)
    row_heights.append(max(hs) if hs else 180)

sheet_w = PAD * 2 + COLS * THUMB_W + (COLS - 1) * GAP
sheet_h = PAD + HEADER_H + sum(row_heights) + (len(rows) - 1) * GAP + PAD

sheet = Image.new("RGB", (sheet_w, sheet_h), BG)
draw = ImageDraw.Draw(sheet)
font_title = load_font(42, bold=True)
font_sub = load_font(22)
font_label = load_font(20, bold=True)
font_cap = load_font(16)

title = "Koolo 正式站走查  ·  宣傳片素材"
sub = "https://koolo.app    拍攝於 2026-11-23 00:47–00:50（台北時間）    390×844 與 1280×800    未登入、未傳訊、未付款"
draw.text((PAD, 36), title, font=font_title, fill=INK)
draw.text((PAD, 96), sub, font=font_sub, fill=MUTED)
draw.rectangle((PAD, 140, sheet_w - PAD, 144), fill=ACCENT)

y = PAD + HEADER_H
for r_i, row in enumerate(rows):
    x = PAD
    rh = row_heights[r_i]
    for fn, label, cap in row:
        p = os.path.join(OUT, fn)
        # card background
        draw.rounded_rectangle((x - 6, y - 6, x + THUMB_W + 6, y + rh + 6), radius=16, fill=CARD, outline=LINE, width=1)
        if os.path.exists(p):
            im = Image.open(p).convert("RGB")
            tw, th = thumb_size(p)
            im = im.resize((tw, th), Image.Resampling.LANCZOS)
            # center horizontally in cell
            ox = x + (THUMB_W - tw) // 2
            sheet.paste(im, (ox, y))
            # rounded? skip for speed
        else:
            draw.rectangle((x, y, x + THUMB_W, y + rh - LABEL_H), fill=(230, 230, 226))
        ly = y + rh - LABEL_H + 10
        draw.text((x + 10, ly), label, font=font_label, fill=INK)
        draw.text((x + 10, ly + 28), cap, font=font_cap, fill=MUTED)
        x += THUMB_W + GAP
    y += rh + GAP

jpg = os.path.join(OUT, "sheet.jpg")
png = os.path.join(OUT, "sheet.png")
sheet.save(png)
sheet.convert("RGB").save(jpg, "JPEG", quality=88, optimize=True)
print(f"sheet {sheet.size} -> {jpg} {os.path.getsize(jpg)}  {png} {os.path.getsize(png)}")
