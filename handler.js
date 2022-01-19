'use strict'
const fetch = require('node-fetch')
const gcalendar = require('./lib/gcalendar')
const chatbot = require('./lib/chatbot')
const { DateTime } = require('luxon')

const initGCalendar = () => {
  return gcalendar({
    email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
    key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

const createDescription = ({ name, email, phone }) => {
  return `Nombre del cliente: ${name}, email: ${email}${phone ? `, Teléfono: ${phone}` : ''}`
}

const createFinalMessage = ({ serviceName, name, phone, email, selectedDate, startHour, endHour }) => {
  return [
    `Se a creado una cita para "${serviceName}" a nombre de ${name}`,
    phone ? `teléfono: ${phone}` : null,
    email ? `email: ${email}` : null,
    `para el ${selectedDate.toLocaleString()} de las ${startHour.toFormat('t')} hasta las ${endHour.toFormat('t')}`,
  ].filter(x => !!x)
}

const empty = (x = []) => !x.length

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 *
 */
module.exports.chatbotWebhook = async event => {
  const { body, getLastMessage } = chatbot(event)
  const { order = 0 } = body.flow.last_question_messages
  const lastMessage = getLastMessage()
  const collected_data = body.collected_data || {}
  const custom = collected_data.custom || {}

  // Why wait until 6th question is answered
  if (!(order === 0 && !empty(Object.keys(custom))) && order < 6) {
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          response: {
            text: [],
            stopChat: false,
          },
        },
        null,
        2
      ),
    }
  }

  const { createEvent, getFreeSlots } = await initGCalendar()

  const res = {
    response: {
      text: [],
      stopChat: true,
    },
    custom,
  }

  // FIXME: Service name is stored with an empty string key
  res.custom.service = { value: res.custom[''] }

  // ==========================================================================
  // Check if the date has been answered
  // If it is stract it from the last message and
  // then return the available slots for that day
  // ==========================================================================

  if (!custom.selected_date) {
    const dateTime = DateTime.fromFormat(lastMessage.text, 'dd/MM/yyyy')
    const isFuture = dateTime.endOf('day').toMillis() > DateTime.now().toMillis()

    if (!dateTime.isValid || !isFuture) {
      res.response.text = ['Por favor ingresa una fecha válida']

      return {
        statusCode: 200,
        body: JSON.stringify(res, null, 2),
      }
    }

    const timeMin = dateTime.set({ hour: 8, minute: 0 }).toISO()
    const timeMax = dateTime.set({ hour: 8, minute: 0 }).plus({ hours: 10 }).toISO()
    const { hourSlots } = await getFreeSlots(timeMin, timeMax)

    if (hourSlots.length) {
      const options = hourSlots.map((range, index) => {
        const startDate = DateTime.fromISO(range.startDate)
        const endDate = DateTime.fromISO(range.endDate)

        // The index is added becauses is used later as ID of this hour range
        return `#${index + 1} ${startDate.toFormat('t')} - ${endDate.toFormat('t')}`
      })

      res.response.text = ['Estas son las horas disponibles, por favor elige una de estas:']
      res.response.response_type = 'LIST'
      res.response.response_options = options

      res.custom.selected_date = { value: dateTime.toISO() }
      res.custom.hours = { value: hourSlots }
    } else {
      res.response.text = ['Citas disponibles para esta fecha']
    }

    return {
      statusCode: 200,
      body: JSON.stringify(res, null, 2),
    }
  }

  // ==========================================================================
  // At here the date and the hour range has been selected.
  // Now extract the selected hour range from last message
  // and create the event using the collected data
  // ==========================================================================

  const { text } = lastMessage
  const index = Number.parseInt(text.slice(1, text.indexOf(' '))) - 1
  const hours = custom.hours.value
  const range = hours[index]

  const startHour = DateTime.fromISO(range.startDate)
  const endHour = DateTime.fromISO(range.endDate)

  const selectedDate = DateTime.fromISO(custom.selected_date.value)
  const startDate = selectedDate.set({ hour: startHour.hour, minute: startHour.minute }).toISO()
  const endDate = selectedDate.set({ hour: endHour.hour, minute: endHour.minute }).toISO()

  try {
    const serviceName = custom.service && custom.service.value
    const name = collected_data.name && collected_data.name.value
    const email = collected_data.email && collected_data.email.value
    const phone = collected_data.phone && collected_data.phone.international_format

    console.log({
      serviceName,
      email,
      name,
      email,
      phone,
    })

    await createEvent({
      summary: `Cita: ${serviceName}`,
      description: createDescription({ name, email, phone }),
      start: { dateTime: startDate },
      end: { dateTime: endDate },
      // FIXME: Adding the `attendees` key throws this error:
      // code: 403,
      // errors: [
      //   {
      //     domain: 'calendar',
      //     reason: 'forbiddenForServiceAccounts',
      //     message: 'Service accounts cannot invite attendees without Domain-Wide Delegation of Authority.'
      //   }
      // ]
      // attendees: [{ email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    })
    res.response.text = createFinalMessage({
      serviceName,
      name,
      phone,
      email,
      selectedDate,
      startHour,
      endHour,
    })
  } catch (error) {
    console.error(error)
    res.response.text = ['Hubo un error al crear la cita. Por favor intentalo mas tarde']
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
  const global_fulfillment_url = process.env.FULLFILMENT_URL || 'http://df9a-190-205-98-122.ngrok.io/dev/chatbotWebhook'
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
