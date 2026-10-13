#!/usr/bin/env python3
"""Draws the Taupunkt app icon (axes, saturation curve, partial-pressure line, dew drop) as PNG 192/512 and apple-touch. Needs Pillow."""
from PIL import Image, ImageDraw
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"
S = 4  # supersampling


def draw(size):
    n = size * S
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = n / 512
    d.rounded_rectangle([0, 0, n, n], radius=96 * u, fill=(27, 35, 48, 255))
    ink = (231, 234, 240, 235)
    w = int(14 * u)
    d.line([(96 * u, 392 * u), (416 * u, 392 * u)], fill=ink, width=w)
    d.line([(96 * u, 392 * u), (96 * u, 120 * u)], fill=ink, width=w)

    def bez(p0, p1, p2, p3, steps=60):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
            y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
            pts.append((x * u, y * u))
        return pts

    # saturation curve (orange): flat, then falling steeply
    orange = bez((96, 168), (180, 170), (260, 240), (300, 300)) + bez((300, 300), (340, 340), (380, 355), (416, 360))[1:]
    d.line(orange, fill=(255, 138, 80, 255), width=int(18 * u), joint="curve")
    # partial pressure (blue): a straight line crossing it
    d.line([(96 * u, 168 * u), (416 * u, 360 * u)], fill=(106, 165, 254, 255), width=int(18 * u))
    # dew drop at the crossing
    cx, cy = 244 * u, 300 * u
    r = 28 * u
    d.ellipse([cx - r, cy - r + 4 * u, cx + r, cy + r + 4 * u], fill=ink)
    d.polygon([(cx, cy - 56 * u), (cx - r * 0.95, cy - 6 * u), (cx + r * 0.95, cy - 6 * u)], fill=ink)
    return im.resize((size, size), Image.LANCZOS)


for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    draw(size).save(OUT / name)
    print("wrote", name)
