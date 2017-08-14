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

test('get /', t => {
  return fetch('/', {redirect: 'manual'})
    .then(response => {
      t.is(response.status, 302)
      t.not(response.headers._headers.location[0].indexOf('signin'), -1);
    })
})

test('get /signin', t => {
  return fetch('/signin')
    .then(response => {
      return response.text();
    }).then(function(body) {
      // Test that we're on the Sign In page
      t.not(body.indexOf('Sign In</title>'), -1);
    })
})
