const { google, Auth } = require('googleapis')

const CLIENT_EMAIL = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_CALENDAR_PRIVATE_KEY
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
const SCOPES = ['https://www.googleapis.com/auth/calendar']

module.exports = async function gcalenndar() {
  const auth = new Auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, SCOPES)

  await auth.authorize()

  const calendar = google.calendar({ version: 'v3', auth })

  /**
   * Print the summary and start datetime/date of the next ten events in
   * the authorized user's calendar. If no events are found an
   * appropriate message is printed.
   */
  function listUpcomingEvents() {
    return calendar.events
      .list({
        calendarId: CALENDAR_ID,
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      })
      .then(({ data }) => data)
  }

  return { listUpcomingEvents }
}
