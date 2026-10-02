// The 17 hazards hidden in the scene (assets/scene.webp), from the official hazard list.
// `keys` are the designer cut-outs (objects/<key>.png) that make up each hazard: tapping any of
// them finds it, and all of them light up green. Every other cut-out is a wrong tap (red).
// tools/scene/build_objects.py reads this file to decide which cut-outs are green.
export const HAZARDS = [
  { num: 1, label: 'Missing Helmet / Safety Glass / Gloves Removed', keys: ['talking-worker', 'standing-worker'] },
  { num: 2, label: 'Unsafe Ladder Position', keys: ['unsecured-ladder'] },
  { num: 3, label: 'Poor Housekeeping', keys: ['loose-hose'] },
  { num: 4, label: 'Oil Spill', keys: ['oil-spill'] },
  { num: 5, label: 'No Signage for Oil Spill / Slippery Sign', keys: ['oily-footprints'] },
  { num: 6, label: 'Open Floor Drain', keys: ['open-manhole'] },
  { num: 7, label: 'Fire Extinguisher Blocked', keys: ['fire-extinguisher', 'left-boxes'] },
  { num: 8, label: 'Emergency Exit Obstructed', keys: ['blocked-exit'] },
  { num: 9, label: 'Poor Chemical Storage', keys: ['leaking-drums'] },
  { num: 10, label: 'Distracted Walking', keys: ['tripping-worker'] },
  { num: 11, label: 'Smoking in Non-Designated Area', keys: ['smoking-worker'] },
  { num: 12, label: 'Missing Barricades', keys: ['scaffolding', 'scaffold-worker'] },
  { num: 13, label: 'Unsecured Gas Cylinder', keys: ['gas-cylinder'] },
  { num: 14, label: 'Electrical Panel Obstructed', keys: ['electrical-panels'] },
  { num: 15, label: 'Improper Tool Storage', keys: ['platform-hose'] },
  { num: 16, label: 'Improper Stacking', keys: ['warehouse-boxes'] },
  { num: 17, label: 'Blocked Spill Kit', keys: ['spill-kit'] }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))

export const GAME_DURATION_SECONDS = 120
export const POINTS_CORRECT = 10
export const POINTS_WRONG = -8
//  mmmmmmmmmm