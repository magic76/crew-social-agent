"""Shared paths for the Koolo promo video kit.

Kit root is the parent of this scripts/ directory, whether the folder
was unzipped as koolo-promo-video-kit/ or checked out as
video-lab/examples/koolo-promo/ inside magic76/crew-social-agent.
"""
from __future__ import annotations
import os
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
ASSETS = KIT / "assets"
WORK = KIT / "work"
OUTPUT = KIT / "output"
SCRIPTS = KIT / "scripts"

PORTRAITS = ASSETS / "portraits"
CLIPS = ASSETS / "clips"
STILLS = ASSETS / "stills"
CARDS = ASSETS / "cards"
WORDMARK = ASSETS / "wordmark.png"
COVER = ASSETS / "cover.jpg"

# Official friend stills in the product repo (optional input for make_portraits.py)
FRIENDS_WEBP_HINT = "assets/friends/crew_friend_<name>.webp  (magic76/magic76.github.io)"

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Black.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto-cjk/NotoSansCJK-Bold.ttc",
]


def cjk_font(prefer_black: bool = True) -> tuple[str, int]:
    """Return (path, font-index) for Noto CJK. index=3 is Traditional Chinese in TTC."""
    if prefer_black:
        for p in FONT_CANDIDATES:
            if "Black" in p and Path(p).exists():
                return p, 3
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return p, 3
    raise FileNotFoundError(
        "找不到 Noto Sans CJK 字型。請安裝 fonts-noto-cjk，"
        "或把 TTC 路徑設成環境變數 KOLO_CJK_FONT。"
    )


def ensure_dirs() -> None:
    for d in (WORK, OUTPUT, WORK / "site", WORK / "vo", WORK / "audio", WORK / "up_clips", WORK / "seq"):
        d.mkdir(parents=True, exist_ok=True)


# Honour an explicit override (useful if the kit is relocated).
if os.environ.get("KOLO_KIT_ROOT"):
    KIT = Path(os.environ["KOLO_KIT_ROOT"]).resolve()
    ASSETS = KIT / "assets"
    WORK = KIT / "work"
    OUTPUT = KIT / "output"
    SCRIPTS = KIT / "scripts"
    PORTRAITS = ASSETS / "portraits"
    CLIPS = ASSETS / "clips"
    STILLS = ASSETS / "stills"
    CARDS = ASSETS / "cards"
    WORDMARK = ASSETS / "wordmark.png"
    COVER = ASSETS / "cover.jpg"
