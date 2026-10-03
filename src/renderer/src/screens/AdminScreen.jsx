import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DateFilterSelect from '../components/DateFilterSelect'
import Select from '../components/Select'
import { SCENES } from '../data/scenes'

const GAME_SCENE_OPTIONS = Object.values(SCENES).map((s) => ({ value: s.id, label: s.label }))
const SCENE_OPTIONS = [{ value: 'all', label: 'All Scenarios' }, ...GAME_SCENE_OPTIONS]

const admin = () => window.api.admin
// the main process rejects admin calls with this once the session is gone
const isAuthError = (err) => String(err?.message).includes('ADMIN_AUTH_REQUIRED')
// Electron prefixes errors from the main process; show only the useful part
const cleanError = (err) =>
  String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

// Leave the dashboard (and sign out) if nobody touches the kiosk for this long,
// so visitors never see players' contact details.
const IDLE_EXIT_MS = 5 * 60 * 1000

export default function AdminScreen({ onExit }) {
  const [mode, setMode] = useState('loading') // 'loading' | 'login' | 'dashboard'
  const [notice, setNotice] = useState('')

  useEffect(() => {
    admin()
      .status()
      .then((s) => setMode(s.loggedIn ? 'dashboard' : 'login'))
      .catch((err) => {
        setNotice(cleanError(err))
        setMode('login')
      })
  }, [])

  const exit = useCallback(async () => {
    try {
      await admin().logout()
    } finally {
      onExit()
    }
  }, [onExit])

  const sessionExpired = useCallback(() => {
    setNotice('Your admin session expired. Please sign in again.')
    setMode('login')
  }, [])

  return (
    <div className="screen admin-screen">
      <div className="lb-angles" aria-hidden="true" />

      <header className="leaderboard-header">
        <div className="lb-logo">
          <span className="lb-logo-main">PIP</span>
          <span className="lb-logo-sub">Global Safety</span>
        </div>
        <div className="lb-heading">
          <h1>
            <span className="lb-chevrons">›››</span> Admin
          </h1>
          <p className="lb-sub">
            Spot The Hazards <span className="lb-sep">|</span>
            {mode === 'dashboard' ? 'Dashboard' : 'Sign in'}
          </p>
        </div>
      </header>

      {mode === 'loading' && <p className="lb-empty">Loading...</p>}
      {mode === 'login' && (
        <AdminLoginForm
          notice={notice}
          onSuccess={() => {
            setNotice('')
            setMode('dashboard')
          }}
          onCancel={onExit}
        />
      )}
      {mode === 'dashboard' && <Dashboard onExit={exit} onSessionExpired={sessionExpired} />}
    </div>
  )
}

function AdminLoginForm({ notice, onSuccess, onCancel }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!username.trim() || !password) return setError('Enter admin ID and password')
    setBusy(true)
    setError('')
    try {
      await admin().login(username, password)
      onSuccess()
    } catch (err) {
      setError(cleanError(err))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-card" onSubmit={handleSubmit} noValidate>
      <h2 className="admin-card-title">Admin sign in</h2>
      <p className="admin-card-sub">
        Staff only. Sign in to see all players and download the data.
      </p>
      {notice && <p className="admin-notice">{notice}</p>}

      <label className="admin-field">
        <span>Admin ID</span>
        <input
          type="email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          maxLength={100}
          placeholder="admin@gmail.com"
        />
      </label>
      <label className="admin-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          maxLength={100}
        />
      </label>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-card-actions">
        <button type="submit" className="lb-button" disabled={busy}>
          {busy ? 'Please wait...' : 'Sign In'}
        </button>
        <button type="button" className="lb-button lb-button-dark" onClick={onCancel}>
          Back
        </button>
      </div>
    </form>
  )
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—')
const show = (v) => v ?? '—'

function Dashboard({ onExit, onSessionExpired }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [playersFilter, setPlayersFilter] = useState('all_time') // 'all_time' | a game date
  const [sceneFilter, setSceneFilter] = useState('all') // 'all' | a scene id
  const [eventFilter, setEventFilter] = useState('all') // 'all' | an event name
  const [newEventName, setNewEventName] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [filteredPlayers, setFilteredPlayers] = useState(null)
  const [filteredStats, setFilteredStats] = useState(null)
  const [playersLoading, setPlayersLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // the player row pending a single delete
  const [deletingPlayer, setDeletingPlayer] = useState(false)
  const [deletePlayerError, setDeletePlayerError] = useState('')
  const [durationDraft, setDurationDraft] = useState('') // editable text for the round-timer input
  const [toast, setToast] = useState(null) // { key, text, tone } — a brief save-confirmation popup
  const toastKey = useRef(0)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFrom, setCsvFrom] = useState('')
  const [csvTo, setCsvTo] = useState('')

  const guard = useCallback(
    async (fn) => {
      try {
        return await fn()
      } catch (err) {
        if (isAuthError(err)) onSessionExpired()
        else throw err
      }
    },
    [onSessionExpired]
  )

  const load = useCallback(async () => {
    try {
      const d = await guard(() => admin().getDashboard())
      if (d) {
        setData(d)
        setError('')
      }
    } catch (err) {
      setError(cleanError(err))
    }
  }, [guard])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const loadFilteredPlayers = useCallback(
    async ({ signal } = {}) => {
      if (playersFilter === 'all_time' && sceneFilter === 'all' && eventFilter === 'all') {
        setFilteredPlayers(null)
        setFilteredStats(null)
        return
      }
      setPlayersLoading(true)
      try {
        const res = await guard(() =>
          admin().getPlayers(
            playersFilter === 'all_time' ? undefined : playersFilter,
            sceneFilter === 'all' ? undefined : sceneFilter,
            eventFilter === 'all' ? undefined : eventFilter
          )
        )
        if (!signal?.aborted && res) {
          setFilteredPlayers(res.players)
          setFilteredStats(res.stats)
        }
      } catch (err) {
        if (!signal?.aborted) setError(cleanError(err))
      } finally {
        if (!signal?.aborted) setPlayersLoading(false)
      }
    },
    [playersFilter, sceneFilter, eventFilter, guard]
  )

  useEffect(() => {
    const controller = { aborted: false }
    loadFilteredPlayers({ signal: controller })
    return () => {
      controller.aborted = true
    }
  }, [loadFilteredPlayers])

  // sign out and leave after IDLE_EXIT_MS without any mouse/keyboard/touch activity
  useEffect(() => {
    let t
    const reset = () => {
      clearTimeout(t)
      t = setTimeout(onExit, IDLE_EXIT_MS)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']
    events.forEach((ev) => window.addEventListener(ev, reset))
    reset()
    return () => {
      clearTimeout(t)
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [onExit])

  const handleDownload = async (from, to) => {
    setDownloading(true)
    try {
      const res = await guard(() => admin().downloadCsv(from, to))
      if (res?.saved) {
        setShowCsvModal(false)
        setToast({
          key: ++toastKey.current,
          text: `Saved ${res.rowCount} row${res.rowCount === 1 ? '' : 's'} to ${res.filePath}`,
          tone: 'good'
        })
      }
    } catch (err) {
      setToast({
        key: ++toastKey.current,
        text: `Download failed: ${cleanError(err)}`,
        tone: 'bad'
      })
    } finally {
      setDownloading(false)
    }
  }

  const gameDates = data?.gameDates || [] // newest first
  const earliestGameDate = gameDates[gameDates.length - 1]
  const latestGameDate = gameDates[0]

  const openCsvModal = () => {
    // no games yet: nothing to range-filter, so download everyone who's signed up right away
    if (!gameDates.length) return handleDownload()
    setCsvFrom(earliestGameDate)
    setCsvTo(latestGameDate)
    setShowCsvModal(true)
  }

  const [savingSettings, setSavingSettings] = useState(false)

  const updateLeaderboardSettings = async (patch) => {
    setSavingSettings(true)
    setMessage('')
    try {
      const res = await guard(() => admin().updateLeaderboardSettings(patch))
      if (res) {
        setData((d) =>
          d ? { ...d, leaderboardSettings: res.settings, leaderboardPreview: res.preview } : d
        )
      }
    } catch (err) {
      setMessage(`Could not update leaderboard settings: ${cleanError(err)}`)
    } finally {
      setSavingSettings(false)
    }
  }

  const updateGameSettings = async (patch) => {
    setSavingSettings(true)
    setMessage('')
    try {
      const res = await guard(() => admin().updateGameSettings(patch))
      if (res) {
        setData((d) => (d ? { ...d, gameSettings: res.settings } : d))
        return res.settings
      }
    } catch (err) {
      setMessage(`Could not update the active game: ${cleanError(err)}`)
    } finally {
      setSavingSettings(false)
    }
    return null
  }

  const events = data?.events || [] // newest first
  const EVENT_OPTIONS = [
    { value: 'none', label: 'None (no event shown)' },
    ...events.map((e) => ({ value: e, label: e }))
  ]
  const EVENT_FILTER_OPTIONS = [
    { value: 'all', label: 'All Events' },
    ...events.map((e) => ({ value: e, label: e }))
  ]

  // Creating an event also makes it the active one right away — see db.createEvent.
  const handleCreateEvent = async () => {
    const name = newEventName.trim()
    if (!name) return
    setCreatingEvent(true)
    try {
      const res = await guard(() => admin().createEvent(name))
      if (res) {
        setData((d) => (d ? { ...d, gameSettings: res.settings, events: res.events } : d))
        setNewEventName('')
        setToast({ key: ++toastKey.current, text: `Event "${name}" is now active`, tone: 'good' })
      }
    } catch (err) {
      setToast({
        key: ++toastKey.current,
        text: `Could not add event: ${cleanError(err)}`,
        tone: 'bad'
      })
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await guard(() => admin().deleteAllData())
      if (res) {
        setShowDeleteConfirm(false)
        setMessage(`Deleted ${res.deletedPlayers} players and all their games.`)
        load()
      }
    } catch (err) {
      setDeleteError(cleanError(err))
    } finally {
      setDeleting(false)
    }
  }

  // Removes one player (and their games), freeing their phone/email so they can sign up and
  // play again — e.g. someone registered but never actually played, or a duplicate/test entry.
  const handleDeletePlayer = async () => {
    if (!deleteTarget) return
    setDeletingPlayer(true)
    setDeletePlayerError('')
    try {
      const res = await guard(() => admin().deletePlayer(deleteTarget.phone))
      if (res) {
        setDeleteTarget(null)
        setMessage(`Deleted ${deleteTarget.name || deleteTarget.phone}.`)
        load()
        loadFilteredPlayers()
      }
    } catch (err) {
      setDeletePlayerError(cleanError(err))
    } finally {
      setDeletingPlayer(false)
    }
  }

  const TOP_HIGHLIGHT_COUNT = 5

  const isUnfiltered =
    playersFilter === 'all_time' && sceneFilter === 'all' && eventFilter === 'all'

  const players = useMemo(() => {
    const source = isUnfiltered ? data?.players : filteredPlayers
    const all = (source || []).map((p, i) => ({
      ...p,
      rank: i + 1,
      isTop: i < TOP_HIGHLIGHT_COUNT
    }))
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((p) =>
      [p.name, p.company, p.designation, p.email, p.phone].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      )
    )
  }, [data, filteredPlayers, isUnfiltered, query])

  const stats = isUnfiltered ? data?.stats : filteredStats
  const lbSettings = data?.leaderboardSettings
  const gameSettings = data?.gameSettings
  const randomScenes = gameSettings?.randomScenes?.length
    ? gameSettings.randomScenes
    : GAME_SCENE_OPTIONS.map((option) => option.value)

  // resync the editable draft whenever the confirmed value changes (first load, or after a save)
  useEffect(() => {
    if (gameSettings) setDurationDraft(String(gameSettings.durationSeconds))
  }, [gameSettings?.durationSeconds])

  const DURATION_MIN = 30
  const DURATION_MAX = 600
  const durationDraftNum = Number.parseInt(durationDraft, 10)
  const durationDraftValid =
    Number.isInteger(durationDraftNum) &&
    durationDraftNum >= DURATION_MIN &&
    durationDraftNum <= DURATION_MAX
  const durationDirty =
    gameSettings && durationDraftValid && durationDraftNum !== gameSettings.durationSeconds
  const fmtMinSec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleSaveDuration = async () => {
    if (!durationDraftValid) return
    const settings = await updateGameSettings({ durationSeconds: durationDraftNum })
    setToast({
      key: ++toastKey.current,
      text: settings
        ? `Round timer saved — ${fmtMinSec(settings.durationSeconds)} min`
        : 'Could not save the round timer. Please try again.',
      tone: settings ? 'good' : 'bad'
    })
  }

  const leaderboardPreview = data?.leaderboardPreview || []
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
  const fmtDay = (d) => {
    const label = new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    return d === todayStr ? `${label} (Today)` : label
  }
  const dropdownValue = lbSettings?.mode === 'day' ? lbSettings.date : 'all_time'
  const isDayFilter = playersFilter !== 'all_time'
  const dayTag = isDayFilter ? ` (${fmtDay(playersFilter)})` : ''
  const tiles = stats
    ? [
        { label: 'Players Signed Up', value: stats.players },
        { label: `Players Who Played${dayTag}`, value: stats.playersWhoPlayed },
        { label: `Games Played${dayTag}`, value: stats.games },
        { label: 'Games Today', value: stats.gamesToday },
        { label: `Top Score${dayTag}`, value: stats.topScore, accent: true },
        { label: `Average Score${dayTag}`, value: stats.averageScore }
      ]
    : []

  return (
    <div className="admin-dashboard">
      <div className="admin-toolbar">
        <button className="lb-button" onClick={openCsvModal} disabled={downloading}>
          {downloading ? 'Preparing...' : 'Download CSV'}
        </button>
        <button className="lb-button lb-button-dark" onClick={load}>
          Refresh
        </button>
        <button className="lb-button lb-button-dark" onClick={() => setShowPassword((v) => !v)}>
          Change Admin Login
        </button>
        <button
          className="lb-button lb-button-danger"
          onClick={() => {
            setDeleteError('')
            setShowDeleteConfirm(true)
          }}
          disabled={!players.length}
        >
          Delete All Data
        </button>
        <span className="admin-toolbar-spacer" />
        <button className="lb-button lb-button-dark" onClick={onExit}>
          Log Out
        </button>
      </div>
      {message && <p className="admin-message">{message}</p>}
      {error && <p className="admin-error">{error}</p>}

      {toast && (
        <div key={toast.key} className={`admin-toast admin-toast-${toast.tone}`}>
          <span className="admin-toast-icon" aria-hidden="true">
            {toast.tone === 'good' ? '✓' : '✕'}
          </span>
          {toast.text}
        </div>
      )}

      {showCsvModal && (
        <div className="admin-modal-overlay" onClick={() => !downloading && setShowCsvModal(false)}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Download CSV</h3>
            <p>
              Pick the date range to export — only days with real game data can be selected (
              {fmtDay(earliestGameDate)} to {fmtDay(latestGameDate)}).
            </p>
            <div className="admin-csv-range">
              <label className="admin-csv-range-field">
                <span className="admin-field-label">From</span>
                <input
                  type="date"
                  className="admin-duration-input"
                  value={csvFrom}
                  min={earliestGameDate}
                  max={csvTo || latestGameDate}
                  disabled={downloading}
                  onChange={(e) => setCsvFrom(e.target.value)}
                />
              </label>
              <label className="admin-csv-range-field">
                <span className="admin-field-label">To</span>
                <input
                  type="date"
                  className="admin-duration-input"
                  value={csvTo}
                  min={csvFrom || earliestGameDate}
                  max={latestGameDate}
                  disabled={downloading}
                  onChange={(e) => setCsvTo(e.target.value)}
                />
              </label>
            </div>
            <div className="admin-card-actions">
              <button
                className="lb-button"
                onClick={() => {
                  setCsvFrom(earliestGameDate)
                  setCsvTo(latestGameDate)
                }}
                disabled={downloading || (csvFrom === earliestGameDate && csvTo === latestGameDate)}
              >
                Full Range
              </button>
              <button
                className="lb-button lb-button-dark"
                onClick={() => handleDownload(csvFrom, csvTo)}
                disabled={downloading || !csvFrom || !csvTo || csvFrom > csvTo}
              >
                {downloading ? 'Preparing...' : 'Download'}
              </button>
              <button
                className="lb-button lb-button-dark"
                onClick={() => setShowCsvModal(false)}
                disabled={downloading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="admin-modal-overlay"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete all data?</h3>
            <p>
              This will permanently delete all {players.length} player
              {players.length === 1 ? '' : 's'} and every game they played. This cannot be undone.
            </p>
            {deleteError && <p className="admin-error">{deleteError}</p>}
            <div className="admin-card-actions">
              <button
                className="lb-button lb-button-danger"
                onClick={handleDeleteAll}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button
                className="lb-button lb-button-dark"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="admin-modal-overlay"
          onClick={() => !deletingPlayer && setDeleteTarget(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this player?</h3>
            <p>
              This will permanently delete{' '}
              <strong>{deleteTarget.name || deleteTarget.phone}</strong> ({deleteTarget.phone}) and
              every game they played. They&apos;ll be able to sign up and play again afterwards.
            </p>
            {deletePlayerError && <p className="admin-error">{deletePlayerError}</p>}
            <div className="admin-card-actions">
              <button
                className="lb-button lb-button-danger"
                onClick={handleDeletePlayer}
                disabled={deletingPlayer}
              >
                {deletingPlayer ? 'Deleting...' : 'Yes, Delete Player'}
              </button>
              <button
                className="lb-button lb-button-dark"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingPlayer}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassword && (
        <ChangePasswordForm
          guard={guard}
          onDone={(msg) => {
            setShowPassword(false)
            setMessage(msg)
          }}
        />
      )}

      <div className="admin-stats">
        {tiles.map((t) => (
          <div key={t.label} className={`admin-stat ${t.accent ? 'admin-stat-accent' : ''}`}>
            <span className="admin-stat-value">{t.value}</span>
            <span className="admin-stat-label">{t.label}</span>
          </div>
        ))}
      </div>

      {gameSettings && (
        <div className="admin-leaderboard-control">
          <div className="admin-leaderboard-control-row">
            <span className="admin-field-label">Random Game</span>
            <button
              type="button"
              className={`admin-toggle ${gameSettings.randomScene ? 'admin-toggle-on' : ''}`}
              disabled={savingSettings}
              aria-pressed={gameSettings.randomScene}
              onClick={() => updateGameSettings({ randomScene: !gameSettings.randomScene })}
            >
              <span className="admin-toggle-knob" />
            </button>
            <span className="admin-toggle-state">
              {gameSettings.randomScene ? 'On — every new player gets a random game' : 'Off'}
            </span>
          </div>

          {gameSettings.randomScene && (
            <div className="admin-random-scenes">
              <span className="admin-field-label">Random Scenarios</span>
              <div className="admin-random-scene-options">
                {GAME_SCENE_OPTIONS.map((option) => {
                  const checked = randomScenes.includes(option.value)
                  return (
                    <label key={option.value} className="admin-random-scene-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={savingSettings || (checked && randomScenes.length === 1)}
                        onChange={() => {
                          const nextScenes = checked
                            ? randomScenes.filter((id) => id !== option.value)
                            : [...randomScenes, option.value]
                          updateGameSettings({ randomScenes: nextScenes })
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
              <span className="admin-random-scenes-hint">
                New players get a random scenario from the selected list.
              </span>
            </div>
          )}

          <div className="admin-leaderboard-control-row">
            <span className="admin-field-label">Active Game</span>
            <Select
              className="admin-select"
              // random mode picks the scene per player, so the manual choice is locked meanwhile
              disabled={savingSettings || gameSettings.randomScene}
              value={gameSettings.scene}
              options={GAME_SCENE_OPTIONS}
              onChange={(scene) => updateGameSettings({ scene })}
            />
          </div>

          <div className="admin-leaderboard-control-row">
            <span className="admin-field-label">Round Timer</span>
            <div className="admin-duration-field">
              <input
                type="number"
                className="admin-duration-input"
                min={DURATION_MIN}
                max={DURATION_MAX}
                step={5}
                disabled={savingSettings}
                value={durationDraft}
                onChange={(e) => setDurationDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDuration()
                }}
              />
              <span className="admin-duration-unit">seconds</span>
              <span className="admin-duration-hint">
                {durationDraftValid
                  ? `= ${fmtMinSec(durationDraftNum)} min`
                  : `${DURATION_MIN}–${DURATION_MAX} seconds`}
              </span>
              <button
                type="button"
                className="lb-button lb-button-dark admin-duration-save"
                disabled={savingSettings || !durationDirty}
                onClick={handleSaveDuration}
              >
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="admin-leaderboard-control-row">
            <span className="admin-field-label">Event Showing</span>
            <Select
              className="admin-select"
              disabled={savingSettings}
              value={gameSettings.activeEvent || 'none'}
              options={EVENT_OPTIONS}
              onChange={(value) => updateGameSettings({ event: value === 'none' ? '' : value })}
            />
          </div>

          <div className="admin-leaderboard-control-row">
            <span className="admin-field-label">New Event</span>
            <div className="admin-duration-field">
              <input
                type="text"
                className="admin-duration-input admin-event-name-input"
                placeholder="e.g. Delhi Safety Week 2026"
                maxLength={80}
                disabled={creatingEvent}
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateEvent()
                }}
              />
              <button
                type="button"
                className="lb-button lb-button-dark"
                disabled={creatingEvent || !newEventName.trim()}
                onClick={handleCreateEvent}
              >
                {creatingEvent ? 'Adding...' : 'Add & Show'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lbSettings && (
        <div className="admin-leaderboard-control">
          <div className="admin-leaderboard-control-top">
            <div className="admin-leaderboard-control-row">
              <span className="admin-field-label">Public Leaderboard</span>
              <button
                type="button"
                className={`admin-toggle ${lbSettings.visible ? 'admin-toggle-on' : ''}`}
                disabled={savingSettings}
                aria-pressed={lbSettings.visible}
                onClick={() => updateLeaderboardSettings({ visible: !lbSettings.visible })}
              >
                <span className="admin-toggle-knob" />
              </button>
              <span className="admin-toggle-state">{lbSettings.visible ? 'Shown' : 'Hidden'}</span>
            </div>

            <div className="admin-leaderboard-control-row">
              <span className="admin-field-label">Second Display Window</span>
              <button
                type="button"
                className={`admin-toggle ${lbSettings.windowEnabled ? 'admin-toggle-on' : ''}`}
                disabled={savingSettings}
                aria-pressed={lbSettings.windowEnabled}
                onClick={() =>
                  updateLeaderboardSettings({ windowEnabled: !lbSettings.windowEnabled })
                }
              >
                <span className="admin-toggle-knob" />
              </button>
              <span className="admin-toggle-state">{lbSettings.windowEnabled ? 'On' : 'Off'}</span>
            </div>

            <div className="admin-leaderboard-control-row">
              <span className="admin-field-label">Ranking</span>
              <DateFilterSelect
                className="admin-select"
                disabled={savingSettings}
                value={dropdownValue}
                formatDate={fmtDay}
                maxDate={todayStr}
                onChange={(v) => {
                  if (v === 'all_time') updateLeaderboardSettings({ mode: 'all_time' })
                  else updateLeaderboardSettings({ mode: 'day', date: v })
                }}
              />
            </div>
          </div>

          <div className="admin-leaderboard-preview">
            <span className="admin-field-label">
              Public leaderboard preview — top 5
              {lbSettings.mode === 'day' ? ` — ${fmtDay(lbSettings.date)}` : ' — All-Time'}
            </span>
            {!lbSettings.visible && (
              <p className="admin-leaderboard-preview-empty">
                The leaderboard is hidden — visitors won&apos;t see it at all.
              </p>
            )}
            {lbSettings.visible && !leaderboardPreview.length && (
              <p className="admin-leaderboard-preview-empty">
                No games {lbSettings.mode === 'day' ? 'on this day' : 'yet'} — nothing to show.
              </p>
            )}
            {lbSettings.visible && leaderboardPreview.length > 0 && (
              <ol className="admin-leaderboard-preview-list">
                {leaderboardPreview.map((p) => (
                  <li key={p.phone}>
                    <span className="admin-leaderboard-preview-name">{p.name}</span>
                    <span className="admin-leaderboard-preview-score">{p.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <div className="admin-table-head">
        <h2>
          All Players <span className="admin-count">{players.length}</span>
        </h2>
        <div className="admin-table-head-controls">
          <Select
            className="admin-select"
            value={eventFilter}
            disabled={playersLoading}
            options={EVENT_FILTER_OPTIONS}
            onChange={setEventFilter}
          />
          <Select
            className="admin-select"
            value={sceneFilter}
            disabled={playersLoading}
            options={SCENE_OPTIONS}
            onChange={setSceneFilter}
          />
          <DateFilterSelect
            className="admin-select"
            value={playersFilter}
            disabled={playersLoading}
            formatDate={fmtDay}
            maxDate={todayStr}
            onChange={setPlayersFilter}
          />
          <input
            className="admin-search"
            placeholder="Search name, company, email or mobile"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Company</th>
              <th>Job Title</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Event</th>
              <th>Scenario</th>
              <th className="num">Correct</th>
              <th className="num">Wrong</th>
              <th className="num">Secs Left</th>
              <th className="num">Bonus</th>
              <th className="num">Score</th>
              <th>Played At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.phone} className={p.isTop ? 'admin-table-row-top' : ''}>
                <td className="admin-rank">{String(p.rank).padStart(2, '0')}</td>
                <td className="admin-name">{p.name}</td>
                <td>{p.company}</td>
                <td>{p.designation}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>{p.event || '—'}</td>
                <td>{SCENES[p.scene]?.label || '—'}</td>
                <td className="num">{show(p.hazardsFound)}</td>
                <td className="num">{show(p.wrongPicks)}</td>
                <td className="num">{show(p.secondsLeft)}</td>
                <td className="num">{show(p.speedBonus)}</td>
                <td className="num admin-score">{p.score}</td>
                <td>{fmtDate(p.playedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="admin-row-delete"
                    onClick={() => {
                      setDeletePlayerError('')
                      setDeleteTarget(p)
                    }}
                    title="Delete this player"
                    aria-label={`Delete ${p.name || p.phone}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !players.length && (
          <p className="lb-empty">{query ? 'No players match your search.' : 'No games yet.'}</p>
        )}
      </div>
    </div>
  )
}

function ChangePasswordForm({ guard, onDone }) {
  const [current, setCurrent] = useState('')
  const [username, setUsername] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return setError('Enter a new admin ID')
    if (next !== confirm) return setError('New passwords do not match')
    try {
      const res = await guard(() => admin().changeCredentials(current, username, next))
      if (res?.ok) onDone('Admin login updated.')
    } catch (err) {
      setError(cleanError(err))
    }
  }

  return (
    <form className="admin-card admin-card-inline" onSubmit={handleSubmit} noValidate>
      <label className="admin-field">
        <span>Current password</span>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="admin-field">
        <span>New admin ID</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          maxLength={100}
        />
      </label>
      <label className="admin-field">
        <span>New password (minimum 8 characters)</span>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="admin-field">
        <span>Confirm new password</span>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-card-actions">
        <button type="submit" className="lb-button">
          Save Admin Login
        </button>
      </div>
    </form>
  )
}
