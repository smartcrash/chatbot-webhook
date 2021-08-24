"use strict";

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Go Serverless v2.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  };
};

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
            //"stopChat": true,
            //"flow": 5
        }
      },
      null,
      2
    ),
  };
};
