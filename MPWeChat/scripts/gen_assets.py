#!/usr/bin/env python3
"""Bake seal stamps and line icons. Seals carry 篆-like density via serif glyphs + ink noise."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SEALS = ROOT / "assets" / "seals"
ICONS = ROOT / "assets" / "icons"
TAB = ROOT / "assets" / "tab"

GOLD = (201, 169, 97, 255)
GOLD_NIGHT = (212, 184, 118, 255)
GREEN = (47, 133, 90, 255)
VERMILION = (185, 58, 50, 255)
INK = (18, 41, 62, 255)
INK_NIGHT = (232, 236, 239, 255)
ALERT = (197, 48, 48, 255)
CLEAR = (226, 232, 240, 255)

FONT = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size=size, index=0)


def add_noise(img: Image.Image, color: tuple[int, int, int, int], rng: random.Random) -> None:
    px = img.load()
    w, h = img.size
    cx, cy = w / 2, h / 2
    rmax = w * 0.42
    n = int(w * h * 0.045)
    for _ in range(n):
        a = rng.random() * math.tau
        rad = rmax * math.sqrt(rng.random())
        x = int(cx + rad * math.cos(a))
        y = int(cy + rad * math.sin(a))
        if 0 <= x < w and 0 <= y < h:
            r, g, b, a0 = px[x, y]
            if a0 < 8:
                continue
            jitter = rng.randint(-12, 18)
            px[x, y] = (
                max(0, min(255, r + jitter)),
                max(0, min(255, g + jitter)),
                max(0, min(255, b + jitter)),
                a0,
            )


def draw_stamp(size: int, text: str, color: tuple[int, int, int, int], seed: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    m = size * 0.06
    draw.ellipse([m, m, size - m, size - m], outline=color, width=max(3, size // 28))
    inner = m + size * 0.055
    draw.ellipse([inner, inner, size - inner, size - inner], outline=color, width=max(2, size // 64))

    chars = list(text)
    if len(chars) == 1:
        font = load_font(int(size * 0.52))
        bbox = draw.textbbox((0, 0), chars[0], font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] + size * 0.02),
            chars[0],
            font=font,
            fill=color,
        )
    else:
        font = load_font(int(size * 0.34))
        gap = size * 0.02
        bboxes = [draw.textbbox((0, 0), c, font=font) for c in chars]
        heights = [b[3] - b[1] for b in bboxes]
        total_h = sum(heights) + gap
        y = (size - total_h) / 2 + size * 0.02
        for c, b, h in zip(chars, bboxes, heights):
            tw = b[2] - b[0]
            draw.text(((size - tw) / 2 - b[0], y - b[1]), c, font=font, fill=color)
            y += h + gap

    rng = random.Random(seed)
    add_noise(img, color, rng)
    return img


def save_stamp(name: str, text: str, color: tuple[int, int, int, int], seed: int) -> None:
    img = draw_stamp(256, text, color, seed)
    img.save(SEALS / f"{name}.png", "PNG")


def svg_icon(name: str, paths: str, color: str, size: int = 64) -> None:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">{paths}</svg>
"""
    (ICONS / f"{name}.svg").write_text(svg, encoding="utf-8")


def png_from_svg_paths(name: str, draw_fn, color: tuple[int, int, int, int], size: int = 96) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_fn(draw, size, color)
    img.save(ICONS / f"{name}.png", "PNG")


def line(draw, size, color, pts, width_ratio=0.07):
    w = max(2, int(size * width_ratio))
    xy = [(p[0] * size, p[1] * size) for p in pts]
    draw.line(xy, fill=color, width=w, joint="miter")
    for p in xy:
        r = w / 2
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def ico_caret(draw, s, c):
    line(draw, s, c, [(0.62, 0.22), (0.34, 0.5), (0.62, 0.78)])


def ico_shield(draw, s, c):
    line(draw, s, c, [(0.5, 0.16), (0.82, 0.28), (0.82, 0.52), (0.5, 0.84), (0.18, 0.52), (0.18, 0.28), (0.5, 0.16)])


def ico_link(draw, s, c):
    line(draw, s, c, [(0.40, 0.38), (0.28, 0.38), (0.28, 0.62), (0.46, 0.62)])
    line(draw, s, c, [(0.54, 0.38), (0.72, 0.38), (0.72, 0.62), (0.58, 0.62)])
    line(draw, s, c, [(0.38, 0.5), (0.62, 0.5)])


def ico_window(draw, s, c):
    line(draw, s, c, [(0.2, 0.22), (0.8, 0.22), (0.8, 0.78), (0.2, 0.78), (0.2, 0.22)])
    line(draw, s, c, [(0.2, 0.38), (0.8, 0.38)])
    line(draw, s, c, [(0.5, 0.38), (0.5, 0.78)])


def ico_copy(draw, s, c):
    line(draw, s, c, [(0.34, 0.30), (0.78, 0.30), (0.78, 0.78), (0.34, 0.78), (0.34, 0.30)])
    line(draw, s, c, [(0.22, 0.22), (0.62, 0.22)])
    line(draw, s, c, [(0.22, 0.22), (0.22, 0.66)])


def ico_door(draw, s, c):
    line(draw, s, c, [(0.28, 0.18), (0.72, 0.18), (0.72, 0.82), (0.28, 0.82), (0.28, 0.18)])
    line(draw, s, c, [(0.5, 0.18), (0.5, 0.82)])
    r = s * 0.03
    draw.ellipse([s * 0.56 - r, s * 0.5 - r, s * 0.56 + r, s * 0.5 + r], fill=c)


def ico_flag(draw, s, c):
    line(draw, s, c, [(0.28, 0.18), (0.28, 0.82)])
    line(draw, s, c, [(0.28, 0.18), (0.76, 0.32), (0.28, 0.46)])


def ico_x(draw, s, c):
    line(draw, s, c, [(0.3, 0.3), (0.7, 0.7)])
    line(draw, s, c, [(0.7, 0.3), (0.3, 0.7)])


def ico_sun(draw, s, c):
    r = s * 0.16
    cx, cy = s * 0.5, s * 0.5
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c, width=max(2, s // 16))
    for i in range(8):
        a = i * math.pi / 4
        line(
            draw,
            s,
            c,
            [
                (0.5 + 0.28 * math.cos(a), 0.5 + 0.28 * math.sin(a)),
                (0.5 + 0.4 * math.cos(a), 0.5 + 0.4 * math.sin(a)),
            ],
        )


def ico_moon(draw, s, c):
    line(draw, s, c, [(0.62, 0.22), (0.38, 0.28), (0.28, 0.5), (0.38, 0.72), (0.62, 0.78), (0.48, 0.58), (0.48, 0.42), (0.62, 0.22)])


def ico_check(draw, s, c):
    line(draw, s, c, [(0.24, 0.52), (0.42, 0.7), (0.76, 0.32)])


def tab_png(name: str, fn, color: tuple[int, int, int, int]) -> None:
    img = Image.new("RGBA", (81, 81), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fn(draw, 81, color)
    img.save(TAB / f"{name}.png", "PNG")


def main() -> None:
    SEALS.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    TAB.mkdir(parents=True, exist_ok=True)

    save_stamp("meng-gold", "盟", GOLD, 11)
    save_stamp("meng-gold-night", "盟", GOLD_NIGHT, 11)
    save_stamp("yanqi-green", "验讫", GREEN, 23)
    save_stamp("zhengwei-vermilion", "证伪", VERMILION, 37)
    save_stamp("shouli-green", "受理", GREEN, 41)

    icons = {
        "caret-left": ico_caret,
        "shield": ico_shield,
        "link": ico_link,
        "window": ico_window,
        "copy": ico_copy,
        "door": ico_door,
        "flag": ico_flag,
        "sun": ico_sun,
        "moon": ico_moon,
        "check": ico_check,
    }
    for name, fn in icons.items():
        png_from_svg_paths(f"{name}-ink", fn, INK)
        png_from_svg_paths(f"{name}-night", fn, INK_NIGHT)
        svg_icon(
            f"{name}-ink",
            "",
            "#12293E",
        )
    png_from_svg_paths("x-alert", ico_x, ALERT)
    png_from_svg_paths("door-clear", ico_door, CLEAR)

    # overwrite empty svgs with real path markup
    svgs = {
        "caret-left": '<polyline points="15 18 9 12 15 6"/>',
        "shield": '<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z"/>',
        "link": '<rect x="3" y="8" width="7" height="8" rx="0"/><rect x="14" y="8" width="7" height="8" rx="0"/><line x1="9" y1="12" x2="15" y2="12"/>',
        "window": '<rect x="4" y="5" width="16" height="14" rx="0"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="12" y1="9" x2="12" y2="19"/>',
        "copy": '<rect x="8" y="8" width="11" height="12" rx="0"/><polyline points="5 16 5 4 16 4"/>',
        "door": '<rect x="6" y="4" width="12" height="16" rx="0"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="14.5" cy="12" r="0.6" fill="#12293E" stroke="none"/>',
        "flag": '<line x1="6" y1="4" x2="6" y2="20"/><polyline points="6 4 18 8 6 12"/>',
        "sun": '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/>',
        "moon": '<path d="M15 4 C10 5 7 9 7 13 C7 17 10 20 15 21 C12 21 8 18 8 13 C8 8 12 5 15 4 Z"/>',
        "check": '<polyline points="5 12 10 17 19 7"/>',
        "x": '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    }
    for name, paths in svgs.items():
        color = "#C53030" if name == "x" else "#12293E"
        svg_icon(f"{name}-ink" if name != "x" else "x-alert", paths, color)
        if name != "x":
            svg_icon(f"{name}-night", paths, "#E8ECEF")

    tab_png("verify", ico_shield, INK)
    tab_png("verify-active", ico_shield, (27, 58, 92, 255))
    tab_png("me", ico_window, INK)
    tab_png("me-active", ico_window, (27, 58, 92, 255))
    print("assets written")


if __name__ == "__main__":
    main()
