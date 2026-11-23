#!/usr/bin/env python3
"""Build work/vo_mix/: narration trims from work/vo plus v4.1 greeting trims from work/vo_v41."""
from __future__ import annotations
from pathlib import Path
from kit_paths import WORK, ensure_dirs

def main():
    ensure_dirs()
    mix = WORK / "vo_mix"
    mix.mkdir(parents=True, exist_ok=True)
    src_narr = WORK / "vo"
    src_g = WORK / "vo_v41"
    if not src_narr.exists():
        raise SystemExit(f"missing {src_narr} — run: python scripts/gen_vo.py")
    if not src_g.exists():
        raise SystemExit(f"missing {src_g} — run: python scripts/gen_vo_greetings.py")
    # Link all narration trims, then overwrite greetings
    for f in src_narr.glob("*_trim.wav"):
        dest = mix / f.name
        if dest.exists() or dest.is_symlink():
            dest.unlink()
        dest.symlink_to(f.resolve())
    for f in src_g.glob("g-*_trim.wav"):
        dest = mix / f.name
        if dest.exists() or dest.is_symlink():
            dest.unlink()
        dest.symlink_to(f.resolve())
        print("greeting", f.name, "->", f)
    print("vo_mix ready at", mix)


if __name__ == "__main__":
    main()
