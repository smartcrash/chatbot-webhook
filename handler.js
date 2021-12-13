'use strict'
const fetch = require('node-fetch')
const gcalendar = require('./lib/gcalendar')
const chatbot = require('./lib/chatbot')
const { DateTime } = require('luxon')

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 *
 */
module.exports.chatbotWebhook = async event => {
  const { getLastMessage, body } = chatbot(event)
  const { getFreeSlots, createEvent } = await gcalendar({
    email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
    key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  const lastMessage = getLastMessage()

  const collected_data = body.collected_data?.custom || {}

  const res = {
    response: {
      text: [],
      stopChat: true,
    },
    custom: collected_data,
  }

  if (!collected_data.date_asked) {
    // Here we ask for the day of the appointment
    // This should be the first message

    res.response.text = ['Que dia deseas hacer la cita?', 'Ingresa la fecha en el formato dd/mm/yyyy']
    res.custom.date_asked = true
    res.custom.hour_asked = false
  } else if (collected_data.hour_asked && collected_data.hour_slots?.length && collected_data.selected_date) {
    // Extract the selected hour range from last message

    const { text } = lastMessage
    const index = Number.parseInt(text.slice(0, text.indexOf(' '))) - 1
    const { hour_slots: hourSlots } = collected_data
    const range = hourSlots[index]
    const startHour = DateTime.fromISO(range.startDate)
    const endHour = DateTime.fromISO(range.endDate)

    const selectedDate = DateTime.fromISO(collected_data.selected_date)

    const startDate = selectedDate.set({ hour: startHour.hour, minute: startHour.minute })
    const endDate = selectedDate.set({ hour: endHour.hour, minute: endHour.minute })

    try {
      await createEvent({
        summary: 'Cita creada mediante chatbot',
        start: { dateTime: startDate.toISO() },
        end: { dateTime: endDate.toISO() },
        // TODO: Maybe should add user's email
        // attendees: [{ email: 'lpage@example.com' }],

        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      })

      res.response.text = [
        'Se a creado una cita para el:',
        `${selectedDate.toLocaleString()} de las ${startHour.toFormat('t')} hasta las ${endHour.toFormat('t')}`,
      ]
    } catch (error) {
      res.response.text = ['Hubo un error al crear la cita. Por favor intentalo mas tarde']
    }
  } else {
    // Parse the last message and extract a date

    const dateTime = DateTime.fromFormat(lastMessage.text, 'dd/MM/yyyy')
    const isFuture = dateTime.endOf('day').toMillis() > DateTime.now().toMillis()
    const { isValid } = dateTime

    if (isValid && isFuture) {
      const { hourSlots } = await getFreeSlots(dateTime.startOf('day').toISO(), dateTime.endOf('day').toISO())

      if (hourSlots.length) {
        const options = hourSlots.map((range, index) => {
          const startDate = DateTime.fromISO(range.startDate)
          const endDate = DateTime.fromISO(range.endDate)

          // The index is added becauses is used later as ID of this hour range
          return `${index + 1} | ${startDate.toFormat('t')} - ${endDate.toFormat('t')}`
        })

        res.response.text = ['Estas son las horas disponibles, por favor elige una de estas:']
        res.response.response_type = 'LIST'
        res.response.response_options = options

        res.custom.selected_date = dateTime.toISO()
        res.custom.hour_slots = hourSlots
        res.custom.hour_asked = true
      } else {
        res.response.text = [
          'Lo siento pero no hay citas disponibles para esta fecha.',
          'Por favor intenta con otro dia',
        ]
      }
    } else {
      res.response.text = ['Por favor ingresa una fecha valida']
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(res, null, 2),
  }
}

/**
 * Endpoint para simplificar la configuración de global_fulfillment_url que es la url donde se recibirán los webhooks de un determinado chatbot
 *
 */
module.exports.chatbotConfig = async event => {
  const API_KEY = 'd53ab56d-7b4a-491b-b8c3-41e260e991f1'
  const websiteId = process.env.WEBSITE_ID || '60e5b8c52c6d8d0026157734'
  const global_fulfillment_url = process.env.FULLFILMENT_URL || 'http://fe57-190-205-96-244.ngrok.io/dev/chatbotWebhook'
  const baseUrl = 'https://api.stagecliengo.com' // "https://api.cliengo.com"

  try {
    var jwt = ''
    //busco un JWT para este user represetado por la API_KEY
    await fetch(baseUrl + '/1.0/jwt?api_key=' + API_KEY)
      .then(res => res.json())
      .then(json => {
        jwt = json.jwt
      })

    //cambio el global_fulfillment_url para seterle el webhook de esta app
    await fetch(baseUrl + '/1.0/projects/' + websiteId + '/chatbots/chatId', {
      headers: { cookie: 'jwt=' + jwt, 'Content-Type': 'application/json' },
      method: 'PATCH',
      body: JSON.stringify({
        global_fulfillment_url: global_fulfillment_url,
      }),
    })
      .then(res => res.json())
      .then(json => {
        jwt = json
      })

    //devuelvo el nuevo estado de la config de chatbot
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: jwt,
        },
        null,
        2
      ),
    }
  } catch (error) {
    console.log(error)
  }
}

module.exports.hello = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Hello Cliengo world!',
      },
      null,
      2
    ),
  }
}
