import { useEffect, useState } from 'react'
import { getLeaderboard, getLeaderboardSettings, LEADERBOARD_SIZE } from '../lib/leaderboard'

const TOP_N = LEADERBOARD_SIZE
const REFRESH_MS = 3000

// games saved before the speed-bonus scoring have no breakdown
const show = (v) => v ?? '—'

// public leaderboard: never expose full contact details on screen
const maskEmail = (email) => {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  if (!domain) return '****'
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`
}

const maskPhone = (phone) => {
  if (!phone) return '—'
  const digits = String(phone)
  if (digits.length <= 4) return '*'.repeat(digits.length)
  const head = digits.slice(0, 2)
  const tail = digits.slice(-2)
  return `${head}${'*'.repeat(digits.length - 4)}${tail}`
}

export default function Leaderboard({ currentPhone, onBack }) {
  const [rows, setRows] = useState([])
  const [settings, setSettings] = useState(null)
  const [activeEvent, setActiveEvent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    // onLeaderboardChanged refreshes instantly when a game is saved or an admin changes
    // visibility/mode; polling is the fallback for any window it doesn't reach
    const load = async () => {
      try {
        const [data, lbSettings, gameSettings] = await Promise.all([
          getLeaderboard(TOP_N),
          getLeaderboardSettings(),
          window.api.db.getGameSettings()
        ])
        if (cancelled) return
        setRows(data)
        setSettings(lbSettings)
        setActiveEvent(gameSettings?.activeEvent || '')
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    // instant refresh the moment a game is saved, on top of the polling fallback above
    const offChanged = window.api.onLeaderboardChanged?.(load)
    return () => {
      cancelled = true
      clearInterval(t)
      offChanged?.()
    }
  }, [])

  if (loaded && settings && !settings.visible) {
    return (
      <div className="screen leaderboard-screen">
        <div className="lb-angles" aria-hidden="true" />
        <header className="leaderboard-header">
          <div className="lb-logo">
            <span className="lb-logo-main">PIP</span>
            <span className="lb-logo-sub">Global Safety</span>
          </div>
          <div className="lb-heading">
            <h1>
              <span className="lb-chevrons">›››</span> Spot The Hazards
            </h1>
          </div>
        </header>
        <div className="lb-list">
          <div className="lb-empty">The leaderboard is currently unavailable.</div>
        </div>
        {onBack && (
          <div className="lb-actions">
            <button className="lb-button" onClick={onBack}>
              Back
            </button>
          </div>
        )}
      </div>
    )
  }

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
  const fmtDay = (d) =>
    d === todayStr
      ? "Today's Scores"
      : new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
  const modeLabel = settings?.mode === 'day' ? fmtDay(settings.date) : 'All-Time'

  return (
    <div className="screen leaderboard-screen">
      <div className="lb-angles" aria-hidden="true" />

      <header className="leaderboard-header">
        <div className="lb-logo">
          <span className="lb-logo-main">PIP</span>
          <span className="lb-logo-sub">Global Safety</span>
        </div>
        <div className="lb-heading">
          <h1>
            <span className="lb-chevrons">›››</span> Spot The Hazards
          </h1>
          <p className="lb-sub">
            Leaderboard <span className="lb-sep">|</span> Top {TOP_N}
            <span className="lb-sep">|</span> {modeLabel}
            <span className="lb-sep">|</span> Highest score, fastest time
          </p>
        </div>
      </header>

      {activeEvent && (
        <div className="lb-event-badge-row">
          <p className="lb-event-badge">
            <span className="lb-event-badge-dot" aria-hidden="true" />
            {activeEvent}
          </p>
        </div>
      )}

      <div className="lb-list">
        {rows.length > 0 && (
          <div className="lb-row lb-head">
            <span>Rank</span>
            <span>Name</span>
            <span>Company</span>
            <span>Email</span>
            <span>Mobile</span>
            <span className="lb-num">Correct</span>
            <span className="lb-num">Wrong</span>
            <span className="lb-num">Secs Left</span>
            <span className="lb-num">Bonus</span>
            <span className="lb-num">Score</span>
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.phone}
            className={`lb-row ${i < 3 ? 'lb-top' : ''} ${r.phone === currentPhone ? 'lb-me' : ''}`}
          >
            <span className="lb-pos">{String(i + 1).padStart(2, '0')}</span>
            <span className="lb-name">{r.name}</span>
            <span className="lb-company">{r.company}</span>
            <span className="lb-contact">{maskEmail(r.email)}</span>
            <span className="lb-contact">{maskPhone(r.phone)}</span>
            <span className="lb-num">{show(r.hazardsFound)}</span>
            <span className="lb-num">{show(r.wrongPicks)}</span>
            <span className="lb-num">{show(r.secondsLeft)}</span>
            <span className="lb-num">{show(r.speedBonus)}</span>
            <span className="lb-num lb-score">{r.score}</span>
          </div>
        ))}
        {error && <div className="lb-empty">Unable to load leaderboard: {error}</div>}
        {!error && loaded && !rows.length && (
          <div className="lb-empty">Waiting for the first entries...</div>
        )}
      </div>

      {onBack && (
        <div className="lb-actions">
          <button className="lb-button" onClick={onBack}>
            Back
          </button>
        </div>
      )}
    </div>
  )
}
