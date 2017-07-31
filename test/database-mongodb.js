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
      // Capture the inserted ID because Mongo doesn't
      userId = res.insertedIds[0]
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
  return adapter.updateUser({ _id: userId, emailConfirmed: 1, termsAndConditions: 1 })
    .then(updateCount => {
      return adapter.findUserById(userId).then(res => {
        t.is(updateCount, 1)
        t.is(res.emailConfirmed, 1)
        t.is(res.termsAndConditions, 1)
      })
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByEmail()', t => {
  t.plan(3)
  return adapter.findUserByEmail(`test+${randomId}@clevertech.biz`)
    .then(res => {
      t.is(res._id.toString(), `${userId}`)
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
      t.is(res._id.toString(), `${userId}`)
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
      t.is(res._id.toString(), `${userId}`)
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
      t.is(res._id.toString(), `${userId}`)
      t.is(res.email, `test+${randomId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${randomId}`)
    }).catch(err => {
      t.falsy(err)
    })
})
