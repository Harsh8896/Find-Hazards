// The 20 hazards hidden in the chemical scene (assets/scenes/chemical/scene.webp), from the
// official answer key. `keys` are the designer cut-outs (chemical-objects/<key>.png, or
// chemical-images/<key>.png for real segmented replacements) that make up each hazard: tapping
// any of them finds it, and all of them light up green. Every other cut-out is a wrong tap
// (red).
// tools/scene/build_objects.py --scene chemical reads this file to decide which cut-outs are
// green. Cut-outs are added one hazard at a time (see chemical-images/) — a hazard whose key has
// no file yet simply isn't in the scene until it's added.
export const HAZARDS = [
  { num: 1, label: 'Improper Connection / Leak at Chemical Transfer', keys: ['chemical-transfer-leak'] },
  { num: 2, label: 'Chemical Spill on Floor (Slip Hazard)', keys: ['chemical-spill-floor'] },
  { num: 3, label: 'Working at Height Without Proper Fall Protection', keys: ['height-worker-chemical'] },
  { num: 4, label: 'Unsecured Tank Access / Open Manhole', keys: ['unsecured-tank-access'] },
  { num: 5, label: 'Inadequate Ventilation / Release of Hazardous Fumes', keys: ['hazardous-fumes-release'] },
  { num: 6, label: 'Inadequate PPE While Handling Chemicals (Respiratory Hazard)', keys: ['inadequate-ppe-chemical'] },
  { num: 7, label: 'Improper Chemical Storage / Incompatible Chemicals', keys: ['improper-chemical-storage'] },
  { num: 8, label: 'Forklift Movement Near Pedestrians (Collision Risk)', keys: ['forklift-chemical'] },
  { num: 9, label: 'Improper Storage in Chemical Room (No Segregation)', keys: ['chemical-room-storage'] },
  { num: 10, label: 'Blocked Emergency Shower & Eyewash Station', keys: ['blocked-emergency-shower'] },
  { num: 11, label: 'Leaking Drum (Environmental & Exposure Hazard)', keys: ['leaking-drum'] },
  { num: 12, label: 'Poor Manual Handling Posture (Musculoskeletal Risk)', keys: ['poor-manual-handling-chemical'] },
  { num: 13, label: 'Poor Housekeeping / Loose Pallet (Trip Hazard)', keys: ['loose-pallet'] },
  { num: 14, label: 'Unsecured Sharp Tools / Open Items on Workbench', keys: ['workbench-tools-chemical'] },
  { num: 15, label: 'Hot Work Activity (Fire / Explosion Risk)', keys: ['hot-work-activity'] },
  { num: 16, label: 'Unsecured Gas Cylinders (Falling Hazard)', keys: ['unsecured-gas-cylinder'] },
  { num: 17, label: 'Open Floor Drain / Uncovered Trench (Fall Hazard)', keys: ['open-floor-drain-chemical'] },
  { num: 18, label: 'Trailing Cables / Hoses (Trip Hazard)', keys: ['trailing-cables-chemical'] },
  { num: 19, label: 'Electrical Hazard Near Water / Improper Power Distribution', keys: ['electrical-hazard-water'] },
  { num: 20, label: 'Improper Storage of Chemical Bags (Unstable Stacking)', keys: ['chemical-bags-stacking'] }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))
