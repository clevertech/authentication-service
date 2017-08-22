const test = require('ava')
const superagent = require('superagent')
const baseUrl = `http://127.0.0.1:3002`
const jwt = require('jsonwebtoken')

const settings = {
  JWT_ALGORITHM: 'HS256',
  JWT_SECRET: 'shhhh',
  MICROSERVICE_PORT: 3003,
  WHITELISTED_DOMAINS: 'clevertech.biz,clevertech.com'
}

const env = require('../src/utils/env')(settings)
const db = require('../src/database/adapter')(env)

require('../').startServer(settings) // starts the app server

// Declare some variables for storing things between tests
let _jwtToken
// Random number so that we don't have unique key collisions
const r = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER)

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

// Create a new account with first domain
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

// Create a new account with second domain
test.serial('POST /auth/register', t => {
  return superagent.post(`${baseUrl}/auth/register`)
    .send(`firstName=Ian`)
    .send(`lastName=McDevitt`)
    .send(`username=ian`)
    .send(`email=test%2B${r}@clevertech.com`)
    .send(`password=thisistechnicallyapassword`)
    .then((response) => {
      t.truthy(response.text.indexOf('<p>Before signing in, please confirm your email address.') >= 0)
    })
    .catch((error) => {
      t.falsy(error)
    })
})

// Mark that account as having a confirmed email address
// Then sign into that account with first whitelisted domain
test.serial('POST /auth/signin', t => {
  return db.findUserByEmail(`test+${r}@clevertech.biz`)
  .then(user => {
    user.emailConfirmed = true
    return db.updateUser(user)
      .then((success) => {
        t.truthy(success)
        return superagent.post(`${baseUrl}/auth/signin`)
          .send(`email=test%2B${r}@clevertech.biz`)
          .send('password=thisistechnicallyapassword')
          .then((response) => {
            // Store the JWT for later use
            _jwtToken = response.body
            // Confirm that the JWT does indeed contain the data we want
            const decoded = jwt.decode(_jwtToken)
            t.is(decoded.user.email, `test+${r}@clevertech.biz`)
          })
          .catch((error) => {
            t.falsy(error)
          })
      })
  })
})

// Mark that account as having a confirmed email address
// Then sign into that account with second whitelisted domain
test.serial('POST /auth/signin', t => {
  return db.findUserByEmail(`test+${r}@clevertech.com`)
  .then(user => {
    user.emailConfirmed = true
    return db.updateUser(user)
      .then((success) => {
        t.truthy(success)
        return superagent.post(`${baseUrl}/auth/signin`)
          .send(`email=test%2B${r}@clevertech.com`)
          .send('password=thisistechnicallyapassword')
          .then((response) => {
            // Store the JWT for later use
            _jwtToken = response.body
            // Confirm that the JWT does indeed contain the data we want
            const decoded = jwt.decode(_jwtToken)
            t.is(decoded.user.email, `test+${r}@clevertech.com`)
          })
          .catch((error) => {
            t.falsy(error)
          })
      })
  })
})

// Test not being able to sign into an account with a non valid domain
test.serial('POST /auth/signin', t => {
  return superagent.post(`${baseUrl}/auth/signin`)
    .send(`email=test%2B${r}@notclevertech.biz`)
    .send('password=thisistechnicallyapassword')
    .then((response) => {
      // Store the JWT for later use
      _jwtToken = response.body
      // Confirm that the JWT does indeed contain the data we want
      const decoded = jwt.decode(_jwtToken)
      t.is(decoded.user.email, `test+${r}@clevertech.biz`)
    })
    .catch((error) => {
      t.falsy(error)
    })
})
