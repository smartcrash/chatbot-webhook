'use strict'
const fetch = require('node-fetch')
const chatbot = require('./lib/chatbot')
const Pipeline = require('./lib/pipeline')

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 *
 */
module.exports.chatbotWebhook = async event => {
  const { body } = chatbot(event)

  const conversation = Pipeline(({ request, currentStep, response }, next) => {
    response.custom.current_step = currentStep + 1
    response.response.text = [String(response.custom.current_step)]
  })

  const response = {
    custom: {},
    response: {
      text: [],
      stopChat: true,
    },
  }

  conversation.execute({
    request: body,
    currentStep: body.collected_data?.custom?.current_step || 0,
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
  const global_fulfillment_url =
    'http://5dbf-190-205-96-244.ngrok.io/dev/chatbotWebhook' ||
    'https://bh8nb08hah.execute-api.us-east-1.amazonaws.com/dev/chatbotWebhook'
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
