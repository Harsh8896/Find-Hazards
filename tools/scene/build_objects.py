"""Build a game scene's tap map from its designer object cut-outs.

Every file in a scene's originals folder is one tappable thing in the scene, tinted green or
red. Which things are hazards comes from that scene's hazards.js; a cut-out whose colour
disagrees with that list is recoloured, and the results are written to that scene's objects/
folder for the game.

Run from the project root, picking a scene with --scene (default: warehouse, the original
game):
    tools/scene/.cache/venv/bin/python tools/scene/build_objects.py [--scene NAME] [--locate]

--locate re-finds where each cut-out sits in the scene (template matching) and rewrites that
scene's object-positions json; only needed when images are added or replaced, and only works
when the cut-outs are actual pixel-crops of the scene image (see SCENES below — a scene with
positions already fully filled in skips this).

Writes (paths depend on the scene):
  .../scene.webp           the scene the game shows (source cropped to content)
  .../scene-labels.png     where a tap lands: RGB, id = R*256 + G (0 = nothing)
  .../scene-objects.json   [{id, key, kind, x, y, w, h}] in scene.webp pixels
  tools/scene/.cache/<scene>_check_*.png   previews to review by eye
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'src/renderer/src/assets'
DATA = ROOT / 'src/renderer/src/data'
HERE = Path(__file__).resolve().parent
CACHE = HERE / '.cache'

# Every game scene the kiosk can show (admin picks one at runtime, see AdminScreen "Active
# Game"). Each has its own source photo, designer cut-outs, hazards list and generated output —
# adding a scene here never touches another scene's files.
SCENES = {
    'warehouse': dict(
        source=ASSETS / 'image.png',
        originals=ROOT / 'objects',
        objects=ASSETS / 'objects',
        hazards_js=DATA / 'hazards.js',
        scene_webp=ASSETS / 'scene.webp',
        labels_png=ASSETS / 'scene-labels.png',
        objects_json=DATA / 'scene-objects.json',
        positions=HERE / 'object-positions.json',
        overrides=None,
        # The source has a 3px red/black strip on top and flat borders; this box is the
        # real picture.
        crop=(1, 3, 2383, 1423),
        scale=2386 / 1600  # the cut-outs come from a 1600px-wide copy of image.png
    ),
    'pharma': dict(
        source=ASSETS / 'PharmaIndustry.jpg',
        originals=ROOT / 'pharma-objects',
        # real, precisely-segmented crops of PharmaIndustry.jpg, replacing pharma-objects one
        # key at a time — a file here wins over the same-named file in `originals`.
        overrides=ROOT / 'pharma-images',
        objects=ASSETS / 'scenes/pharma/objects',
        hazards_js=DATA / 'scenes/pharma/hazards.js',
        scene_webp=ASSETS / 'scenes/pharma/scene.webp',
        labels_png=ASSETS / 'scenes/pharma/scene-labels.png',
        objects_json=DATA / 'scenes/pharma/scene-objects.json',
        positions=HERE / 'object-positions-pharma.json',
        crop=None,  # full photo, no border to crop
        scale=1  # the cut-outs are already at the photo's own resolution
    ),
    'chemical': dict(
        source=ASSETS / 'ChemicalIndustry.png',
        originals=ROOT / 'chemical-objects',
        # real, precisely-segmented crops of ChemicalIndustry.png, added one hazard at a time —
        # a file here wins over the same-named file in `originals`.
        overrides=ROOT / 'chemical-images',
        objects=ASSETS / 'scenes/chemical/objects',
        hazards_js=DATA / 'scenes/chemical/hazards.js',
        scene_webp=ASSETS / 'scenes/chemical/scene.webp',
        labels_png=ASSETS / 'scenes/chemical/scene-labels.png',
        objects_json=DATA / 'scenes/chemical/scene-objects.json',
        positions=HERE / 'object-positions-chemical.json',
        # the source has a title strip on top and a PPE-icon footer on the bottom; this box is
        # the real picture.
        crop=(0, 137, 1448, 987),
        scale=1  # the cut-outs are already at the photo's own resolution
    )
}

# Taps between the pipes of a refinery or the stripes of a truck must still find that object,
# so each object's tap area is its cut-out with gaps up to this size (full-res px) filled in.
# Hazards get a smaller close so the tap area never swallows its neighbours.
CLOSE_OBJECT = 31
CLOSE_HAZARD = 11


def edges(gray):
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.magnitude(gx, gy)


def load_cutout(path, scale):
    im = Image.open(path).convert('RGBA')
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)


def locate(files, source, scale, positions_path):
    """Where each (scaled) cut-out matches the scene best, by edge correlation."""
    scene = edges(cv2.cvtColor(np.array(Image.open(source).convert('RGB')), cv2.COLOR_RGB2GRAY).astype(np.float32))
    out = {}
    for f in files:
        a = np.array(load_cutout(f, scale))
        g = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
        tmpl = edges(g) * (a[..., 3] > 128)
        res = cv2.matchTemplate(scene, tmpl, cv2.TM_CCOEFF_NORMED)
        _, score, _, (x, y) = cv2.minMaxLoc(res)
        out[f.stem] = dict(x=int(x), y=int(y), score=round(float(score), 3))
        flag = '' if score > 0.45 else '   <-- weak match, check check_objects.png'
        print(f'  {f.stem:22} at ({x:4},{y:4}) score={score:.2f}{flag}', flush=True)
    positions_path.write_text(json.dumps(out, indent=1) + '\n')
    return out


# The designer's tint: pixel = 0.47 * scene + TINT. Swapping the tint recolours a cut-out
# exactly as if the designer had tinted it the other colour.
TINT = {'hazard': np.array([21, 117, 47]), 'object': np.array([122, 23, 20])}


def hazard_keys(hazards_js):
    import re
    keys = set()
    for group in re.findall(r"keys:\s*\[([^\]]*)\]", hazards_js.read_text()):
        keys.update(re.findall(r"'([\w-]+)'", group))
    return keys


def colour_of(path):
    a = np.array(Image.open(path).convert('RGBA'))
    rgb = a[a[..., 3] > 128][:, :3].astype(int)
    return 'hazard' if rgb[:, 1].mean() > rgb[:, 0].mean() else 'object'


def prepare_cutouts(originals, objects, hazards_js, overrides=None):
    """Copy the originals into the app, recolouring any whose colour disagrees with hazards.js.

    A same-named file under `overrides` (already a real segmented crop with the tint baked in,
    see pharma-images/) is used as-is instead of the `originals` version, and is never
    recoloured — it's already correct.
    """
    wanted = hazard_keys(hazards_js)
    objects.mkdir(parents=True, exist_ok=True)
    override_files = {f.stem: f for f in overrides.glob('*.png')} if overrides else {}
    names = {f.stem for f in originals.glob('*.png')} | set(override_files)
    for k in sorted(wanted - names):
        print(f'  WARNING: hazards.js lists "{k}" but no {k}.png in originals or overrides')
    for stale in objects.glob('*.png'):
        if stale.stem not in names:
            stale.unlink()
    kinds = {}
    for f in sorted(originals.glob('*.png')):
        kind = 'hazard' if f.stem in wanted else 'object'
        kinds[f.stem] = kind
        if f.stem in override_files:
            continue  # handled below, from the override file instead
        have = colour_of(f)
        if have == kind:
            Image.open(f).save(objects / f.name)
            continue
        a = np.array(Image.open(f).convert('RGBA')).astype(int)
        a[..., :3] = np.clip(a[..., :3] + TINT[kind] - TINT[have], 0, 255)
        Image.fromarray(a.astype(np.uint8), 'RGBA').save(objects / f.name)
        print(f'  recoloured {f.stem} {have} -> {kind}')
    for stem, f in override_files.items():
        kind = 'hazard' if stem in wanted else 'object'
        kinds[stem] = kind
        Image.open(f).convert('RGBA').save(objects / f.name)
        print(f'  {stem:22} using pre-tinted override from {overrides.name}/')
    return kinds


def fill_holes(mask):
    m = mask.astype(np.uint8)
    flood = np.pad(m, 1).copy()
    cv2.floodFill(flood, None, (0, 0), 1)
    return (m | (1 - flood[1:-1, 1:-1])).astype(bool)


def build_scene(name, cfg, force_locate):
    print(f'=== {name} ===')
    source, originals, objects = cfg['source'], cfg['originals'], cfg['objects']
    hazards_js, scale, positions_path = cfg['hazards_js'], cfg['scale'], cfg['positions']

    kinds = prepare_cutouts(originals, objects, hazards_js, cfg.get('overrides'))
    files = sorted(objects.glob('*.png'))
    positions = json.loads(positions_path.read_text()) if positions_path.exists() else {}
    missing = [f for f in files if f.stem not in positions]
    if force_locate or missing:
        print('locating cut-outs in the scene...')
        positions = locate(files, source, scale, positions_path)

    scene = Image.open(source).convert('RGB')
    crop = cfg['crop']
    if crop:
        scene = scene.crop(crop)
    scene.save(cfg['scene_webp'], quality=92, method=6)
    W, H = scene.size
    dx, dy = crop[:2] if crop else (0, 0)

    items = []
    for f in files:
        cut = load_cutout(f, scale)
        p = positions[f.stem]
        x, y = p['x'] - dx, p['y'] - dy
        alpha = np.array(cut)[..., 3] > 100
        full = np.zeros((H, W), bool)
        ys, xs = np.nonzero(alpha)
        keep = (ys + y >= 0) & (ys + y < H) & (xs + x >= 0) & (xs + x < W)
        full[ys[keep] + y, xs[keep] + x] = True
        items.append(dict(key=f.stem, kind=kinds[f.stem], x=x, y=y, w=cut.width, h=cut.height, mask=full))

    # tap areas: big objects first so smaller ones sit on top; hazards on top of everything
    items.sort(key=lambda it: (it['kind'] == 'hazard', -int(it['mask'].sum())))
    labels = np.zeros((H, W), np.uint16)
    out = []
    for i, it in enumerate(items, start=1):
        k = CLOSE_HAZARD if it['kind'] == 'hazard' else CLOSE_OBJECT
        hit = cv2.morphologyEx(it['mask'].astype(np.uint8), cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
        hit = fill_holes(hit) if it['kind'] == 'object' else hit.astype(bool)
        labels[hit] = i
        out.append(dict(id=i, key=it['key'], kind=it['kind'], x=it['x'], y=it['y'], w=it['w'], h=it['h']))

    rgb = np.zeros((H, W, 3), np.uint8)
    rgb[..., 0] = labels >> 8
    rgb[..., 1] = labels & 0xFF
    cfg['labels_png'].parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgb).save(cfg['labels_png'], optimize=True)
    cfg['objects_json'].parent.mkdir(parents=True, exist_ok=True)
    cfg['objects_json'].write_text(json.dumps(out, separators=(',', ':')) + '\n')
    hz = [o['key'] for o in out if o['kind'] == 'hazard']
    print(f'wrote {len(out)} objects: {len(hz)} hazards ({", ".join(hz)})')

    # previews: every cut-out drawn where the game draws it, and the tap map
    comp = scene.convert('RGBA')
    for o in out:
        comp.alpha_composite(load_cutout(objects / f"{o['key']}.png", scale), (max(o['x'], 0), max(o['y'], 0)))
    comp.convert('RGB').save(CACHE / f'{name}_check_objects.png')
    view = np.array(scene).astype(np.float32)
    rng = np.random.default_rng(1)
    for o in out:
        m = labels == o['id']
        col = np.array([40, 220, 100]) if o['kind'] == 'hazard' else rng.integers(60, 255, 3)
        view[m] = view[m] * 0.4 + col * 0.6
    Image.fromarray(view.astype(np.uint8)).save(CACHE / f'{name}_check_taps.png')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scene', choices=sorted(SCENES), default='warehouse')
    ap.add_argument('--locate', action='store_true')
    args = ap.parse_args()
    CACHE.mkdir(exist_ok=True)
    build_scene(args.scene, SCENES[args.scene], args.locate)


if __name__ == '__main__':
    main()
