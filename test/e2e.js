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

// Declare some variables for storing things between tests
let _jwtToken
let _2FAtoken
let userId
// Random number so that we don't have unique key collisions
const r = Math.ceil(Math.random()*Number.MAX_SAFE_INTEGER)

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

// Mark that account as having a confirmed email address
// Then sign into that account
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

// Mark the account as having QR twofactor authentication
// Create two factor recovery codes
test.serial('GET /auth/twofactorrecoveryregenerate', t => {
  return db.findUserByEmail(`test+${r}@clevertech.biz`)
  .then(user => {
    userId = user.id
    user.twofactor = 'qr'
    user.twofactorSecret='af4e0e215741432aa2d3aa8fbfa8f15da6ae3b1f90df15498aa471792728e513cd4d3add6235591354ec552336a1292c7b60499a.a3fe82198c6eb29349ffbed773701230.a261c30328f73ec693b9a1b208eb4935'
    return db.updateUser(user)
      .then((success) => {
        t.truthy(success)
        return superagent.get(`${baseUrl}/auth/twofactorrecoveryregenerate?jwt=${_jwtToken}`)
          .then((response) => {
            const body = response.text
            const codeDiv = '<div class="column twofactorcode">'
            const codeDivLocation = body.indexOf(codeDiv)
            // Make sure the div actually showed up in the response
            t.truthy(codeDivLocation >= 0)

            _2FAtoken = body.substring(codeDivLocation+codeDiv.length, codeDivLocation+codeDiv.length+8)
            // Make sure that the recovery code is an 8-character hexadecimal string
            t.truthy(/^[0-9A-F]{8}$/.test(_2FAtoken))
          })
          .catch((error) => {
            t.falsy(error)
          })
      })
  })
})

// Test that we can find the same 2FA codes that were just generated via POST /auth/twofactorrecoverycodes
test.serial('GET /auth/twofactorrecoverycodes', t => {
  return superagent.get(`${baseUrl}/auth/twofactorrecoverycodes?jwt=${_jwtToken}`)
  .then((response) => {
    const body = response.text
    const codeDiv = '<div class="column twofactorcode">'
    const codeDivLocation = body.indexOf(codeDiv)
    // Make sure the div actually showed up in the response
    t.truthy(codeDivLocation >= 0)

    const new2FAtoken = body.substring(codeDivLocation+codeDiv.length, codeDivLocation+codeDiv.length+8)
    // Make sure that the recovery code is an 8-character hexadecimal string
    t.truthy(/^[0-9A-F]{8}$/.test(new2FAtoken))
    t.is(_2FAtoken, new2FAtoken)
  })
  .catch((error) => {
    t.falsy(error)
  })
})

// Confirm that an invalid code _does not_ allow us to sign in
test.serial('POST /auth/twofactor invalid code', t => {
  return superagent.post(`${baseUrl}/auth/signin`)
    .send(`email=test%2B${r}@clevertech.biz`)
    .send('password=thisistechnicallyapassword')
    .then((response) => {
      t.truthy(response.redirects)
      t.truthy(response.redirects[0])
      const redirect = response.redirects[0]
      // Store the new JWT
      _jwtToken = redirect.substring(redirect.indexOf('?jwt=')+5, redirect.length)
      // Confirm that the JWT does indeed contain the data we want
      const decoded = jwt.decode(_jwtToken)
      t.is(decoded.userId, userId)

      return superagent.post(`${baseUrl}/auth/twofactor?jwt=${_jwtToken}`)
        .send(`token=ABCDEFGH`)
        .then((response) => {
          // Confirm that we were redirected
          t.truthy(response.redirects.length)
        })
        .catch((error) => {
          console.log('Error:', error)
          t.truthy(error)
        })
    })
})

// Confirm that the code captured above allows us to sign in
test.serial('POST /auth/twofactor valid code', t => {
  return superagent.post(`${baseUrl}/auth/signin`)
    .send(`email=test%2B${r}@clevertech.biz`)
    .send('password=thisistechnicallyapassword')
    .then((response) => {
      t.truthy(response.redirects)
      t.truthy(response.redirects[0])
      const redirect = response.redirects[0]
      // Store the new JWT
      _jwtToken = redirect.substring(redirect.indexOf('?jwt=')+5, redirect.length)
      // Confirm that the JWT does indeed contain the data we want
      const decoded = jwt.decode(_jwtToken)
      t.is(decoded.userId, userId)

      return superagent.post(`${baseUrl}/auth/twofactor?jwt=${_jwtToken}`)
        .send(`token=${_2FAtoken}`)
        .then((response) => {
          // Confirm that the JWT does indeed contain the data we want
          const decoded = jwt.decode(response.body)
          t.is(decoded.user.email, `test+${r}@clevertech.biz`)
        })
        .catch((error) => {
          t.falsy(error)
        })
    })
})

// Confirm that the code captured above DOES NOT allow us to sign in a second time
test.serial('POST /auth/twofactor duplicate code', t => {
  return superagent.post(`${baseUrl}/auth/signin`)
    .send(`email=test%2B${r}@clevertech.biz`)
    .send('password=thisistechnicallyapassword')
    .then((response) => {
      t.truthy(response.redirects)
      t.truthy(response.redirects[0])
      const redirect = response.redirects[0]
      // Store the new JWT
      _jwtToken = redirect.substring(redirect.indexOf('?jwt=')+5, redirect.length)
      // Confirm that the JWT does indeed contain the data we want
      const decoded = jwt.decode(_jwtToken)
      t.is(decoded.userId, userId)

      return superagent.post(`${baseUrl}/auth/twofactor?jwt=${_jwtToken}`)
        .send(`token=${_2FAtoken}`)
        .then((response) => {
          // Confirm that we were redirected
          t.truthy(response.redirects.length)
        })
        .catch((error) => {
          console.log('Error:', error)
          t.truthy(error)
        })
    })
})
