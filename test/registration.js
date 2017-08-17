const test = require('ava')
const superagent = require('superagent')
const baseUrl = `http://127.0.0.1:${process.env.MICROSERVICE_PORT || 3000}`
const jwt = require('jsonwebtoken')

const settings = {
  JWT_ALGORITHM: 'HS256',
  JWT_SECRET: 'shhhh'
}

const env = require('../src/utils/env')(settings)
const db = require('../src/database/adapter')(env)

require('../').startServer(settings) // starts the app server


test('GET /auth/register', t => {
  t.plan(2)
  return superagent.get(`${baseUrl}/auth/register`)
    .then((response) => {
      t.is(response.statusCode, 200)
      t.truthy(response.text.indexOf('<html') >= 0)
    })
    .catch((error) => {
      t.falsy(error)
    })
})

const r = Math.ceil(Math.random()*Number.MAX_SAFE_INTEGER)

// Create a new account
test.serial('POST /auth/register', t => {
  return superagent.post(`${baseUrl}/auth/register`)
    .send(`firstName=Ian`)
    .send(`lastName=McDevitt`)
    .send(`username=ian`)
    .send(`email=test%2B${r}@clevertech.biz`)
    .send(`password=thisistechnicallyapassword`)
    .then((response) => {
      t.truthy(response.text.indexOf('<p>Before signing in, please confirm your email address.') >= 0)
    })
    .catch((error) => {
      t.falsy(error)
    })
})

// Create a JWT variable, for use with all of our post-signin requests
let token

// Mark that account as having a confirmed email address
// Then sign into that account
test.serial('POST /auth/signin', t => {
  return db.findUserByEmail(`test+${r}@clevertech.biz`)
  .then(user => {
    user.emailConfirmed = true
    return db.updateUser(user)
      .then(success => {
        t.truthy(success)
        return superagent.post(`${baseUrl}/auth/signin`)
          .send(`email=test%2B${r}@clevertech.biz`)
          .send('password=thisistechnicallyapassword')
          .then((response) => {
            // Store the JWT for later use
            token = response.text
            // Confirm that the JWT does indeed contain the data we want
            const decoded = jwt.decode(token)
            t.is(decoded.user.email, `test+${r}@clevertech.biz`)
          })
          .catch((error) => {
            t.falsy(error)
          })
      })
  })
})
