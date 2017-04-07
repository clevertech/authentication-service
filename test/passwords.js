const test = require('ava')
const passwords = require('../src/utils/passwords')

test('success hash and check', t => {
  return passwords.hash('user@example.com', '1234')
    .then(hash => passwords.check('user@example.com', '1234', hash))
    .then(ok => t.true(ok))
})

test('failed hash and check', t => {
  return passwords.hash('user@example.com', '1234')
    .then(hash => passwords.check('user@example.com', '4321', hash))
    .then(ok => t.false(ok))
})
