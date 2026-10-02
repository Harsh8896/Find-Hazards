import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as db from './db'
import { registerAdminHandlers } from './admin'
import { broadcastLeaderboardChanged } from './broadcast'
import { applyLeaderboardWindowEnabled } from './leaderboardWindow'

// Every call from the screens goes through here: renderer → preload → ipcMain → SQLite.
// A failing query is logged and rejected back to the screen that asked; it never takes the
// app down.
function handle(channel, fn) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error(`${channel} failed:`, err)
      throw new Error(err.message)
    }
  })
}

// The public leaderboard can never ask for more rows than it shows; the full list (with every
// player's contact details) is admin-only, see admin:getDashboard.
const PUBLIC_LEADERBOARD_MAX = 5

function registerDbHandlers() {
  handle('db:signUp', (_, data) => db.signUp(data))
  handle('db:phoneAlreadyPlayed', (_, phone) => db.phoneAlreadyPlayed(phone))
  handle('db:emailAlreadyPlayed', (_, email) => db.emailAlreadyPlayed(email))
  handle('db:addGame', (_, phone, record) => {
    const player = db.addGame(phone, record)
    if (player) broadcastLeaderboardChanged() // a new score can change the public ranking
    return player
  })
  handle('db:getLeaderboard', (_, limit) => {
    const { mode, date } = db.getLeaderboardSettings()
    return db.getRankedPlayers(
      Math.min(Number(limit) || PUBLIC_LEADERBOARD_MAX, PUBLIC_LEADERBOARD_MAX),
      { date: mode === 'day' ? date : undefined }
    )
  })
  // public: the sign-up and leaderboard screens need this before anyone is signed in, so it
  // can't live behind admin:getDashboard
  handle('db:getLeaderboardSettings', () => db.getLeaderboardSettings())
  // public: every kiosk screen needs to know which scene to play before anyone is signed in
  handle('db:getGameSettings', () => db.getGameSettings())
  handle('db:getPlayerRank', (_, phone) => db.getPlayerRank(phone))
  handle('db:importLegacyUsers', (_, users) => db.importLegacyUsers(users))
  registerAdminHandlers(handle)
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // frame: false hides the native window controls, so F11 is the only way left to
  // enter/exit fullscreen (handy for the kiosk touchscreen).
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// A kiosk should never run two copies writing to the same database: focus the open one instead.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

app.on('before-quit', () => db.closeDb())

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    await db.openDb()
  } catch (err) {
    console.error('Could not open the database', err)
    dialog.showErrorBox(
      'Spot The Hazards — database error',
      `The game could not open its database, so it will close to avoid losing scores.\n\n${err.message}`
    )
    app.exit(1)
    return
  }
  console.log('SQLite database:', db.dbPath())
  registerDbHandlers()

  createWindow()
  applyLeaderboardWindowEnabled(db.getLeaderboardSettings().windowEnabled)

  // e.g. a damaged database that was set aside and restored from backup
  const notes = db.getStartupNotes()
  if (notes.length) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Database recovered',
      message: notes.join('\n\n')
    })
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
