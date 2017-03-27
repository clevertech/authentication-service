const fetch = require('node-fetch')
const querystring = require('querystring')
const baseURL = `http://127.0.0.1:${process.env.PORT}`

require('../').startServer() // starts the app server

module.exports = (path, options) => {
  const body = options && options.body
  if (Object.prototype.toString.call(body) === '[object Object]') {
    options.body = querystring.stringify(body)
    options.headers = Object.assign({}, options.headers, {
      'Content-Type': 'application/x-www-form-urlencoded'
    })
  }
  return fetch(baseURL + path, options)
}
