// Google Apps Script Web App — backs the "Spot the Hazards" game.
// Setup:
// 1. Create a Google Sheet. Add a tab named "Entries" with header row:
//    Timestamp | Name | Phone | Email | Company | Designation | Consent | Score | HazardsFound | TotalHazards | TimeTakenSec
// 2. Extensions > Apps Script, paste this file's contents in as Code.gs.
// 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
// 4. Copy the /exec URL into electron-app/.env as VITE_SHEETS_WEBAPP_URL=<url>

const SHEET_NAME = 'Entries'

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  return ss.getSheetByName(SHEET_NAME)
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  if (body.action === 'submit') {
    const sheet = getSheet_()
    sheet.appendRow([
      new Date(),
      body.name || '',
      body.phone || '',
      body.email || '',
      body.company || '',
      body.designation || '',
      body.consent ? 'Yes' : 'No',
      body.score || 0,
      body.hazardsFound || 0,
      body.totalHazards || 0,
      body.timeTakenSec || 0
    ])
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    )
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unknown action' })).setMimeType(
    ContentService.MimeType.JSON
  )
}

function doGet(e) {
  const action = e.parameter.action
  if (action === 'leaderboard') {
    const limit = Number(e.parameter.limit || 20)
    const sheet = getSheet_()
    const values = sheet.getDataRange().getValues()
    const [, ...rows] = values // drop header row
    const ranked = rows
      .map((r) => ({
        name: r[1],
        company: r[4],
        score: Number(r[7]) || 0,
        hazardsFound: Number(r[8]) || 0,
        totalHazards: Number(r[9]) || 0,
        timeTakenSec: Number(r[10]) || 0
      }))
      .sort((a, b) => b.score - a.score || a.timeTakenSec - b.timeTakenSec)
      .slice(0, limit)
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: ranked })).setMimeType(
      ContentService.MimeType.JSON
    )
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unknown action' })).setMimeType(
    ContentService.MimeType.JSON
  )
}
