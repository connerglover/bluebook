#!/usr/bin/env python3
"""Generate the favicon set from one definition.

The mark is the same cursor-and-sparkle used on the sign-in screen, so the tab
icon and the page agree. It is drawn here rather than rasterised from the SVG
because the repo has no SVG rasteriser, and because a favicon needs decisions a
straight scale-down gets wrong — at 16px the sparkle has to go entirely or it
collapses into a stray grey pixel.

Everything is drawn 8x oversampled and downsampled with LANCZOS, which is what
keeps the diagonal edges of the cursor from going ragged at small sizes.

    python tools/make-favicon.py

Writes into public/:
    favicon.svg          what modern browsers actually use
    favicon.ico          16/32/48, for older browsers and bookmark bars
    apple-touch-icon.png 180, for an iOS home screen
    icon-192.png         }  referenced by site.webmanifest
    icon-512.png         }
    site.webmanifest
"""

import io
import os
import struct
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("This needs Pillow:  pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(HERE, "..", "public"))

BLUE_HEX = "#3f4ec7"                # --si-blue
BLUE = (63, 78, 199, 255)
WHITE = (255, 255, 255, 255)

# The sign-in logo's cursor, in its original 44x44 coordinate space.
CURSOR = [(9, 4), (20, 21), (13, 22), (18, 33), (14.5, 34.5), (9.5, 23.5), (4, 28)]

# The sparkle, as a four-pointed star: centre, reach, and waist.
SPARKLE_CENTRE = (31, 12)
SPARKLE_ARM = (5.5, 5.5)
SPARKLE_WAIST = (1.5, 1.5)

SS = 8                              # supersampling factor
SPARKLE_FLOOR = 24                  # below this, cursor only


def star_points(cx, cy, arm_x, arm_y, waist_x, waist_y):
    return [
        (cx, cy - arm_y),
        (cx + waist_x, cy - waist_y),
        (cx + arm_x, cy),
        (cx + waist_x, cy + waist_y),
        (cx, cy + arm_y),
        (cx - waist_x, cy + waist_y),
        (cx - arm_x, cy),
        (cx - waist_x, cy - waist_y),
    ]


def shapes_for(sparkle):
    out = [list(CURSOR)]
    if sparkle:
        cx, cy = SPARKLE_CENTRE
        out.append(star_points(cx, cy, SPARKLE_ARM[0], SPARKLE_ARM[1],
                               SPARKLE_WAIST[0], SPARKLE_WAIST[1]))
    return out


def fit(shapes, side, margin):
    """Scale and offset that centre `shapes` inside a `side`-wide square.

    Fitted to the shapes' OWN bounding box, not to the logo's 44x44 canvas.
    The cursor alone spans about a third of that canvas's width, so scaling by
    the canvas leaves it swimming in empty blue — the one thing a favicon
    cannot afford.
    """
    xs = [x for sh in shapes for x, _ in sh]
    ys = [y for sh in shapes for _, y in sh]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    box = side * (1 - 2 * margin)
    scale = min(box / bw, box / bh)
    ox = (side - bw * scale) / 2.0 - min(xs) * scale
    oy = (side - bh * scale) / 2.0 - min(ys) * scale
    return scale, ox, oy


def draw_icon(size, sparkle=None, bleed=True):
    """One icon at `size` px.

    `bleed` fills the whole square with blue. That is right for a browser tab
    and for iOS, which rounds the corners itself; the rounded corner is only
    drawn when the icon has to look like a standalone tile.

    Below SPARKLE_FLOOR the sparkle is dropped and the cursor grown to fill the
    space. A 16px tab icon is about six usable pixels of shape: the cursor's
    split tail and a second object cannot both survive that, and trying gives a
    smudge that reads as nothing. One bold arrow still reads as the mark.
    """
    if sparkle is None:
        sparkle = size >= SPARKLE_FLOOR

    shapes = shapes_for(sparkle)
    px = size * SS

    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bleed:
        d.rectangle([0, 0, px, px], fill=BLUE)
    else:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * 0.22), fill=BLUE)

    # Small icons get a tighter margin: at 16px every pixel of padding is a
    # pixel not spent on the shape.
    margin = 0.15 if size >= 64 else 0.09
    scale, ox, oy = fit(shapes, px, margin)

    for sh in shapes:
        d.polygon([(ox + x * scale, oy + y * scale) for x, y in sh], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def build_svg():
    """The same shapes, same fitting, as vector.

    Generated rather than hand-written so the SVG and the PNGs cannot drift
    apart. A favicon that changes shape depending on which file the browser
    happened to pick is worse than having no favicon at all.
    """
    shapes = shapes_for(True)
    scale, ox, oy = fit(shapes, 44.0, 0.15)

    paths = []
    for sh in shapes:
        pts = ["{:.2f} {:.2f}".format(ox + x * scale, oy + y * scale) for x, y in sh]
        paths.append('  <path d="M' + " L".join(pts) + ' Z" fill="#fff"/>')

    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">',
        "  <!-- The sign-in screen's mark, as the tab icon.",
        "       Generated by tools/make-favicon.py - edit that, not this. -->",
        '  <rect width="44" height="44" fill="' + BLUE_HEX + '"/>',
    ]
    lines.extend(paths)
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def write_ico(path, sizes):
    """Write a multi-size .ico, one independently drawn PNG frame per size.

    Written by hand rather than via Image.save(format="ICO"): Pillow's ICO
    writer takes ONE image and resizes it to each requested size, which throws
    away the per-size tuning above — the whole point of drawing 16px separately
    is that it needs a different composition, not a smaller one.

    ICO is a directory of images: a 6-byte header, a 16-byte entry per frame,
    then the frames. Frames may be PNG-encoded, which every browser in use
    understands and which keeps the file small.
    """
    blobs = []
    for s in sizes:
        buf = io.BytesIO()
        draw_icon(s).save(buf, format="PNG")
        blobs.append(buf.getvalue())

    header = struct.pack("<HHH", 0, 1, len(sizes))
    offset = len(header) + 16 * len(sizes)

    entries = b""
    for s, blob in zip(sizes, blobs):
        entries += struct.pack(
            "<BBBBHHII",
            0 if s >= 256 else s,   # width, 0 means 256
            0 if s >= 256 else s,   # height
            0,                      # palette size, 0 for truecolour
            0,                      # reserved
            1,                      # colour planes
            32,                     # bits per pixel
            len(blob),
            offset,
        )
        offset += len(blob)

    with open(path, "wb") as fh:
        fh.write(header)
        fh.write(entries)
        for blob in blobs:
            fh.write(blob)


MANIFEST = """{
  "name": "Bluebook Practice Test",
  "short_name": "Practice Test",
  "description": "An unofficial practice-test runtime. Load a .bbtest file and sit the exam.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#3f4ec7",
  "theme_color": "#3f4ec7",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
"""


def main():
    os.makedirs(PUBLIC, exist_ok=True)

    with open(os.path.join(PUBLIC, "favicon.svg"), "w", encoding="utf-8") as fh:
        fh.write(build_svg())

    # 16 is the tab, 32 the bookmark bar, 48 the Windows shortcut.
    write_ico(os.path.join(PUBLIC, "favicon.ico"), [16, 32, 48])

    draw_icon(180, bleed=True).save(os.path.join(PUBLIC, "apple-touch-icon.png"))
    draw_icon(192, bleed=False).save(os.path.join(PUBLIC, "icon-192.png"))
    draw_icon(512, bleed=False).save(os.path.join(PUBLIC, "icon-512.png"))

    with open(os.path.join(PUBLIC, "site.webmanifest"), "w", encoding="utf-8") as fh:
        fh.write(MANIFEST)

    for name in ("favicon.svg", "favicon.ico", "apple-touch-icon.png",
                 "icon-192.png", "icon-512.png", "site.webmanifest"):
        p = os.path.join(PUBLIC, name)
        print("  {:<22} {:>6.1f} KB".format(name, os.path.getsize(p) / 1024.0))


if __name__ == "__main__":
    main()
