const { google, Auth } = require('googleapis')

module.exports = async function gcalenndar({ email, key, scopes, calendarId }) {
  const auth = new Auth.JWT(email, null, key, scopes)

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
        calendarId,
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      })
      .then(({ data }) => data)
  }

  function createEvent(requestBody = {}) {
    return calendar.events.insert({
      auth,
      calendarId,
      requestBody,
    })
  }

  return { listUpcomingEvents, createEvent }
}
