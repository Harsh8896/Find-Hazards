import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Database calls for the renderer; each one runs in the main process (see src/main/db.js)
const api = {
  db: {
    signUp: (data) => ipcRenderer.invoke('db:signUp', data),
    phoneAlreadyPlayed: (phone) => ipcRenderer.invoke('db:phoneAlreadyPlayed', phone),
    emailAlreadyPlayed: (email) => ipcRenderer.invoke('db:emailAlreadyPlayed', email),
    addGame: (phone, record) => ipcRenderer.invoke('db:addGame', phone, record),
    getLeaderboard: (limit) => ipcRenderer.invoke('db:getLeaderboard', limit),
    getLeaderboardSettings: () => ipcRenderer.invoke('db:getLeaderboardSettings'),
    getGameSettings: () => ipcRenderer.invoke('db:getGameSettings'),
    pickGameForPlayer: () => ipcRenderer.invoke('db:pickGameForPlayer'),
    getPlayerRank: (phone) => ipcRenderer.invoke('db:getPlayerRank', phone),
    importLegacyUsers: (users) => ipcRenderer.invoke('db:importLegacyUsers', users)
  },
  // every admin call is checked against the admin session in the main process (src/main/admin.js)
  admin: {
    status: () => ipcRenderer.invoke('admin:status'),
    login: (username, password) => ipcRenderer.invoke('admin:login', username, password),
    logout: () => ipcRenderer.invoke('admin:logout'),
    changePassword: (current, next) => ipcRenderer.invoke('admin:changePassword', current, next),
    getDashboard: () => ipcRenderer.invoke('admin:getDashboard'),
    getPlayers: (date, scene, event) =>
      ipcRenderer.invoke('admin:getPlayers', { date, scene, event }),
    downloadCsv: (from, to) => ipcRenderer.invoke('admin:downloadCsv', { from, to }),
    deleteAllData: () => ipcRenderer.invoke('admin:deleteAllData'),
    deletePlayer: (phone) => ipcRenderer.invoke('admin:deletePlayer', phone),
    updateLeaderboardSettings: (settings) =>
      ipcRenderer.invoke('admin:updateLeaderboardSettings', settings),
    updateGameSettings: (settings) => ipcRenderer.invoke('admin:updateGameSettings', settings),
    createEvent: (name) => ipcRenderer.invoke('admin:createEvent', name)
  },
  // fires whenever a game is saved (or an admin changes leaderboard settings/data), so a
  // leaderboard screen can refresh immediately instead of waiting for its next poll
  onLeaderboardChanged: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('leaderboard:changed', listener)
    return () => ipcRenderer.removeListener('leaderboard:changed', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
