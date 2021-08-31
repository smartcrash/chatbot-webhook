"use strict";
const fetch = require('node-fetch');
const { OpenAI } = require('openai');
const openai = new OpenAI(process.env.OPENAI_SECRET);



/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 * 
 */ 
module.exports.chatbotWebhookOpenAI = async (event) => {

  let chatLog = JSON.parse(event.body).chat_log

  //console.log(chatLog)
  
  const lastMsg = chatLog[chatLog.length - 1]

  let prompt = 'La siguiente es una conversación con un asistente virtual Argentino. El asistente es útil, creativo, inteligente y muy amigable.\n\n'+
  'IA: Hola, estoy conectada, de qué modo te puedo ayudar? \n'+
  'Humano: ' + lastMsg.text + '\n'+
  'IA:'

  console.log(prompt)

  const completion = await openai.complete('curie', {
    prompt: prompt,
    user: 'user-123',
    stop: ["\n", "<|endoftext|>"],
    max_tokens:32
  });

  console.log(completion)

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        /*
        "name": {
          "value": "Juan Roman",
        },
        "email": {
          "value": "juanroman@diez.com"
        },
        "phone": {
          "national_format": "1234542123",
          "international_format": "12343132112"
        },
        "custom": { 
          "userType": "advanced",
          "thing1": "something",
          "thing2": "something"
        },
        */
        "response": {
            "text": [completion.choices[0].text],
            "response_type": 'LIST',
            "response_options": ["Model A", "Model B"],
            "stopChat": true,
            //"flow": 5
        }
      },
      null,
      2
    ),
  };
};

module.exports.helloOpenAI = async (event) => {
  
  let answer

  answer = await openai.answer({
    documents: ['Al llegar al límite del plan, el chat desaparece visualmente de tu sitio web y te enviaremos un email para notificarte.',
     'Luego de la prueba de 14 días, tu cuenta se moverá automáticamente al plan gratis de hasta 10 contactos por mes.',
     'Puedes comenzar con tu prueba gratis inmediatamente, sin ingresar ningún método de pago.',
     'Tienes 100% control de tu suscripción en todo momento. Desde la sección Cuenta-> Planes puedes cambiar tu plan o cancelarlo en el momento que lo desees.',
     'Aceptamos tarjeta de débito y crédito como medios de pago',
     'El límite de contactos se contabiliza por el total que recibas, sin importar de qué sitio se generen.',
     'Si bien muchas personas mantienen una conversación con el chat, solamente aquellos que dejen un dato de contacto (email y/o telefono) serán contabilizados.',
     'Un Contacto Cliengo es simplemente una persona que visita tu sitio web, interactúa con el chat y deja sus datos de contacto (nombre, teléfono y e-mail), convirtiéndose así en un potencial cliente.'
    ],
    question: 'y cuanto cuesta el servicio?',
    search_model: 'ada',
    model: 'curie',
    examples_context: 'En 2017, la esperanza de vida en Estados Unidos era de 78,6 años.',
    examples: [['¿Cuál es la esperanza de vida humana en los Estados Unidos?','78 años']],
    stop: ["\n", "<|endoftext|>"],
    max_tokens:32
  });


    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          //message: 'Hello Cliengo world!',
          message: JSON.stringify(answer),
        },
        null,
        2
      ),
    };
};