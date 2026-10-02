import { app, shell, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import * as db from './db'
import { broadcastLeaderboardChanged } from './broadcast'
import { applyLeaderboardWindowEnabled } from './leaderboardWindow'

// The admin session lives here in the main process, never in the screen, so admin-only calls
// (like the CSV download) can't be unlocked from DevTools or by editing the page.
const SESSION_IDLE_MS = 15 * 60 * 1000 // signed out after 15 minutes without admin activity
const MAX_FAILED_LOGINS = 5
const LOCKOUT_MS = 60 * 1000
const MIN_PASSWORD_LENGTH = 8
// How many rows the admin dashboard's "what will the public see" preview shows — same size
// as the public leaderboard itself (PUBLIC_LEADERBOARD_MAX in src/main/index.js).
const LEADERBOARD_PREVIEW_SIZE = 5

let session = null // { username, webContentsId, expiresAt }
let failedLogins = 0
let lockedUntil = 0

function startSession(event, username) {
  session = {
    username,
    webContentsId: event.sender.id,
    expiresAt: Date.now() + SESSION_IDLE_MS
  }
}

function activeSession(event) {
  if (!session) return null
  if (session.webContentsId !== event.sender.id || Date.now() > session.expiresAt) {
    session = null
    return null
  }
  session.expiresAt = Date.now() + SESSION_IDLE_MS // sliding: activity keeps it alive
  return session
}

function requireAdmin(event) {
  const s = activeSession(event)
  if (!s) throw new Error('ADMIN_AUTH_REQUIRED')
  return s
}

function checkNewPassword(password) {
  if (String(password || '').length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
}

export function registerAdminHandlers(handle) {
  handle('admin:status', (event) => {
    const s = activeSession(event)
    return { loggedIn: Boolean(s), username: s?.username ?? null }
  })

  handle('admin:login', (event, username, password) => {
    if (Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      throw new Error(`Too many wrong attempts. Try again in ${secs} seconds.`)
    }
    if (!db.verifyAdmin(username, password)) {
      failedLogins++
      if (failedLogins >= MAX_FAILED_LOGINS) {
        lockedUntil = Date.now() + LOCKOUT_MS
        failedLogins = 0
      }
      throw new Error('Wrong username or password')
    }
    failedLogins = 0
    startSession(event, String(username).trim())
    return { ok: true }
  })

  handle('admin:logout', () => {
    session = null
    return { ok: true }
  })

  handle('admin:changePassword', (event, currentPassword, newPassword) => {
    const s = requireAdmin(event)
    if (!db.verifyAdmin(s.username, currentPassword)) throw new Error('Current password is wrong')
    checkNewPassword(newPassword)
    db.changeAdminPassword(s.username, newPassword)
    return { ok: true }
  })

  handle('admin:getDashboard', (event) => {
    requireAdmin(event)
    const leaderboardSettings = db.getLeaderboardSettings()
    return {
      stats: db.getAdminStats(),
      players: db.getRankedPlayers(),
      leaderboardSettings,
      gameSettings: db.getGameSettings(),
      gameDates: db.getGameDates(),
      events: db.listEvents(),
      leaderboardPreview: db.getRankedPlayers(LEADERBOARD_PREVIEW_SIZE, {
        date: leaderboardSettings.mode === 'day' ? leaderboardSettings.date : undefined
      })
    }
  })

  handle('admin:updateGameSettings', (event, settings) => {
    requireAdmin(event)
    return { settings: db.updateGameSettings(settings || {}) }
  })

  handle('admin:createEvent', (event, name) => {
    requireAdmin(event)
    return { settings: db.createEvent(name), events: db.listEvents() }
  })

  handle('admin:getPlayers', (event, { date, scene, event: eventName } = {}) => {
    requireAdmin(event)
    return {
      players: db.getRankedPlayers(-1, { date, scene, event: eventName }),
      stats: db.getAdminStats({ date, scene, event: eventName })
    }
  })

  handle('admin:updateLeaderboardSettings', (event, settings) => {
    requireAdmin(event)
    const next = db.updateLeaderboardSettings(settings || {})
    applyLeaderboardWindowEnabled(next.windowEnabled) // opens/closes the second display right away
    broadcastLeaderboardChanged() // visibility/mode changes should reach the public display right away
    return {
      settings: next,
      preview: db.getRankedPlayers(LEADERBOARD_PREVIEW_SIZE, {
        date: next.mode === 'day' ? next.date : undefined
      })
    }
  })

  handle('admin:deleteAllData', (event) => {
    requireAdmin(event)
    const res = db.deleteAllData()
    broadcastLeaderboardChanged()
    return res
  })

  handle('admin:deletePlayer', (event, phone) => {
    requireAdmin(event)
    const res = db.deletePlayer(phone)
    broadcastLeaderboardChanged()
    return res
  })

  handle('admin:downloadCsv', async (event, { from, to } = {}) => {
    requireAdmin(event)
    const { csv, rowCount } = db.exportCsv({ fromDate: from, toDate: to })
    let nameSuffix
    if (from && to) {
      nameSuffix = from === to ? from : `${from}_to_${to}`
    } else {
      nameSuffix = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')
    }
    const { canceled, filePath } = await dialog.showSaveDialog(
      BrowserWindow.fromWebContents(event.sender),
      {
        title: 'Download CSV',
        defaultPath: join(app.getPath('downloads'), `spot-the-hazards-${nameSuffix}.csv`),
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      }
    )
    if (canceled || !filePath) return { saved: false }
    await writeFile(filePath, csv, 'utf8')
    shell.showItemInFolder(filePath)
    return { saved: true, filePath, rowCount }
  })
}
