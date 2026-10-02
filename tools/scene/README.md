# Scene objects

The game scene is `src/renderer/src/assets/scene.webp`. Everything the player can tap is a
designer cut-out: the originals are in `objects/` (project root).

Which cut-outs are hazards is decided by **`src/renderer/src/data/hazards.js`** (the official
17-hazard list; each hazard lists its cut-out `keys`). The build copies the cut-outs into
`src/renderer/src/assets/objects/`, recolouring any whose tint disagrees with that list
(hazard = green, everything else = red), using the designer's own tint formula.

When a thing is tapped, its cut-out is drawn over the scene. The cut-outs were made from a
1600px-wide copy of `image.png`, so they are drawn 1.491× bigger.

| Generated file | What it is |
|---|---|
| `src/renderer/src/assets/scene-labels.png` | Where a tap lands. Same size as the scene; each pixel's id = `red * 256 + green` (0 = nothing). Each object's tap area is its cut-out with small gaps filled, so one object is always one tap. |
| `src/renderer/src/data/scene-objects.json` | One entry per id: cut-out `key`, `kind` (`hazard`/`object`, from the cut-out's colour) and where it is drawn. |
| `tools/scene/object-positions.json` | Where each cut-out sits in `image.png` (found by template matching). |

## After adding, removing or replacing a cut-out

```bash
# one-time setup
python3 -m venv tools/scene/.cache/venv
tools/scene/.cache/venv/bin/pip install numpy pillow opencv-python-headless

# from the project root
tools/scene/.cache/venv/bin/python tools/scene/build_objects.py --locate
```

Then check `tools/scene/.cache/check_objects.png` (every cut-out drawn in place) and
`check_taps.png` (tap areas). To make a cut-out a hazard, add its file name to a hazard's `keys` in
`src/renderer/src/data/hazards.js` and rerun the build; the number of taps and the speed bonus
follow the length of that list.

In development, press **C** during a game to see every hazard (disabled in the installed app).
