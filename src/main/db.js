import { app } from 'electron'
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync
} from 'fs'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { join } from 'path'
// better-sqlite3 is loaded inside openDb() so a missing/incompatible native module shows a
// clear error dialog instead of crashing the app before it starts.
let Database

const DB_FILE = 'pip-game.db'
const BACKUPS_KEPT = 14
const SCHEMA_VERSION = 5

// Where the database lives:
// - development (npm run dev / npm start): <project>/data/pip-game.db
// - installed app: the OS's per-user app-data folder, which is always writable and survives
//   app updates. The install folder itself is read-only on macOS and usually on Windows.
//     Windows: C:\Users\<name>\AppData\Roaming\electron-app\data\pip-game.db
//     macOS:   ~/Library/Application Support/electron-app/data/pip-game.db
//     Linux:   ~/.config/electron-app/data/pip-game.db
// - PIP_DATA_DIR=<folder> overrides both, e.g. to keep the data on a USB drive.
let db
let dataDir
const startupNotes = [] // things worth telling the operator about, e.g. a recovered database

function candidateDirs() {
  const dirs = []
  if (process.env.PIP_DATA_DIR) dirs.push(process.env.PIP_DATA_DIR)
  if (!app.isPackaged) dirs.push(join(app.getAppPath(), 'data'))
  dirs.push(join(app.getPath('userData'), 'data'))
  return dirs
}

function pickWritableDir() {
  for (const dir of candidateDirs()) {
    try {
      mkdirSync(dir, { recursive: true })
      accessSync(dir, constants.W_OK)
      return dir
    } catch (err) {
      console.warn(`Data folder not usable, trying the next one: ${dir}`, err.message)
    }
  }
  throw new Error('No writable folder found for the database')
}

export function dbPath() {
  return join(dataDir, DB_FILE)
}

export function getStartupNotes() {
  return startupNotes
}

const sidecars = (file) => [file, `${file}-wal`, `${file}-shm`]
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')

function connect(file) {
  const conn = new Database(file, { timeout: 5000 }) // wait up to 5s if the file is busy
  try {
    conn.pragma('journal_mode = WAL')
  } catch {
    // some network/USB filesystems can't do WAL; the default journal still works
  }
  conn.pragma('synchronous = NORMAL')
  conn.pragma('foreign_keys = ON')
  const check = conn.pragma('quick_check', { simple: true })
  if (check !== 'ok') {
    conn.close()
    const err = new Error(`Database integrity check failed: ${check}`)
    err.code = 'SQLITE_CORRUPT'
    throw err
  }
  return conn
}

const isCorruption = (err) => ['SQLITE_CORRUPT', 'SQLITE_NOTADB'].includes(err?.code)

// Move a damaged database aside (never delete it) and put back the newest backup, if any.
function recoverFromCorruption(err) {
  const file = dbPath()
  const aside = join(dataDir, `pip-game.corrupt-${stamp()}.db`)
  for (const [from, to] of sidecars(file).map((f, i) => [f, sidecars(aside)[i]])) {
    if (existsSync(from)) renameSync(from, to)
  }
  const latest = listBackups()[0]
  if (latest) copyFileSync(join(backupDir(), latest), file)
  startupNotes.push(
    `The database was damaged (${err.message}). It was moved to ${aside} and ` +
      (latest ? `the backup ${latest} was restored.` : 'a new empty database was started.')
  )
  console.error(startupNotes.at(-1))
}

// The dev database used to live straight in the app-data folder; copy it to the new place once.
function migrateOldLocation() {
  const old = join(app.getPath('userData'), DB_FILE)
  if (old === dbPath() || !existsSync(old) || existsSync(dbPath())) return
  const src = new Database(old, { readonly: true, fileMustExist: true })
  try {
    src.prepare('VACUUM INTO ?').run(dbPath()) // consistent copy, includes unflushed WAL data
  } finally {
    src.close()
  }
  console.log(`Copied existing database from ${old} to ${dbPath()} (the old file is kept)`)
}

const backupDir = () => join(dataDir, 'backups')

function listBackups() {
  try {
    return readdirSync(backupDir())
      .filter((f) => /^pip-game-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

// One backup file per day, newest BACKUPS_KEPT kept. Made when the app starts and refreshed
// when it closes, so a damaged database loses at most one session. Never blocks the game.
function writeBackup({ refresh }) {
  try {
    mkdirSync(backupDir(), { recursive: true })
    const file = join(backupDir(), `pip-game-${new Date().toISOString().slice(0, 10)}.db`)
    if (existsSync(file) && !refresh) return
    const tmp = `${file}.tmp`
    if (existsSync(tmp)) unlinkSync(tmp)
    db.prepare('VACUUM INTO ?').run(tmp) // VACUUM INTO won't overwrite, so swap in afterwards
    renameSync(tmp, file)
    for (const old of listBackups().slice(BACKUPS_KEPT)) unlinkSync(join(backupDir(), old))
  } catch (err) {
    console.warn('Backup failed (the game keeps working):', err.message)
  }
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL UNIQUE,
      email       TEXT NOT NULL,
      company     TEXT NOT NULL,
      designation TEXT NOT NULL,
      consent     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_players_email ON players (email);

    CREATE TABLE IF NOT EXISTS games (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id      INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
      correct        INTEGER NOT NULL DEFAULT 0,
      total_hazards  INTEGER,
      wrong          INTEGER,
      seconds_left   INTEGER,
      speed_bonus    INTEGER,
      score          INTEGER NOT NULL,
      time_taken_sec INTEGER,
      reason         TEXT,
      played_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_games_player ON games (player_id);

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt          TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
  // bump SCHEMA_VERSION and add an upgrade step here when the tables change
  const currentVersion = db.pragma('user_version', { simple: true })
  if (currentVersion < SCHEMA_VERSION) {
    if (currentVersion < 3) migrateToV3()
    if (currentVersion < 4) migrateToV4()
    if (currentVersion < 5) migrateToV5()
    db.pragma(`user_version = ${SCHEMA_VERSION}`)
  }
}

// v3 split the signup form's single "name" field into first/last name and added the state,
// industry and marketing-consent fields the printed form asks for. Existing rows keep working:
// `name` stays populated (built from first/last name) since the leaderboard, admin table and
// CSV already read it.
function migrateToV3() {
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(players)')
      .all()
      .map((c) => c.name)
  )
  const addColumn = (name, ddl) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE players ADD COLUMN ${ddl}`)
  }
  addColumn('first_name', "first_name TEXT NOT NULL DEFAULT ''")
  addColumn('last_name', "last_name TEXT NOT NULL DEFAULT ''")
  addColumn('state', "state TEXT NOT NULL DEFAULT ''")
  addColumn('industry', "industry TEXT NOT NULL DEFAULT ''")
  addColumn('marketing_consent', 'marketing_consent INTEGER NOT NULL DEFAULT 0')
  if (!columns.has('first_name')) {
    // backfill from the existing full name: first word is the first name, the rest the last
    for (const row of db.prepare('SELECT id, name FROM players').all()) {
      const [firstName, ...rest] = String(row.name || '')
        .trim()
        .split(/\s+/)
      db.prepare('UPDATE players SET first_name = ?, last_name = ? WHERE id = ?').run(
        firstName || '',
        rest.join(' '),
        row.id
      )
    }
  }
}

// v4 records which scene (warehouse/pharma/chemical/automotive/cement) each game was played on, so the
// admin "All Players" table can show it. Games played before this migration have no way to know
// their scene, so they're left blank ('').
function migrateToV4() {
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(games)')
      .all()
      .map((c) => c.name)
  )
  if (!columns.has('scene')) db.exec("ALTER TABLE games ADD COLUMN scene TEXT NOT NULL DEFAULT ''")
}

// v5 adds admin-managed "events" (e.g. a specific campaign/booth day) — the `events` table is
// created unconditionally above (CREATE TABLE IF NOT EXISTS), so this migration only needs to
// add the column that records which event was active when each player signed up.
function migrateToV5() {
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(players)')
      .all()
      .map((c) => c.name)
  )
  if (!columns.has('event'))
    db.exec("ALTER TABLE players ADD COLUMN event TEXT NOT NULL DEFAULT ''")
}

export async function openDb() {
  Database = (await import('better-sqlite3')).default
  dataDir = pickWritableDir()
  try {
    migrateOldLocation()
  } catch (err) {
    console.warn('Could not copy the old database; starting from the new location:', err.message)
  }
  try {
    db = connect(dbPath())
  } catch (err) {
    if (!isCorruption(err)) throw err
    recoverFromCorruption(err)
    db = connect(dbPath())
  }
  createSchema()
  ensureDefaultAdmin()
  writeBackup({ refresh: false })
  return db
}

export function closeDb() {
  if (!db) return
  writeBackup({ refresh: true })
  try {
    db.close() // flushes the WAL back into the main file
  } catch (err) {
    console.warn('Closing the database failed:', err.message)
  }
  db = undefined
}

const normalizePhone = (p) => String(p || '').replace(/\D/g, '')
const normalizeEmail = (e) =>
  String(e || '')
    .trim()
    .toLowerCase()

const toPlayer = (row) =>
  row && {
    id: row.id,
    name: row.name,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    designation: row.designation,
    state: row.state,
    industry: row.industry,
    consent: Boolean(row.consent),
    marketingConsent: Boolean(row.marketing_consent),
    event: row.event,
    createdAt: row.created_at
  }

function findPlayer(phone) {
  return db.prepare('SELECT * FROM players WHERE phone = ?').get(normalizePhone(phone))
}

// A player "exists" once they have finished a game. Someone who signed up but cancelled
// (or the app closed mid-game) never used their attempt, so they may sign up again.
export function phoneAlreadyPlayed(phone) {
  return Boolean(
    db
      .prepare(
        'SELECT 1 FROM players p JOIN games g ON g.player_id = p.id WHERE p.phone = ? LIMIT 1'
      )
      .get(normalizePhone(phone))
  )
}

export function emailAlreadyPlayed(email) {
  return Boolean(
    db
      .prepare(
        'SELECT 1 FROM players p JOIN games g ON g.player_id = p.id WHERE p.email = ? LIMIT 1'
      )
      .get(normalizeEmail(email))
  )
}

export function signUp({
  firstName,
  lastName,
  phone,
  email,
  company,
  designation,
  state,
  industry,
  consent,
  marketingConsent
}) {
  const first = String(firstName || '').trim()
  const last = String(lastName || '').trim()
  // whichever event the admin has running right now gets stamped onto the signup permanently —
  // renaming/deleting that event later doesn't change what past players show
  const { activeEvent } = getGameSettings()
  db.prepare(
    `INSERT INTO players
       (name, first_name, last_name, phone, email, company, designation, state, industry,
        consent, marketing_consent, event)
     VALUES
       (@name, @firstName, @lastName, @phone, @email, @company, @designation, @state, @industry,
        @consent, @marketingConsent, @event)
     ON CONFLICT (phone) DO UPDATE SET
       name = excluded.name, first_name = excluded.first_name, last_name = excluded.last_name,
       email = excluded.email, company = excluded.company, designation = excluded.designation,
       state = excluded.state, industry = excluded.industry, consent = excluded.consent,
       marketing_consent = excluded.marketing_consent, event = excluded.event`
  ).run({
    name: `${first} ${last}`.trim(),
    firstName: first,
    lastName: last,
    phone: normalizePhone(phone),
    email: normalizeEmail(email),
    company: String(company || '').trim(),
    designation: String(designation || '').trim(),
    state: String(state || '').trim(),
    industry: String(industry || '').trim(),
    consent: consent ? 1 : 0,
    marketingConsent: marketingConsent ? 1 : 0,
    event: activeEvent
  })
  return toPlayer(findPlayer(phone))
}

const insertGame = () =>
  db.prepare(
    `INSERT INTO games (player_id, correct, total_hazards, wrong, seconds_left, speed_bonus,
                        score, time_taken_sec, reason, scene, played_at)
     VALUES (@playerId, @correct, @totalHazards, @wrong, @secondsLeft, @speedBonus,
             @score, @timeTakenSec, @reason, @scene, @playedAt)`
  )

const gameParams = (playerId, r) => ({
  playerId,
  correct: r.hazardsFound ?? 0,
  totalHazards: r.totalHazards ?? null,
  wrong: r.wrongPicks ?? null,
  secondsLeft: r.secondsLeft ?? null,
  speedBonus: r.speedBonus ?? null,
  score: r.score ?? 0,
  timeTakenSec: r.timeTakenSec ?? null,
  reason: r.reason ?? null,
  scene: r.scene || '',
  playedAt: r.playedAt || new Date().toISOString()
})

export function addGame(phone, record) {
  const player = findPlayer(phone)
  if (!player) return null
  insertGame().run(gameParams(player.id, record))
  return toPlayer(player)
}

// One row per player: their best game. Higher score wins; on equal score the faster
// attempt wins; then whoever got there first. With `date` (a 'YYYY-MM-DD' string), only
// that day's games are considered, so the ranking becomes "that day's best" instead of
// "all-time best". With `scene` (a scene id, e.g. 'warehouse'), only that scene's games are
// considered, so a player who never played that scene drops out of the list entirely (their
// best game elsewhere doesn't count as a stand-in).
// `event` filters on the player's signup-time event (see players.event), same idea as `scene`
// but a player-level attribute rather than a per-game one.
export function getRankedPlayers(limit = -1, { date, scene, event } = {}) {
  const gameConditions = []
  const gameParams = []
  if (date) {
    gameConditions.push("date(g.played_at, 'localtime') = date(?)")
    gameParams.push(date)
  }
  if (scene) {
    gameConditions.push('g.scene = ?')
    gameParams.push(scene)
  }
  const gameFilter = gameConditions.length ? `WHERE ${gameConditions.join(' AND ')}` : ''

  const outerConditions = ['b.rn = 1']
  const outerParams = []
  if (event) {
    outerConditions.push('p.event = ?')
    outerParams.push(event)
  }

  return db
    .prepare(
      `WITH best AS (
         SELECT g.*, ROW_NUMBER() OVER (
           PARTITION BY g.player_id
           ORDER BY g.score DESC, g.time_taken_sec IS NULL, g.time_taken_sec ASC, g.played_at ASC
         ) AS rn,
         COUNT(*) OVER (PARTITION BY g.player_id) AS attempts
         FROM games g
         ${gameFilter}
       )
       SELECT p.phone, p.name, p.email, p.company, p.designation, p.event, b.score, b.time_taken_sec,
              b.correct, b.total_hazards, b.wrong, b.seconds_left, b.speed_bonus, b.scene, b.played_at,
              b.attempts
       FROM best b JOIN players p ON p.id = b.player_id
       WHERE ${outerConditions.join(' AND ')}
       ORDER BY b.score DESC, b.time_taken_sec IS NULL, b.time_taken_sec ASC, b.played_at ASC
       LIMIT ?`
    )
    .all(...gameParams, ...outerParams, limit)
    .map((r) => ({
      phone: r.phone,
      name: r.name,
      email: r.email,
      company: r.company,
      designation: r.designation,
      event: r.event,
      score: r.score,
      timeTakenSec: r.time_taken_sec,
      hazardsFound: r.correct,
      totalHazards: r.total_hazards,
      wrongPicks: r.wrong,
      secondsLeft: r.seconds_left,
      speedBonus: r.speed_bonus,
      scene: r.scene,
      playedAt: r.played_at,
      attempts: r.attempts
    }))
}

export function getPlayerRank(phone) {
  const i = getRankedPlayers().findIndex((p) => p.phone === normalizePhone(phone))
  return i === -1 ? null : i + 1
}

// ---------- Leaderboard settings ----------
// Whether the public leaderboard is shown at all, and whether it ranks every game ever
// played ('all_time') or just one specific day's games ('day'). Admin-controlled, kept in
// the settings key/value table.
const LEADERBOARD_MODES = ['all_time', 'day']
const todayLocal = () => db.prepare("SELECT date('now', 'localtime') AS d").get().d
const DEFAULT_LEADERBOARD_SETTINGS = () => ({
  visible: true,
  mode: 'all_time',
  date: todayLocal(),
  windowEnabled: true
})

export function getLeaderboardSettings() {
  const rows = db
    .prepare(
      `SELECT key, value FROM settings WHERE key IN
       ('leaderboard_visible', 'leaderboard_mode', 'leaderboard_date', 'leaderboard_window_enabled')`
    )
    .all()
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const defaults = DEFAULT_LEADERBOARD_SETTINGS()
  const mode = LEADERBOARD_MODES.includes(byKey.leaderboard_mode)
    ? byKey.leaderboard_mode
    : defaults.mode
  const visible =
    byKey.leaderboard_visible === undefined ? defaults.visible : byKey.leaderboard_visible === '1'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(byKey.leaderboard_date)
    ? byKey.leaderboard_date
    : defaults.date
  const windowEnabled =
    byKey.leaderboard_window_enabled === undefined
      ? defaults.windowEnabled
      : byKey.leaderboard_window_enabled === '1'
  return { visible, mode, date, windowEnabled }
}

export function updateLeaderboardSettings({ visible, mode, date, windowEnabled }) {
  const current = getLeaderboardSettings()
  const next = {
    visible: visible === undefined ? current.visible : Boolean(visible),
    mode: LEADERBOARD_MODES.includes(mode) ? mode : current.mode,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : current.date,
    windowEnabled: windowEnabled === undefined ? current.windowEnabled : Boolean(windowEnabled)
  }
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  )
  db.transaction(() => {
    upsert.run({ key: 'leaderboard_visible', value: next.visible ? '1' : '0' })
    upsert.run({ key: 'leaderboard_mode', value: next.mode })
    upsert.run({ key: 'leaderboard_date', value: next.date })
    upsert.run({ key: 'leaderboard_window_enabled', value: next.windowEnabled ? '1' : '0' })
  })()
  return next
}

// ---------- Game (active scene + timer) settings ----------
// Which hazard-spotting scene the kiosk is currently running, and how long a round lasts.
// Admin-controlled, kept in the same settings key/value table as the leaderboard settings.
const GAME_SCENES = ['warehouse', 'pharma', 'chemical', 'automotive', 'cement']
const MIN_DURATION_SECONDS = 30
const MAX_DURATION_SECONDS = 600
const DEFAULT_GAME_SETTINGS = () => ({
  scene: 'warehouse',
  durationSeconds: 120,
  randomScenes: [...GAME_SCENES]
})

// Every event name the admin has ever created, newest first. Powers the admin's event dropdown
// (to pick which one is running) and the "create a new one" list.
export function listEvents() {
  return db
    .prepare('SELECT name FROM events ORDER BY created_at DESC, id DESC')
    .all()
    .map((r) => r.name)
}

// Adds a new event and makes it the active one right away (an admin creating an event almost
// always means "this is what's running now"). Re-adding an existing name (case-insensitive)
// just activates it instead of erroring.
export function createEvent(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('Event name is required')
  db.prepare(
    `INSERT INTO events (name) VALUES (?)
     ON CONFLICT (name) DO NOTHING`
  ).run(trimmed)
  // the stored name keeps its original casing even if this call used different casing
  const stored = db.prepare('SELECT name FROM events WHERE name = ? COLLATE NOCASE').get(trimmed)
  return updateGameSettings({ event: stored.name })
}

export function getGameSettings() {
  const rows = db
    .prepare(
      `SELECT key, value FROM settings
       WHERE key IN
         ('active_scene', 'game_duration_seconds', 'active_event', 'random_scene', 'random_scenes')`
    )
    .all()
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const defaults = DEFAULT_GAME_SETTINGS()
  const scene = GAME_SCENES.includes(byKey.active_scene) ? byKey.active_scene : defaults.scene
  const parsedDuration = Number.parseInt(byKey.game_duration_seconds, 10)
  const durationSeconds =
    Number.isInteger(parsedDuration) &&
    parsedDuration >= MIN_DURATION_SECONDS &&
    parsedDuration <= MAX_DURATION_SECONDS
      ? parsedDuration
      : defaults.durationSeconds
  // an event set active but since deleted/renamed falls back to "none" rather than showing
  // a stale name
  const activeEvent =
    byKey.active_event && db.prepare('SELECT 1 FROM events WHERE name = ?').get(byKey.active_event)
      ? byKey.active_event
      : ''
  // random mode: every new sign-up gets a randomly picked scene instead of `scene`
  const randomScene = byKey.random_scene === '1'
  let randomScenes = defaults.randomScenes
  try {
    const parsedScenes = JSON.parse(byKey.random_scenes || 'null')
    if (Array.isArray(parsedScenes)) {
      const validScenes = [...new Set(parsedScenes.filter((id) => GAME_SCENES.includes(id)))]
      if (validScenes.length) randomScenes = validScenes
    }
  } catch {
    // Existing installs and malformed values retain the previous all-scenes behavior.
  }
  return { scene, durationSeconds, activeEvent, randomScene, randomScenes }
}

// The scene and timer for the visitor who just signed up: the admin's chosen scene, or a random
// one from the admin-selected scenes while random mode is on.
export function pickGameForPlayer() {
  const settings = getGameSettings()
  const availableScenes = settings.randomScenes.length ? settings.randomScenes : GAME_SCENES
  const scene = settings.randomScene
    ? availableScenes[Math.floor(Math.random() * availableScenes.length)]
    : settings.scene
  return { scene, durationSeconds: settings.durationSeconds }
}

export function updateGameSettings({ scene, durationSeconds, event, randomScene, randomScenes }) {
  const current = getGameSettings()
  const parsedDuration = Number.parseInt(durationSeconds, 10)
  const eventExists =
    typeof event === 'string' &&
    (event === '' || db.prepare('SELECT 1 FROM events WHERE name = ?').get(event))
  const selectedScenes = Array.isArray(randomScenes)
    ? [...new Set(randomScenes.filter((id) => GAME_SCENES.includes(id)))]
    : current.randomScenes
  const next = {
    scene: GAME_SCENES.includes(scene) ? scene : current.scene,
    durationSeconds:
      Number.isInteger(parsedDuration) &&
      parsedDuration >= MIN_DURATION_SECONDS &&
      parsedDuration <= MAX_DURATION_SECONDS
        ? parsedDuration
        : current.durationSeconds,
    activeEvent: eventExists ? event : current.activeEvent,
    randomScene: typeof randomScene === 'boolean' ? randomScene : current.randomScene,
    randomScenes: selectedScenes.length ? selectedScenes : current.randomScenes
  }
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  )
  db.transaction(() => {
    upsert.run({ key: 'active_scene', value: next.scene })
    upsert.run({ key: 'game_duration_seconds', value: String(next.durationSeconds) })
    upsert.run({ key: 'active_event', value: next.activeEvent })
    upsert.run({ key: 'random_scene', value: next.randomScene ? '1' : '0' })
    upsert.run({ key: 'random_scenes', value: JSON.stringify(next.randomScenes) })
  })()
  return next
}

// Every distinct day (local time) that has at least one game, newest first. Powers the
// admin dashboard's day picker so it only ever offers days that actually have data.
export function getGameDates() {
  return db
    .prepare("SELECT DISTINCT date(played_at, 'localtime') AS d FROM games ORDER BY d DESC")
    .all()
    .map((r) => r.d)
}

// One-time copy of the players saved in localStorage before the switch to SQLite.
// Players already in the database are left alone, so running it twice is harmless.
export function importLegacyUsers(users) {
  const insertPlayer = db.prepare(
    `INSERT OR IGNORE INTO players
       (name, first_name, last_name, phone, email, company, designation, consent, created_at)
     VALUES
       (@name, @firstName, @lastName, @phone, @email, @company, @designation, @consent, @createdAt)`
  )
  const addGameStmt = insertGame()
  let imported = 0

  db.transaction(() => {
    for (const u of users || []) {
      const phone = normalizePhone(u.phone)
      if (!phone) continue
      const plays = u.plays || []
      const name = String(u.name || '').trim()
      const [firstName, ...rest] = name.split(/\s+/)
      const { changes } = insertPlayer.run({
        name,
        firstName: firstName || '',
        lastName: rest.join(' '),
        phone,
        email: normalizeEmail(u.email),
        company: String(u.company || '').trim(),
        designation: String(u.designation || '').trim(),
        consent: u.consent ? 1 : 0,
        createdAt: plays[0]?.playedAt || new Date().toISOString()
      })
      if (!changes) continue // already in the database
      const { id } = findPlayer(phone)
      for (const play of plays) addGameStmt.run(gameParams(id, play))
      imported++
    }
  })()

  return imported
}

// Everything in the database as CSV: one row per game, plus players who signed up but
// never finished a game (their game columns are empty).
const CSV_COLUMNS = [
  ['Leaderboard Rank', 'rank'],
  ['First Name', 'first_name'],
  ['Last Name', 'last_name'],
  ['Mobile', 'phone'],
  ['Email', 'email'],
  ['Company', 'company'],
  ['Job Title', 'designation'],
  ['State', 'state'],
  ['Industry', 'industry'],
  ['Contact Consent', 'consent'],
  ['Marketing Consent', 'marketing_consent'],
  ['Event', 'event'],
  ['Scenario', 'scene'],
  ['Signed Up At', 'created_at'],
  ['Played At', 'played_at'],
  ['Correct', 'correct'],
  ['Total Hazards', 'total_hazards'],
  ['Wrong', 'wrong'],
  ['Seconds Left', 'seconds_left'],
  ['Speed Bonus', 'speed_bonus'],
  ['Score', 'score'],
  ['Time Taken (s)', 'time_taken_sec'],
  ['Ended By', 'reason']
]

function csvCell(value) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // stop spreadsheet apps from running a typed-in value like "=HYPERLINK(...)" as a formula
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// With `fromDate`/`toDate` (both 'YYYY-MM-DD', inclusive), only games played in that range are
// included — a player with no game in range (even if they signed up, or played outside it)
// simply doesn't appear. Without a range, every game ever played is included, plus players who
// signed up but never played (their game columns are blank).
export function exportCsv({ fromDate, toDate } = {}) {
  const hasRange = Boolean(fromDate && toDate)
  const dateFilter = hasRange
    ? "WHERE date(g.played_at, 'localtime') BETWEEN date(?) AND date(?)"
    : ''
  const params = hasRange ? [fromDate, toDate] : []
  const ranks = new Map(getRankedPlayers().map((p, i) => [p.phone, i + 1]))
  const rows = db
    .prepare(
      `SELECT p.first_name, p.last_name, p.phone, p.email, p.company, p.designation, p.state,
              p.industry, p.consent, p.marketing_consent, p.event,
              datetime(p.created_at, 'localtime') AS created_at,
              datetime(g.played_at, 'localtime') AS played_at, g.correct, g.total_hazards, g.wrong, g.seconds_left, g.speed_bonus,
              g.score, g.time_taken_sec, g.reason, g.scene
       FROM players p LEFT JOIN games g ON g.player_id = p.id
       ${dateFilter}
       ORDER BY g.played_at DESC, p.id`
    )
    .all(...params)
    .map((r) => ({
      ...r,
      rank: ranks.get(r.phone) ?? '',
      consent: r.consent ? 'Yes' : 'No',
      marketing_consent: r.marketing_consent ? 'Yes' : 'No'
    }))

  const lines = [
    CSV_COLUMNS.map(([header]) => csvCell(header)).join(','),
    ...rows.map((r) => CSV_COLUMNS.map(([, key]) => csvCell(r[key])).join(','))
  ]
  // BOM so Excel opens the file as UTF-8 (names with accents etc. stay intact)
  return { csv: '﻿' + lines.join('\r\n') + '\r\n', rowCount: rows.length }
}

// ---------- Admin ----------
// Passwords are never stored: only a salted scrypt hash, compared in constant time.
const hashPassword = (password, salt) => scryptSync(String(password), salt, 64).toString('hex')

// The one admin account. It is created on first start (or on a new machine) if missing; the
// password can later be changed from the admin dashboard. There is no way to add other admins.
const DEFAULT_ADMIN = { username: 'admin@gmail.com', password: 'admin123' }

function ensureDefaultAdmin() {
  const exists = db.prepare('SELECT 1 FROM admins WHERE username = ?').get(DEFAULT_ADMIN.username)
  if (exists) return // keep whatever password it has now
  const salt = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO admins (username, password_hash, salt) VALUES (?, ?, ?)').run(
    DEFAULT_ADMIN.username,
    hashPassword(DEFAULT_ADMIN.password, salt),
    salt
  )
}

export function verifyAdmin(username, password) {
  const row = db
    .prepare('SELECT password_hash, salt FROM admins WHERE username = ?')
    .get(String(username || '').trim())
  // hash even for an unknown username so both cases take the same time
  const salt = row?.salt ?? 'no-such-admin'
  const given = Buffer.from(hashPassword(password || '', salt), 'hex')
  const stored = Buffer.from(row?.password_hash ?? '00'.repeat(64), 'hex')
  return Boolean(row) && timingSafeEqual(given, stored)
}

export function changeAdminPassword(username, newPassword) {
  const salt = randomBytes(16).toString('hex')
  db.prepare('UPDATE admins SET password_hash = ?, salt = ? WHERE username = ?').run(
    hashPassword(newPassword, salt),
    salt,
    String(username).trim()
  )
}

export function changeAdminCredentials(currentUsername, newUsername, newPassword) {
  const salt = randomBytes(16).toString('hex')
  const result = db
    .prepare(
      'UPDATE admins SET username = ?, password_hash = ?, salt = ? WHERE username = ?'
    )
    .run(
      String(newUsername).trim(),
      hashPassword(newPassword, salt),
      salt,
      String(currentUsername).trim()
    )
  if (!result.changes) throw new Error('Admin account could not be updated')
}

// Wipes every player and game (admin accounts are kept). Used when the admin explicitly
// asks to clear the kiosk before a new event.
export function deleteAllData() {
  return db.transaction(() => {
    const { changes } = db.prepare('DELETE FROM players').run()
    try {
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('players', 'games')")
    } catch {
      // sqlite_sequence only exists once an AUTOINCREMENT row has ever been inserted
    }
    return { deletedPlayers: changes }
  })()
}

// Removes one player (and, via ON DELETE CASCADE, every game they played), freeing up their
// phone/email so they can sign up and play again. Used when a player was registered by mistake,
// or signed up but never actually got to play.
export function deletePlayer(phone) {
  const { changes } = db.prepare('DELETE FROM players WHERE phone = ?').run(normalizePhone(phone))
  return { deleted: changes > 0 }
}

// With `date` (a 'YYYY-MM-DD' string) and/or `scene` (a scene id), every count except
// "players" and "gamesToday" is scoped to those games, so the dashboard tiles can show
// all-time, day-wise and/or per-scenario numbers depending on the admin's "All Players" filters.
export function getAdminStats({ date, scene, event } = {}) {
  const conditions = []
  const dayParams = []
  if (date) {
    conditions.push("date(g.played_at, 'localtime') = date(?)")
    dayParams.push(date)
  }
  if (scene) {
    conditions.push('g.scene = ?')
    dayParams.push(scene)
  }
  if (event) {
    conditions.push('p.event = ?')
    dayParams.push(event)
  }
  const dayFilter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const from = 'FROM games g JOIN players p ON p.id = g.player_id'
  const one = (sql, params = []) => db.prepare(sql).get(...params)
  const today = "date(g.played_at, 'localtime') = date('now', 'localtime')"
  return {
    players: one('SELECT COUNT(*) AS n FROM players').n,
    playersWhoPlayed: one(`SELECT COUNT(DISTINCT g.player_id) AS n ${from} ${dayFilter}`, dayParams)
      .n,
    games: one(`SELECT COUNT(*) AS n ${from} ${dayFilter}`, dayParams).n,
    gamesToday: one(`SELECT COUNT(*) AS n FROM games g WHERE ${today}`).n,
    topScore: one(`SELECT MAX(g.score) AS n ${from} ${dayFilter}`, dayParams).n ?? 0,
    averageScore: Math.round(one(`SELECT AVG(g.score) AS n ${from} ${dayFilter}`, dayParams).n ?? 0)
  }
}
