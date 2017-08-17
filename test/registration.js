const test = require('ava')
const superagent = require('superagent')
const baseUrl = `http://127.0.0.1:${process.env.MICROSERVICE_PORT || 3000}`

const env = {
  JWT_ALGORITHM: 'HS256',
  JWT_SECRET: 'shhhh'
}
require('../').startServer(env) // starts the app server

test('GET /auth/register', t => {
  t.plan(2)
  return superagent.get(`${baseUrl}/auth/register`)
    .then((response) => {
      t.is(response.statusCode, 200)
      t.truthy(response.text.indexOf('<html') >= 0)
    })
    .catch((error) => {
      console.log('error:', error)
      t.falsy(error)
    })
})

const r = Math.ceil(Math.random()*Number.MAX_SAFE_INTEGER)

test('POST /auth/register', t => {
  return superagent.post(`${baseUrl}/auth/register`)
    .send(`firstName=Ian`)
    .send(`lastName=McDevitt`)
    .send(`username=ian`)
    .send(`email=ian%2B${r}@clevertech.biz`)
    .send(`password=thisistechnicallyapassword`)
    .set('user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',)
    .set('connection', 'keep-alive')
    .then((response) => {
      t.truthy(response.text.indexOf('<p>Before signing in, please confirm your email address.') >= 0)
    })
    .catch((error) => {
      t.falsy(error)
    })
})
