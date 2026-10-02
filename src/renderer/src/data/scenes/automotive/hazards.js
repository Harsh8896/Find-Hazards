// The automotive scene's hazards, from the official "Automotive - Answer Key.svg". Unlike the
// other scenes (raster cut-outs baked by tools/scene/build_objects.py), each hazard here is a
// hand-traced polygon (see vector-objects.js) tinted with plain CSS/SVG at tap time — no
// generated images. All 17 answer-key hazards are wired up.
export const HAZARDS = [
  {
    num: 1,
    label: 'Working at Height without Fall Protection',
    keys: ['height-worker-automotive']
  },
  { num: 2, label: 'Unsafe Robot Cell Access', keys: ['robot-cell-automotive'] },
  {
    num: 3,
    label: 'Missing/Incorrect PPE (Gloves / Eye Protection)',
    keys: ['ppe-worker-automotive']
  },
  { num: 4, label: 'Poor Manual Handling Posture', keys: ['lifting-worker-automotive'] },
  { num: 5, label: 'Forklift Pedestrian Interaction', keys: ['forklift-automotive'] },
  { num: 6, label: 'Distracted Walking (Using Mobile Phone)', keys: ['phone-walker-automotive'] },
  {
    num: 7,
    label: 'Unsafe Ladder / Improper Access to Mezzanine',
    keys: ['mezzanine-worker-automotive']
  },
  { num: 8, label: 'Inadequate Welding Protection', keys: ['welders-automotive'] },
  { num: 9, label: 'Improper Chemical Storage', keys: ['chemical-drums-automotive'] },
  {
    num: 10,
    label: 'Electrical Panel Obstruction',
    keys: ['electrical-panel-automotive', 'panel-trolley-automotive']
  },
  {
    num: 11,
    label: 'Oil Spill / Slippery Floor',
    keys: ['oil-spill-automotive', 'slipping-worker-automotive']
  },
  {
    num: 12,
    label: 'Poor Housekeeping',
    keys: ['engine-trolley-automotive', 'housekeeping-clutter-automotive']
  },
  {
    num: 13,
    label: 'Improper Tool Usage',
    keys: ['tyre-worker-automotive', 'loose-tyre-automotive']
  },
  {
    num: 14,
    label: 'Missing PPE (Safety Glasses / Hearing Protection)',
    keys: ['no-glasses-worker-automotive']
  },
  { num: 15, label: 'Unsecured Gas Cylinders', keys: ['gas-cylinders-automotive'] },
  { num: 16, label: 'Blocked Fire Extinguisher', keys: ['fire-extinguisher-automotive'] },
  {
    num: 17,
    label: 'Blocked Emergency Exit',
    keys: ['emergency-exit-automotive', 'exit-boxes-automotive']
  }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))
