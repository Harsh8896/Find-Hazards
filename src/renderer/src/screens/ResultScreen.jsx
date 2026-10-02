import { POINTS_CORRECT, POINTS_WRONG } from '../data/hazards'
import { LEADERBOARD_SIZE } from '../lib/leaderboard'

export default function ResultScreen({ lead, result, onDone }) {
  const { score, hazardsFound, totalHazards, wrongPicks, speedBonus, secondsLeft, rank } = result
  const correctPoints = hazardsFound * POINTS_CORRECT
  const wrongPoints = wrongPicks * POINTS_WRONG

  return (
    <div className="screen result-screen">
      <div className="result-card">
        <h1 className="result-title">Great job, {lead.name.split(' ')[0]}!</h1>

        <div className="result-score">{score}</div>
        <div className="result-score-label">points</div>

        <div className="result-stats">
          <div className="stat">
            <span className="stat-value">
              {hazardsFound}/{totalHazards}
            </span>
            <span className="stat-label">Hazards Found</span>
          </div>
          <div className="stat">
            <span className="stat-value">{wrongPicks}</span>
            <span className="stat-label">Wrong Taps</span>
          </div>
          <div className="stat">
            <span className="stat-value">{secondsLeft}s</span>
            <span className="stat-label">Seconds Left</span>
          </div>
        </div>

        <div className="score-breakdown">
          <div>
            <span>Correct</span>
            <span>
              {hazardsFound} × {POINTS_CORRECT} = {correctPoints}
            </span>
          </div>
          <div>
            <span>Wrong</span>
            <span>
              {wrongPicks} × {Math.abs(POINTS_WRONG)} = {wrongPoints}
            </span>
          </div>
          <div>
            <span>Speed bonus</span>
            <span>
              {secondsLeft} × {hazardsFound} ÷ {totalHazards} = +{speedBonus}
            </span>
          </div>
          <div className="score-breakdown-total">
            <span>Final score</span>
            <span>
              {correctPoints} {wrongPoints < 0 ? '−' : '+'} {Math.abs(wrongPoints)} + {speedBonus}
              {' = '}
              {score}
            </span>
          </div>
        </div>

        <p className="sync-note">
          {result.saveError
            ? 'Your score could not be saved. Please show this screen to the staff.'
            : rank
              ? `You rank #${rank} on the leaderboard${rank <= LEADERBOARD_SIZE ? ` — you made the Top ${LEADERBOARD_SIZE}!` : '.'}`
              : 'Your score has been saved.'}
        </p>

        <button className="btn btn-primary btn-full" onClick={onDone}>
          Finish &amp; Logout
        </button>
      </div>
    </div>
  )
}
