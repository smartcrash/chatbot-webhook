<!--
title: 'AWS Simple HTTP Endpoint example in NodeJS'
description: 'This template demonstrates how to make a simple REST API with Node.js running on AWS Lambda and API Gateway using the traditional Serverless Framework.'
layout: Doc
framework: v2
platform: AWS
language: nodeJS
priority: 1
authorLink: 'https://github.com/serverless'
authorName: 'Serverless, inc.'
authorAvatar: 'https://avatars1.githubusercontent.com/u/13742415?s=200&v=4'
-->

# Serverless Cliengo Chatbot Webhooks

Esta proyecto permite crear webhooks Serverless para Chatbots Cliengo usando AWS, Serverless.com y con Node.js.

Los JSON de request y response y la documentación completa del flujo de trabajo de Chatbots Cliengo está en:
https://developers.cliengo.com/docs/new-message-webhook#response-json-example


### Local development

Para levantar un server localmente emulando API Gateway y Lambda localmente se utiliza el módulo `serverless-offline`. Ejecute el comando:

```bash
serverless plugin install -n serverless-offline
```

Agregará el complemento `serverless-offline` a `devDependencies` en el archivo `package.json` y también lo agregará a `plugins` en `serverless.yml`.

Después de la instalación, puede iniciar el server local con:

```
serverless offline
```


Importante: Los cambios en el código se reflejan automáticamente, a excepción de cambios en el archivo `serverless.yml`



### Ngrok webhooks en local

Con ngrok.com puede recibir webhooks de chatbot en su entorno local.
Una vez que tenga `serverless offline` ejecutándose localmente, puede ejecutar el comando:

```
ngrok http 3000
```

### Configure Webhooks for a Chatbot

Para simplificar la configuración de `global_fulfillment_url` (es la url donde se recibirán los webhooks de un determinado chatbot) existe en este proyecto un endpoint para facilitar su configuración

Configure con los datos de su cuenta de Cliengo en el archivo `handler.js` lo valores:
- **API_KEY**: [cómo obtenerla?](https://help.cliengo.com/hc/es/articles/1260801736410--C%C3%B3mo-obtener-la-API-KEY-de-Cliengo-)
- **websiteId**: Puedes encontrarlo en https://api.cliengo.com/1.0/websites (debes estar logueado con tu cuenta)
- **global_fulfillment_url**: la url de tu webhook


Luego ingresa a http://localhost:3000/dev/chatbotConfig para actualizar el global_fulfillment_url de tu chatbot.


### Probar un Chatbot con webhooks

Una vez configurado los webhooks ingresa a https://lw.stagecliengo.com/?websiteId=`websiteId` para probar tu chatbot y recibir un webhook por cada mensaje en tu server.

![image](https://user-images.githubusercontent.com/660790/130870131-b175fb40-2a42-458a-a5f5-9e1254e7d06e.png)

Esto fue en respuesta a este JSON:

![image](https://user-images.githubusercontent.com/660790/130870251-53d5979e-64a7-48f8-a14b-cc3f48a8ae3e.png)



### Deployment con Serverless

Este ejemplo está diseñado para funcionar con el panel de Serverless Framework que incluye funciones avanzadas como CI / CD, monitoreo, métricas, etc.

```
$ serverless login
$ serverless deploy
```

Para implementar sin el dashboard, deberá eliminar los campos `org` y` app` del `serverless.yml`, y no tendrá que ejecutar` sls login` antes de deployar.


Después de ejecutar la implementación, debería ver un resultado similar a:

```bash
Serverless: Packaging service...
Serverless: Excluding development dependencies...
Serverless: Creating Stack...
Serverless: Checking Stack create progress...
........
Serverless: Stack create finished...
Serverless: Uploading CloudFormation file to S3...
Serverless: Uploading artifacts...
Serverless: Uploading service aws-node-rest-api.zip file to S3 (711.23 KB)...
Serverless: Validating template...
Serverless: Updating Stack...
Serverless: Checking Stack update progress...
.................................
Serverless: Stack update finished...
Service Information
service: aws-node-rest-api
stage: dev
region: us-east-1
stack: aws-node-rest-api-dev
resources: 12
api keys:
  None
endpoints:
  ANY - https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/
functions:
  api: aws-node-rest-api-dev-hello
layers:
  None
```

_Nota_: En su forma actual, después de la implementación, su API es pública y cualquier persona puede invocarla. Para implementaciones de producción, es posible que desee configurar un autorizador. Para obtener detalles sobre cómo hacerlo, consulte [http event docs] (https://www.serverless.com/framework/docs/providers/aws/events/apigateway/).

Después del deploy exitoso, puede llamar a la aplicación a través de:

```bash
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/...
```


### Local development alternative (not recommended)

Alternativamente, también es posible invocar su función usando el siguiente comando:

```bash
serverless invoke local --function hello
```

Lo que debería resultar en una respuesta similar a la siguiente:

```
{
  "statusCode": 200,
  "body": "{\n  \"message\": \"Go Serverless v2.0! Your function executed successfully!\",\n  \"input\": \"\"\n}"
}
```

Para más información sobre las capacidades de `serverless-offline`, consultar (https://github.com/dherault/serverless-offline).
