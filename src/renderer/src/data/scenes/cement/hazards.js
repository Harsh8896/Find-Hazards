// Ten cement-industry hazards marked in Cement-Industry-Answer-Key.png.
// Each numbered answer-key hazard can have multiple valid tap targets, but each tap highlights
// only the individual object the player chose.
export const HAZARDS = [
  { num: 1, label: 'Unguarded Conveyor: Entanglement', keys: ['unguarded-conveyor-cement'] },
  { num: 2, label: 'Cement Dust: No Respiratory Protection', keys: ['cement-dust-worker'] },
  { num: 3, label: 'Work at Height: No Edge Protection', keys: ['height-worker-cement'] },
  { num: 4, label: 'Hot Clinker: Heat and Burn Exposure', keys: ['hot-clinker-worker'] },
  {
    num: 5,
    label: 'Forklift and Pedestrian Conflict',
    keys: ['pedestrian-forklift-cement', 'forklift-cement']
  },
  { num: 6, label: 'Open Electrical Panel: Shock Exposure', keys: ['open-electrical-panel-cement'] },
  { num: 7, label: 'Hot Work Close to Gas Cylinders', keys: ['hot-work-cement', 'gas-cylinders-cement'] },
  { num: 8, label: 'Trailing Hose: Trip Hazard', keys: ['trailing-hose-cement'] },
  { num: 9, label: 'Blocked Emergency Exit', keys: ['blocked-exit-cement'] },
  { num: 10, label: 'Poor Lifting Posture: Back Injury', keys: ['poor-lifting-posture-cement'] }
]

export const hazardByNum = new Map(HAZARDS.map((h) => [h.num, h]))
export const hazardForKey = new Map(HAZARDS.flatMap((h) => h.keys.map((k) => [k, h])))
