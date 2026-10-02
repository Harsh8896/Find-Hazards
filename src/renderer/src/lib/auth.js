// Player accounts live in the local SQLite database (src/main/db.js), reached through the
// preload bridge. Phone number is the unique key. No password — this is a booth kiosk.
const db = () => window.api.db

export const signUp = (form) => db().signUp(form)
export const phoneAlreadyPlayed = (phone) => db().phoneAlreadyPlayed(phone)
export const emailAlreadyPlayed = (email) => db().emailAlreadyPlayed(email)
export const addPlayRecord = (phone, record) => db().addGame(phone, record)

// Before SQLite, players were kept in localStorage under this key. Copy them into the
// database once; the localStorage copy is left in place as a backup.
const LEGACY_USERS_KEY = 'pip_users'
const MIGRATED_KEY = 'pip_migrated_to_sqlite'

export async function migrateLegacyUsers() {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const users = Object.values(JSON.parse(localStorage.getItem(LEGACY_USERS_KEY) || '{}'))
    if (users.length) await db().importLegacyUsers(users)
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
  } catch (err) {
    console.error('Could not migrate localStorage players to SQLite', err)
  }
}
