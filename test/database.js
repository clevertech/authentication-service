const test = require('ava')

const databases = [
  {
    human: 'MySQL',
    DATABASE_ENGINE: 'mysql',
    DATABASE_URL: 'mysql://root:root@localhost/auth'
  },{
    human: 'PostgreSQL',
    DATABASE_ENGINE: 'pg',
    DATABASE_URL: 'postgresql://authtest:authtest@localhost/auth'
  },{
    human: 'MongoDB',
    DATABASE_ENGINE: 'mongodb',
    DATABASE_URL: 'mongodb://localhost/auth'
  }
]

for(var database of databases) {

  let env = require('../src/utils/env')(database)
  let adapter = require('../src/database/adapter')(env)
  let randomId = parseInt(Math.random() * Number.MAX_SAFE_INTEGER)
  let userId

  test.serial(`${database.human} init()`, t => {
    t.plan(1)
    return adapter.init()
      .then(res => {
        // We're not concerned with the output; just that it didn't error
        t.pass()
      }).catch(err => {
        t.falsy(res)
      })
  })

  test.serial(`${database.human} insertUser()`, t => {
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

  test.serial(`${database.human} insertProvider()`, t => {
    t.plan(1)
    return adapter.insertProvider({ userId, login: `login${randomId}`, data: {someKey: 'placeholder string'} })
      .then(res => {
        // We're not concerned with the output; just that it didn't error
        t.pass()
      }).catch(err => {
        t.falsy(err)
      })
  })

  test(`${database.human} updateUser()`, t => {
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

  test(`${database.human} findUserByEmail()`, t => {
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

  test(`${database.human} findUserByEmailConfirmationToken()`, t => {
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

  test(`${database.human} findUserById()`, t => {
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

  test(`${database.human} findUserByProviderLogin()`, t => {
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

}
