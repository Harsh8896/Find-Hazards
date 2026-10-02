import { POINTS_CORRECT, POINTS_WRONG } from '../data/hazards'

// FINAL SCORE = (Correct × 10) − (Wrong × 8) + Speed Bonus, never below 0
// SPEED BONUS = round(Seconds left × Correct ÷ Total hazards)
// The bonus is scaled by accuracy, so fast random tapping earns almost nothing.
export function calculateScore({ correct, wrong, secondsLeft, totalHazards }) {
  const correctPoints = correct * POINTS_CORRECT
  const wrongPoints = wrong * POINTS_WRONG // POINTS_WRONG is negative
  const speedBonus = totalHazards ? Math.round((secondsLeft * correct) / totalHazards) : 0
  return {
    correctPoints,
    wrongPoints,
    speedBonus,
    score: Math.max(0, correctPoints + wrongPoints + speedBonus)
  }
}
