const { google, Auth } = require('googleapis')
const { DateTime } = require('luxon')

module.exports = async function gcalenndar({ email, key, scopes, calendarId }) {
  const auth = new Auth.JWT(email, null, key, scopes)

  await auth.authorize()

  const calendar = google.calendar({ version: 'v3', auth })

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

  /**
   * @see https://developers.google.com/calendar/api/guides/create-events
   * @example
   * // Example usage
   * const requestBody = {
   *  'summary': 'Google I/O 2015',
   *  'location': '800 Howard St., San Francisco, CA 94103',
   *  'description': 'A chance to hear more about Google\'s developer products.',
   *  'start': {
   *    'dateTime': '2015-05-28T09:00:00-07:00',
   *    'timeZone': 'America/Los_Angeles',
   *  },
   *  'end': {
   *    'dateTime': '2015-05-28T17:00:00-07:00',
   *    'timeZone': 'America/Los_Angeles',
   *  },
   *  'recurrence': [
   *    'RRULE:FREQ=DAILY;COUNT=2'
   *  ],
   *  'attendees': [
   *    {'email': 'lpage@example.com'},
   *    {'email': 'sbrin@example.com'},
   *  ],
   *  'reminders': {
   *    'useDefault': false,
   *    'overrides': [
   *      {'method': 'email', 'minutes': 24 * 60},
   *      {'method': 'popup', 'minutes': 10},
   *    ],
   *  },
   * };
   *
   * await createEvent(requestBody)
   * @param {Object} requestBody
   * @returns
   */
  function createEvent(requestBody = {}) {
    return calendar.events.insert({
      auth,
      calendarId,
      requestBody,
    })
  }

  async function getAvailableSlots(timeMin = new Date().toISOString(), timeMax = new Date().toISOString()) {
    const freeRanges = []
    const interval = 2 // how big single slot should be in hours

    const { data } = await calendar.freebusy.query({
      auth,
      requestBody: {
        items: [{ id: calendarId }],
        timeMin,
        timeMax,
      },
    })

    const events = data.calendars[calendarId].busy

    if (!events.length) {
      freeRanges.push({
        startDate: timeMin,
        endDate: timeMax,
      })
    }

    let startDate = DateTime.fromISO(timeMin)

    // Compute the  ranges of times that are free. Example output:
    // freeRanges: [
    //   {
    //     startDate: '2021-12-08T00:00:00.000-04:00',
    //     endDate: '2021-12-08T13:00:00.000-04:00'
    //   },
    //   {
    //     startDate: '2021-12-08T13:59:59.000-04:00',
    //     endDate: '2021-12-08T23:59:59.999-04:00'
    //   }
    // ]

    events.forEach((event, index) => {
      const isFirst = index === 0
      const prevEvent = events[index - 1]
      const eventStart = DateTime.fromISO(event.start)
      const eventEnd = DateTime.fromISO(event.end)

      const range = {
        startDate: null,
        endDate: null,
      }

      if (isFirst && startDate.toMillis() < eventStart.toMillis()) {
        range.startDate = startDate.toISO()
        range.endDate = eventStart.toISO()
      } else if (isFirst) {
        startDate = DateTime.fromISO(event.end)
      } else if (DateTime.fromISO(prevEvent.end).toMillis() < eventStart.toMillis()) {
        range.startDate = DateTime.fromISO(prevEvent.end).toISO()
        range.endDate = eventStart.toISO()
      }

      freeRanges.push(range)

      if (events.length === index + 1 && eventEnd.toMillis() < DateTime.fromISO(timeMax).toMillis()) {
        freeRanges.push({
          startDate: eventEnd.toISO(),
          endDate: DateTime.fromISO(timeMax).toISO(),
        })
      }
    })

    // Compute the avaiable slots on the free ranges based on the interval. Example output:
    // hourSlots: [
    //     {
    //       startDate: '2021-12-08T11:00:00.000-04:00',
    //       endDate: '2021-12-08T13:00:00.000-04:00'
    //     },
    //     {
    //       startDate: '2021-12-08T10:00:00.000-04:00',
    //       endDate: '2021-12-08T12:00:00.000-04:00'
    //     },
    //     {
    //       startDate: '2021-12-08T09:00:00.000-04:00',
    //       endDate: '2021-12-08T11:00:00.000-04:00'
    //     },
    //     {
    //       startDate: '2021-12-08T08:00:00.000-04:00',
    //       endDate: '2021-12-08T10:00:00.000-04:00'
    //     }
    // ]

    const hourSlots = []

    freeRanges.forEach(range => {
      const rangeStart = DateTime.fromISO(range.startDate)
      const rangeEnd = DateTime.fromISO(range.endDate)

      let { hour } = rangeStart

      while (hour <= rangeEnd.hour) {
        const start = rangeStart.set({ hour })
        const end = start.plus({ hour: interval })

        const isInBetweenRange = start >= rangeStart && end <= rangeEnd

        if (isInBetweenRange) {
          hourSlots.push({
            startDate: start.toISO(),
            endDate: end.toISO(),
          })
        }

        hour += interval
      }
    })

    return { freeRanges, hourSlots }
  }

  return { listUpcomingEvents, createEvent, getFreeSlots: getAvailableSlots }
}
