'use strict'
const fetch = require('node-fetch')
const chatbot = require('./lib/chatbot')
const Pipeline = require('./lib/pipeline')

const isDNI = string => /^([0-9]{8})[a-zA-Z]$/.test(string)

const isName = (string = '') => {
  string = string.trim()

  if (!string) return false
  if (string.length < 4) return false
  return true
}

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 *
 */
module.exports.chatbotWebhook = async event => {
  const { body, getLastMessage } = chatbot(event)

  const conversation = Pipeline(
    ({ request, currentStep, response }, next) => {
      if (isDNI(request.collected_data.custom.dni)) return next()
      if (currentStep === 0) return next()

      response.custom.current_step = 0
      response.response.text = [`Hola, soy ${request.chatbotName}`, 'Por favor, ingresa tu DNI']
    },
    ({ request, currentStep, response }, next) => {
      if (isDNI(request.collected_data.custom.dni)) return next()
      if (currentStep === 1) return next()

      const { text: lastMessage } = getLastMessage()

      if (isDNI(lastMessage)) {
        // TODO: Write in DB

        response.custom.current_step = 1
        response.custom.dni = lastMessage
        response.response.text = ['Gracias', 'Ahora dime tu nombre y apellido por favor']
      } else {
        response.response.text = ['Por favor ingresa un DNI válido']
      }
    },
    ({ request, currentStep, response }, next) => {
      if (isName(request.collected_data.custom.first_name) && isName(request.collected_data.custom.last_name))
        return next()
      if (currentStep === 2) return next()

      const { text: lastMessage } = getLastMessage()
      const [firstName, lastName] = lastMessage
        .split(' ')
        .map(s => s.trim())
        .filter(s => !!s)

      if (isName(firstName) && isName(lastName)) {
        // TODO: Write in DB

        response.custom.current_step = 2
        response.custom.first_name = firstName
        response.custom.last_name = lastName
        response.response.text = ['Se esta procesando su solicitud']

        // TODO: Mostart situacion de credito
      } else {
        response.response.text = ['Por favor dime tu nombre y apellido']
      }
    }
  )

  const response = {
    custom: {},
    response: {
      text: [],
      // stopChat: true,
    },
  }

  conversation.execute({
    request: body,
    currentStep: Number(body.collected_data?.custom?.current_step) || -1,
    response,
  })

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
