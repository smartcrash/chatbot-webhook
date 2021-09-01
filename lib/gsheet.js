const { fuzzy } = require('fast-fuzzy')
const { GoogleSpreadsheet } = require('google-spreadsheet')

module.exports = async function gsheet(sheetID, { clientEmail, privateKey }) {
  const doc = new GoogleSpreadsheet(sheetID)

  await doc.useServiceAccountAuth({
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/gm, '\n'), // https://github.com/auth0/node-jsonwebtoken/issues/642#issuecomment-573447754
  })

  await doc.loadInfo()

  /**
   * Search within the screadsheet for the given text and returns the row with the best match
   * The column is selected using `columnIndex` (default 0) and the sheet with `sheetIndex`(default 0)
   *
   * @param {string} textMatch The search string
   * @param {object} options
   * @returns {GoogleSpreadsheetRow | null}
   */
  async function findRowByText(textMatch, { sheetIndex = 0, columnIndex = 0 } = {}) {
    const sheet = doc.sheetsByIndex[sheetIndex]

    await sheet.loadCells()

    const { rowCount } = sheet
    let rowIndex = 1 // Start at 1 to ignore title cell

    const bestMatch = {
      score: -Infinity,
      rowIndex: null,
    }

    while (rowIndex < rowCount) {
      const cell = sheet.getCell(rowIndex, columnIndex)
      const value = (cell.value || '').trim()

      // Ignore empty cells
      if (!value) continue

      const score = fuzzy(textMatch, cell.value, {
        ignoreCase: true,
        ignoreSymbols: true,
        normalizeWhitespace: true,
      })

      // Update bestMatch if this is better
      if (score > bestMatch.score) {
        bestMatch.rowIndex = rowIndex
        bestMatch.score = score
      }

      // Exit early if gets a perfect score
      if (score >= 1) break

      ++rowIndex
    }

    if (bestMatch.rowIndex === null) {
      return null
    }

    const rows = await sheet.getRows({
      limit: 1,
      offset: bestMatch.rowIndex - 1,
    })

    return rows[0]._rawData
  }

  return { doc, findRowByText }
}
