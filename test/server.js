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

test('robots.txt', t => {

})

test('get /', t => {

})

test('get /signin', t => {

})

test('post /signin', t => {

})

test('get /register', t => {

})

test('post /register', t => {

})

test('get /resetpassword', t => {

})

test('post /resetpassword', t => {

})

test('get /reset', t => {

})

test('post /reset', t => {

})

test('get /changepassword', t => {

})

test('post /changepassword', t => {

})

test('get /changeemail', t => {

})

test('post /changeemail', t => {

})

test('get /confirm', t => {

})

test('get /configuretwofactor', t => {

})

test('get /configuretwofactorqr', t => {

})

test('get /configuretwofactorsms', t => {

})

test('post /configuretwofactorqr', t => {

})

test('post /configuretwofactorsms', t => {

})

test('get /configuretwofactorsmsconfirm', t => {

})

test('post /configuretwofactorsmsconfirm', t => {

})

test('get /configuretwofactordisable', t => {

})

test('post /configuretwofactordisable', t => {

})

test('get /twofactor', t => {

})

test('post /twofactor', t => {

})

test('get /done', t => {

})

test('get /', t => {

})
