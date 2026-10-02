import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// A second, ordinary window that always shows the public leaderboard next to the game
// window, kept live by the same polling + instant broadcast as the in-app "View Leaderboard"
// link. The admin dashboard can turn it on/off at runtime (see admin:updateLeaderboardSettings);
// applyLeaderboardWindowEnabled is also called once at startup with the saved setting.
let leaderboardWindow = null

function createLeaderboardWindow() {
  if (leaderboardWindow && !leaderboardWindow.isDestroyed()) return

  const { x, y, width, height } = screen.getPrimaryDisplay().workArea
  leaderboardWindow = new BrowserWindow({
    x: x + Math.round(width / 2),
    y,
    width: Math.floor(width / 2),
    height,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // On some Windows machines 'ready-to-show' never fires (GPU/driver quirks), which would
  // otherwise leave this window created but permanently invisible with no error anywhere.
  // A safety-net timer shows it regardless once the page has had a chance to paint.
  let shown = false
  const showOnce = () => {
    if (shown || leaderboardWindow.isDestroyed()) return
    shown = true
    leaderboardWindow.show()
  }

  leaderboardWindow.on('ready-to-show', showOnce)
  setTimeout(showOnce, 3000)

  leaderboardWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Leaderboard window failed to load:', errorCode, errorDescription)
  })

  leaderboardWindow.on('closed', () => {
    leaderboardWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    leaderboardWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#leaderboard`)
  } else {
    leaderboardWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'leaderboard' })
  }
}

function closeLeaderboardWindow() {
  if (leaderboardWindow && !leaderboardWindow.isDestroyed()) leaderboardWindow.close()
  leaderboardWindow = null
}

export function applyLeaderboardWindowEnabled(enabled) {
  if (enabled) createLeaderboardWindow()
  else closeLeaderboardWindow()
}
