const test = require('ava')
const fetch = require('./_fetch')

test('root path', t => {
  return fetch('/auth')
    .then(response => {
      t.is(response.status, 200)
      return response.text()
    })
    .then(body => {
      t.truthy(body.indexOf('<html') >= 0)
    })
})

test('healthz', t => {
  return fetch('/healthz')
    .then(response => response.json())
    .then(json => {
      t.deepEqual(json, {'status': 'OK'})
    })
})
