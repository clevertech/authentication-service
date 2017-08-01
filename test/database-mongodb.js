const test = require('ava')
const env = require('../src/utils/env')({
  DATABASE_ENGINE: 'mongodb',
  DATABASE_URL: 'mongodb://localhost/auth'
})
const adapter = require('../src/database/adapter')(env)
const randomId = parseInt(Math.random() * Number.MAX_SAFE_INTEGER)
let userId

test.serial('init()', t => {
  t.plan(1)
  return adapter.init()
    .then(res => {
      // We're not concerned with the output; just that it didn't error
      t.pass()
    }).catch(err => {
      t.falsy(res)
    })
})

test.serial('insertUser()', t => {
  t.plan(1)
  return adapter.insertUser({ email: `test+${randomId}@clevertech.biz`, emailConfirmationToken: `token${randomId}`})
    .then(res => {
      // Capture the inserted ID so we can use it later
      userId = res
      // We're not concerned with the output; just that it didn't error
      t.pass()
    }).catch(err => {
      t.falsy(err)
    })
})

test.serial('insertProvider()', t => {
  t.plan(1)
  return adapter.insertProvider({ userId, login: `login${randomId}`, data: {someKey: 'placeholder string'} })
    .then(res => {
      // We're not concerned with the output; just that it didn't error
      t.pass()
    }).catch(err => {
      t.falsy(err)
    })
})

test('updateUser()', t => {
  t.plan(3)
  return adapter.updateUser({ id: userId, emailConfirmed: 1, termsAndConditions: 1 })
    .then(updateCount => {
      return adapter.findUserById(userId).then(res => {
        t.truthy(updateCount)
        t.truthy(res.emailConfirmed)
        t.truthy(res.termsAndConditions)
      })
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByEmail()', t => {
  t.plan(3)
  return adapter.findUserByEmail(`test+${randomId}@clevertech.biz`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${randomId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${randomId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByEmailConfirmationToken()', t => {
  t.plan(3)
  return adapter.findUserByEmailConfirmationToken(`token${randomId}`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${randomId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${randomId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserById()', t => {
  t.plan(3)
  return adapter.findUserById(userId)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${randomId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${randomId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByProviderLogin()', t => {
  t.plan(3)
  return adapter.findUserByProviderLogin(`login${randomId}`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${randomId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${randomId}`)
    }).catch(err => {
      t.falsy(err)
    })
})
