import { BrowserWindow } from 'electron'

// Tell every open window (the kiosk itself, plus any dedicated leaderboard display) that the
// public leaderboard data may have changed, so each one can refresh right away instead of
// waiting for its next poll.
export function broadcastLeaderboardChanged() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('leaderboard:changed')
  }
}
