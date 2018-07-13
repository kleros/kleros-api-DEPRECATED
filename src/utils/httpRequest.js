/**
 * Helper method for sending an http requests.
 * @param {string} verb - HTTP verb to be used in request. E.g. GET, POST, PUT.
 * @param {string} uri - The uri to send the request to.
 * @param {string} body - json string of the body.
 * @returns {Promise} request promise that resolves to the HTTP response.
 */
const httpRequest = (verb, uri, body = null) => {
  const httpRequest = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    try {
      httpRequest.open(verb, uri, true)
      if (body) {
        httpRequest.setRequestHeader(
          'Content-Type',
          'application/json;charset=UTF-8'
        )
      }
      httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === 4) {
          let body = null
          try {
            body = JSON.parse(httpRequest.responseText)
            // eslint-disable-next-line no-unused-vars
          } catch (err) {}
          resolve({
            body: body,
            status: httpRequest.status
          })
        }
      }
      httpRequest.send(body)
    } catch (err) {
      reject(errorConstants.REQUEST_FAILED(err))
    }
  })
}

export default httpRequest
