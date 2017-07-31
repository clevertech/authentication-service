const test = require('ava')
let env
let adapter

test('MySQL Adapter', t => {
  env = require('../src/utils/env')({
    DATABASE_ENGINE: 'mysql',
    DATABASE_URL: 'mysql://root:root@localhost/auth'
  })
  adapter = require('../src/database/adapter')(env)

  adapter.init().then(res => t.truthy(res)).catch(err => t.falsy(res))
})

test('PostgreSQL Adapter', t => {
  env = require('../src/utils/env')({
    DATABASE_ENGINE: 'pg',
    DATABASE_URL: 'postgresql://authtest:authtest@localhost/auth'
  })
  adapter = require('../src/database/adapter')(env)

  adapter.init().then(res => t.truthy(res)).catch(err => t.falsy(res))
})

test('Mongo Adapter', t => {
  env = require('../src/utils/env')({
    DATABASE_ENGINE: 'mongodb',
    DATABASE_URL: 'mongodb://localhost/auth'
  })
  adapter = require('../src/database/adapter')(env)
  
  adapter.init().then(res => t.truthy(res)).catch(err => t.falsy(res))
})
