const test = require('ava')
const env = require('../src/utils/env')({
  JWT_ALGORITHM: 'HS256',
  JWT_SECRET: 'shhhh'
})
const jwt = require('../src/utils/jwt')(env)

test('sign and verify', t => {
  return jwt.sign({ foo: 'bar' })
    .then(response => jwt.verify(response))
    .then(data => {
      t.is(data.foo, 'bar')
    })
})

test('expired sign and verify', t => {
  return jwt.sign({ foo: 'bar' }, { expiresIn: '100' })
    .then(data => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          jwt.verify(data).then(resolve).catch(reject)
        }, 200)
      })
    })
    .then(data => {
      throw new Error('Should have failed')
    })
    .catch(err => {
      t.truthy(err.message.indexOf('jwt expired') >= 0)
    })
})
