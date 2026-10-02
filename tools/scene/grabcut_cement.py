"""One-off: refine the cement scene's hand-traced hazard polygons into real GrabCut-segmented
silhouettes, the same way automotive's hazard 1 was made (see vector-objects.js comment there).

Seeds GrabCut with each existing polygon (probable foreground) inside a dilated bounding box
(probable background outside), runs a few iterations, then extracts and simplifies the largest
resulting contour back into a point list in the same 1448x822 cropped-play-area space the game
uses. Prints a Python literal for each hazard's new `points` array to paste into
src/renderer/src/data/scenes/cement/vector-objects.js, and writes a preview PNG to check by eye.

Run with: tools/scene/.cache/venv/bin/python tools/scene/grabcut_cement.py
"""
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/renderer/src/assets/Cement-Industry.png'
VECTOR_JS = ROOT / 'src/renderer/src/data/scenes/cement/vector-objects.js'
OUT_PREVIEW = Path(__file__).resolve().parent / '.cache' / 'cement_grabcut_check.png'

PLAY_W, PLAY_H = 1448, 822


def load_play_area():
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    dx = (w - PLAY_W) // 2
    dy = (h - PLAY_H) // 2
    return np.array(im.crop((dx, dy, dx + PLAY_W, dy + PLAY_H)))


def parse_objects(text):
    objs = []
    for m in re.finditer(r"\{\s*id:\s*(\d+),\s*key:\s*'([\w-]+)',\s*kind:\s*'(\w+)',(.*?)points:\s*\[(.*?)\]\s*\}", text, re.S):
        oid, key, kind, mid, pts_str = m.groups()
        pts = [(int(x), int(y)) for x, y in re.findall(r"\[(-?\d+),\s*(-?\d+)\]", pts_str)]
        hit_pad = re.search(r'hitPaddingPx:\s*(\d+)', mid)
        objs.append(dict(id=int(oid), key=key, kind=kind, points=pts,
                          hitPaddingPx=int(hit_pad.group(1)) if hit_pad else None))
    return objs


def grabcut_refine(img, points, pad=14):
    pts = np.array(points, np.int32)
    x0, y0, x1, y1 = pts[:, 0].min(), pts[:, 1].min(), pts[:, 0].max(), pts[:, 1].max()
    bx0, by0 = max(x0 - pad, 0), max(y0 - pad, 0)
    bx1, by1 = min(x1 + pad, img.shape[1] - 1), min(y1 + pad, img.shape[0] - 1)

    mask = np.full(img.shape[:2], cv2.GC_BGD, np.uint8)
    mask[by0:by1, bx0:bx1] = cv2.GC_PR_BGD
    cv2.fillPoly(mask, [pts], cv2.GC_PR_FGD)
    # a shrunk core of the traced polygon is marked definite-foreground, to anchor GrabCut
    core = cv2.erode(
        cv2.fillPoly(np.zeros(img.shape[:2], np.uint8), [pts], 1),
        np.ones((5, 5), np.uint8)
    )
    mask[core > 0] = cv2.GC_FGD

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgd_model, fgd_model, 6, cv2.GC_INIT_WITH_MASK)

    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return points  # grabcut found nothing usable; keep the hand trace
    biggest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(biggest) < 40:
        return points
    epsilon = 0.004 * cv2.arcLength(biggest, True)
    approx = cv2.approxPolyDP(biggest, epsilon, True)
    return [(int(p[0][0]), int(p[0][1])) for p in approx]


def main():
    img = load_play_area()
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    text = VECTOR_JS.read_text()
    objs = parse_objects(text)

    preview = img.copy().astype(np.float32)
    results = []
    for o in objs:
        new_pts = grabcut_refine(bgr, o['points'])
        results.append((o, new_pts))
        print(f"id {o['id']:>2} {o['key']:28} {len(o['points'])} -> {len(new_pts)} pts")
        m = np.zeros(img.shape[:2], np.uint8)
        cv2.fillPoly(m, [np.array(new_pts, np.int32)], 1)
        col = np.array([40, 220, 100])
        preview[m > 0] = preview[m > 0] * 0.45 + col * 0.55
        cv2.polylines(preview, [np.array(new_pts, np.int32)], True, (0, 255, 0), 1)

    Image.fromarray(preview.astype(np.uint8)).save(OUT_PREVIEW)
    print(f'\npreview written to {OUT_PREVIEW}')

    print('\n--- paste-ready points ---')
    for o, new_pts in results:
        pts_js = ',\n      '.join(f'[{x}, {y}]' for x, y in new_pts)
        print(f"id={o['id']} key={o['key']}\n      {pts_js}\n")


if __name__ == '__main__':
    main()
