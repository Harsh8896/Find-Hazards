import { GAME_DURATION_SECONDS, HAZARDS, POINTS_CORRECT, POINTS_WRONG } from '../data/hazards'
import { LEADERBOARD_SIZE } from '../lib/leaderboard'

export default function HowToPlayScreen({ durationSeconds, onStart, onBack }) {
  const total = HAZARDS.length

  const tiles = [
    { value: durationSeconds ?? GAME_DURATION_SECONDS, label: 'Seconds', tone: 'dark' },
    { value: total, label: 'Taps', tone: 'red' },
    { value: `+${POINTS_CORRECT}`, label: 'Right Hazard', tone: 'green' },
    { value: POINTS_WRONG, label: 'Wrong Tap', tone: 'grey' }
  ]

  const rules = [
    'Tap every hazard you can spot in the workplace scene.',
    'A correct tap lights the hazard up green. A wrong tap turns that whole object red — tapping it again costs nothing.',
    `You get one tap per hazard — ${total} hazards, ${total} taps. Tap carefully.`,
    'Tapping a hazard you already found does not count and does not use a tap.',
    'Finish fast to earn a speed bonus — press Submit when you are done.',
    `Top ${LEADERBOARD_SIZE} scores make the leaderboard · One attempt per mobile number.`
  ]

  return (
    <div className="screen howto-screen">
      <div className="howto-card">
        <div className="howto-header">
          <div className="howto-logo">
            <span className="howto-logo-main">PIP</span>
            <span className="howto-logo-sub">Global Safety</span>
          </div>
          <h1 className="howto-title">
            <span className="howto-chevrons">›››</span> How to Play
          </h1>
        </div>

        <div className="howto-tiles">
          {tiles.map((t) => (
            <div key={t.label} className={`howto-tile howto-tile-${t.tone}`}>
              <span className="howto-tile-value">{t.value}</span>
              <span className="howto-tile-label">{t.label}</span>
            </div>
          ))}
        </div>

        <ul className="howto-rules">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <div className="howto-actions">
          <button className="btn btn-ghost" onClick={onBack}>
            Cancel
          </button>
          <button className="btn btn-primary howto-start" onClick={onStart}>
            I&apos;m Ready — Start
          </button>
        </div>
      </div>
    </div>
  )
}
