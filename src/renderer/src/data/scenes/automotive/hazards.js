// The automotive scene's hazards, from the official "Automotive - Answer Key.svg". Unlike the
// other scenes (raster cut-outs baked by tools/scene/build_objects.py), each hazard here is a
// hand-traced polygon (see vector-objects.js) tinted with plain CSS/SVG at tap time — no
// generated images. Only hazard 1 is wired up so far; the rest of the answer key's 17 hazards
// get added the same way, one at a time.
export const HAZARDS = [
  { num: 1, label: 'Working at Height without Fall Protection', keys: ['height-worker-automotive'] }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))
