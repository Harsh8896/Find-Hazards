// Talks to a Google Apps Script Web App that reads/writes a Google Sheet.
// Deploy apps-script/Code.gs (see README) and put the resulting /exec URL here.
const WEBAPP_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL || ''

const QUEUE_KEY = 'pip_pending_submissions'

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

async function postToSheet(payload) {
  if (!WEBAPP_URL) throw new Error('Sheets Web App URL not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`Sheet submit failed: ${res.status}`)
  return res.json().catch(() => ({}))
}

export async function submitEntry(entry) {
  const payload = { action: 'submit', ...entry }
  try {
    await postToSheet(payload)
    return { ok: true, queued: false }
  } catch (err) {
    const queue = readQueue()
    queue.push(payload)
    writeQueue(queue)
    return { ok: false, queued: true, error: err.message }
  }
}

export async function flushQueue() {
  const queue = readQueue()
  if (!queue.length) return
  const remaining = []
  for (const item of queue) {
    try {
      await postToSheet(item)
    } catch {
      remaining.push(item)
    }
  }
  writeQueue(remaining)
}

export async function fetchLeaderboard(limit = 20) {
  if (!WEBAPP_URL) return []
  const url = `${WEBAPP_URL}?action=leaderboard&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data.rows) ? data.rows : []
}
