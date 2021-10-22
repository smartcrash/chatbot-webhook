'use strict'
const fetch = require('node-fetch')
const chatbot = require('./lib/chatbot')
const Pipeline = require('./lib/pipeline')

const isDNI = string => /^([0-9]{8})[a-zA-Z]$/.test(string)

const isName = (string = '') => {
  if (!string) return false

  string = string.trim()

  if (!string) return false
  if (string.length < 4) return false
  return true
}

const getCustomer = () => fetch('https://cliengo.free.beeceptor.com/clients/libgot/customers').then(res => res.json())

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 *
 */
module.exports.chatbotWebhook = async event => {
  const { body, getLastMessage } = chatbot(event)

  const conversation = Pipeline(
    /**
     * Saludo y pregusta por el DNI
     */
    ({ request, currentStep, response }, next) => {
      if (isDNI(request.collected_data.custom.dni)) return next()
      if (currentStep >= 0) return next()

      response.custom.current_step = 1
      response.response.text = [`Hola, soy ${request.chatbotName}`, 'Por favor, ingresa tu DNI']
    },
    /**
     *  Valida el DNI, si es valido pregunta por el nombre y apellido
     */
    ({ request, currentStep, response }, next) => {
      if (isDNI(request.collected_data.custom.dni)) return next()
      if (currentStep > 1) return next()

      const { text: lastMessage } = getLastMessage()

      if (isDNI(lastMessage)) {
        // TODO: Write in DB

        response.custom.current_step = 2
        response.custom.dni = lastMessage
        response.response.text = ['Gracias', 'Ahora dime tu nombre y apellido por favor']
      } else {
        response.response.text = ['Por favor ingresa un DNI válido']
      }
    },
    /**
     *  Valida el nombre y apellido
     */
    async ({ request, currentStep, response }, next) => {
      if (isName(request.collected_data.custom.first_name) && isName(request.collected_data.custom.last_name))
        return next()
      if (currentStep > 2) return next()

      const { text: lastMessage } = getLastMessage()
      const [firstName, lastName] = lastMessage
        .split(' ')
        .map(s => s.trim())
        .filter(s => !!s)

      if (isName(firstName) && isName(lastName)) {
        response.custom.current_step = 3
        response.custom.first_name = firstName
        response.custom.last_name = lastName

        // Ir al siguente paso
        return next()
      } else {
        response.response.text = ['Por favor dime tu nombre y apellido']
      }
    },
    /**
     *  Response con el estado de cuenta y con el listado de ofertas
     */
    async ({ request, currentStep, response }, next) => {
      if (request.collected_data.custom.offer_id) return next()
      if (currentStep > 3) return next()

      const customer = await getCustomer()
      const { prestamos = [], ofertas = [] } = customer

      response.response.text = ['Situación de crédito actual:', ...prestamos.map(o => o.estado_prestamo)]

      if (ofertas.length) {
        response.response.text.push('Ofertas con detalles de cuotas:')
        response.response.response_type = 'LIST'
        response.response.response_options = [...ofertas.map((o, index) => `#${index + 1} - ${o.oferta}`)]
      } else {
        // TODO: Handle else case
      }

      response.custom.current_step = 4
    },
    /**
     *  Valida oferta seleccionada
     */
    async ({ request, currentStep, response }, next) => {
      if (request.collected_data.custom.offer_id) return next()
      if (currentStep > 4) return next()

      const customer = await getCustomer()
      const { ofertas = [] } = customer
      const { text: lastMessage } = getLastMessage()

      if (/#\d\s-/.test(lastMessage)) {
        // Extrae el index de la oferta de la respuesta
        const offerIndex = Number(
          lastMessage.trim().slice(lastMessage.indexOf('#') + 1, lastMessage.indexOf(' ', lastMessage.indexOf('#') + 1))
        )
        const { offerId } = ofertas[offerIndex] || {}

        if (offerId) {
          response.custom.current_step = 5
          response.custom.offer_id = offerId
          response.response.text = ['Indicar CBU']
          return
        }
      }

      console.log('ERROR: offerId not found:')
      console.log('lastMessage :>>', lastMessage)
      console.log('ofertas :>>', ofertas)
      console.log('TEST :>>', /^#\d\s-/.test(lastMessage))
      console.log('offerIndex: >>', Number(lastMessage.trim().slice(1, lastMessage.indexOf(' '))))

      response.response.text = ['Por favor elige una de nuestras ofertas:']
      response.response.response_type = 'LIST'
      response.response.response_options = [...ofertas.map((o, index) => `#${index + 1} - ${o.oferta}`)]
    },
    /**
     * Tomar CBU
     */
    async ({ request, currentStep, response }, next) => {
      if (request.collected_data.custom.cbu) return next()
      if (currentStep > 5) return next()

      const { text: lastMessage = '' } = getLastMessage()

      console.log('FO :>>', lastMessage)

      if (lastMessage.trim()) {
        response.custom.current_step = 6
        response.custom.cbu = lastMessage.trim()
        next()
      } else {
        response.response.text = ['Por favor ingresa tu CBU']
      }
    },
    async ({ request, currentStep, response }, next) => {
      if (currentStep > 6) return next()

      const cbu = response.custom.cbu || request.collected_data.custom.cbu

      response.custom.current_step = 7
      response.response.text = [`Este es tu CBU? "${cbu}"`]
      response.response.response_type = 'LIST'
      response.response.response_options = ['Si', 'No']
    },

    async ({ request, currentStep, response }, next) => {
      if (currentStep > 7) return next()

      const { text: lastMessage = '' } = getLastMessage()
      const { cbu } = request.collected_data.custom

      if (lastMessage.trim().toUpperCase() === 'SI') {
        response.custom.current_step = 8

        // TODO: Hacer algo con el CBU
        console.log('cbu :>>', cbu)
        response.response.text = ['Detalle de la operación', 'Mensaje de fin']
      } else {
        response.custom.current_step = 5
        response.response.text = ['Por favor ingresa tu CBU']
        response.custom.cbu = null
      }
    }
  )

  const response = {
    custom: body.collected_data?.custom || {},
    response: {
      text: [],
      stopChat: true,
    },
  }

  await conversation.execute({
    request: body,
    currentStep: Number(body.collected_data?.custom?.current_step) || -1,
    response,
  })

  console.log(response)

  return {
    statusCode: 200,
    body: JSON.stringify(response, null, 2),
  }
}

/**
 * Endpoint para simplificar la configuración de global_fulfillment_url que es la url donde se recibirán los webhooks de un determinado chatbot
 *
 */
module.exports.chatbotConfig = async event => {
  const API_KEY = 'd53ab56d-7b4a-491b-b8c3-41e260e991f1'
  const websiteId = process.env.WEBSITE_ID || '60e5b8c52c6d8d0026157734'
  const global_fulfillment_url = process.env.FULLFILMENT_URL || 'http://1d1c-190-205-96-244.ngrok.io/dev/chatbotWebhook'
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
      body: JSON.stringify({ global_fulfillment_url }),
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
