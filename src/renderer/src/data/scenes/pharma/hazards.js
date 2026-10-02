// The 20 hazards in the pharma scene (assets/scenes/pharma/scene.webp), from the official
// answer key. This is a vector scene like automotive: each key is an object in vector-objects.js
// with its own pixel mask. Tapping any key of a hazard finds it.
export const HAZARDS = [
  {
    num: 1,
    label: 'Working at Height Without Proper Fall Protection',
    keys: ['height-worker-pharma']
  },
  { num: 2, label: 'Inadequate PPE While Operating Equipment', keys: ['ppe-operator-panel'] },
  {
    num: 3,
    label: 'Improper Manual Handling (Heavy Container)',
    keys: ['manual-handling-container']
  },
  { num: 4, label: 'Dust Exposure During Material Handling', keys: ['dust-exposure-worker'] },
  { num: 5, label: 'Powder Spill on Floor (Slip Hazard)', keys: ['powder-spill-floor'] },
  { num: 6, label: 'Trailing Cables / Hoses (Trip Hazard)', keys: ['trailing-cables-pharma'] },
  { num: 7, label: 'Wet Floor - Poor Housekeeping', keys: ['wet-floor-sign'] },
  {
    num: 8,
    label: 'Inadequate Hand Protection While Handling Chemicals',
    keys: ['hand-protection-bottles', 'hand-protection-worker', 'hand-protection-worker-legs']
  },
  { num: 9, label: 'Unsecured Sharp Tools / Open Items on Work Table', keys: ['worktable-tools'] },
  { num: 10, label: 'Overfilled Waste Bin (Bio/Chemical Waste)', keys: ['overfilled-waste-bin'] },
  { num: 11, label: 'Forklift Movement Near Pedestrians', keys: ['forklift-pharma'] },
  { num: 12, label: 'Electrical Cable on Floor', keys: ['electrical-cable-floor'] },
  {
    num: 13,
    label: 'Improper Chemical Storage (Segregation Issue)',
    keys: ['chemical-storage-drums']
  },
  {
    num: 14,
    label: 'Blocked Emergency Exit',
    keys: ['blocked-emergency-exit', 'blocked-emergency-exit-sign']
  },
  { num: 15, label: 'Flammable Chemical Cabinet Misuse', keys: ['flammable-cabinet'] },
  { num: 16, label: 'Poor Ergonomic Seating (No Back Support)', keys: ['ergonomic-stool'] },
  { num: 17, label: 'Obstructed Fire Extinguisher Access', keys: ['fire-extinguisher-obstructed'] },
  {
    num: 18,
    label: 'Poor Manual Handling Posture',
    keys: ['poor-manual-handling-posture', 'poor-manual-handling-posture-bin']
  },
  { num: 19, label: 'Open/Unstable Storage Cabinet', keys: ['open-unstable-cabinet'] },
  { num: 20, label: 'Obstructed Walkway (Pallet Jack and Material)', keys: ['obstructed-walkway'] }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))
