"use strict";

/**
 * Documentación de request y response para chatbot webhooks
 * https://developers.cliengo.com/docs/new-message-webhook#response-json-example
 * 
 */ 
module.exports.chatbotWebhook = async (event) => {
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
            "text": ["La hora es " + new Date().toLocaleString("en-US")],
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


/**
 * Endpoint para simplificar la configuración de global_fulfillment_url que es la url donde se recibirán los webhooks de un determinado chatbot
 * 
 */ 
module.exports.chatbotConfig = async (event) => {

 
  try {
    var jwt = ""
    //busco un JWT para este user represetado por la API_KEY
    await fetch(baseUrl+"/1.0/jwt?api_key="+API_KEY)
    .then(res => res.json())
    .then(json => { jwt = json.jwt })

    //cambio el global_fulfillment_url para seterle el webhook de esta app
    await fetch(baseUrl+"/1.0/projects/"+websiteId+"/chatbots/chatId", {
      headers: {cookie: 'jwt='+jwt, 'Content-Type': 'application/json'},
      method: 'PATCH',
      body: JSON.stringify({
        global_fulfillment_url :  global_fulfillment_url
      })
    })
    .then(res => res.json())
    .then(json => { jwt = json })

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
    };
    
  } catch (error) {
    console.log(error)
  }

};

module.exports.hello = async (event) => {
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: 'Hello Cliengo world!',
        },
        null,
        2
      ),
    };
};