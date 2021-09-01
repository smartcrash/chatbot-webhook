/**
 * Parses the request object and return chatbot utility functions
 *
 * @param {object} event The reuqest object
 * @returns {object}
 */
module.exports = function chatbot(event) {
  const body = JSON.parse(event.body || '{}')

  function getLastMessage() {
    try {
      return body.chat_log[body.chat_log.length - 1]
    } catch (e) {
      return ''
    }
  }

  return { body, getLastMessage }
}
