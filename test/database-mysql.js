const test = require('ava')
const env = require('../src/utils/env')({
  DATABASE_ENGINE: 'mysql',
  DATABASE_URL: 'mysql://root:root@localhost/auth'
})
const adapter = require('../src/database/adapter')(env)
const userId = parseInt(Math.random() * Number.MAX_SAFE_INTEGER)

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
  return adapter.insertUser({ id: userId, email: `test+${userId}@clevertech.biz`, emailConfirmationToken: `token${userId}`})
    .then(res => {
      // We're not concerned with the output; just that it didn't error
      t.pass()
    }).catch(err => {
      t.falsy(err)
    })
})

test.serial('insertProvider()', t => {
  t.plan(1)
  return adapter.insertProvider({ userId, login: `login${userId}`, data: 'placeholder string' })
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
        t.is(updateCount, 1)
        t.is(res.emailConfirmed, 1)
        t.is(res.termsAndConditions, "1")
      })
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByEmail()', t => {
  t.plan(3)
  return adapter.findUserByEmail(`test+${userId}@clevertech.biz`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${userId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${userId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByEmailConfirmationToken()', t => {
  t.plan(3)
  return adapter.findUserByEmailConfirmationToken(`token${userId}`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${userId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${userId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserById()', t => {
  t.plan(3)
  return adapter.findUserById(userId)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${userId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${userId}`)
    }).catch(err => {
      t.falsy(err)
    })
})

test('findUserByProviderLogin()', t => {
  t.plan(4)
  return adapter.findUserByProviderLogin(`login${userId}`)
    .then(res => {
      t.is(res.id, `${userId}`)
      t.is(res.email, `test+${userId}@clevertech.biz`)
      t.is(res.emailConfirmationToken, `token${userId}`)
      t.is(res.login, `login${userId}`)
    }).catch(err => {
      t.falsy(err)
    })
})
