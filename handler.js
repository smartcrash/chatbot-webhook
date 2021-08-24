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


module.exports.chatbotWebhool = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "La hora es " + Date.now,
        input: event,
      },
      null,
      2
    ),
  };
};
