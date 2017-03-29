const knex = require('knex')
const constants = require('../constants')
const _ = require('lodash')

module.exports = env => {
  const db = knex({
    client: 'pg',
    connection: env('PG_CONNECTION_STRING'), // process.env.PG_CONNECTION_STRING,
    searchPath: 'knex,public'
  })
  const fieldNames = Object.keys(constants.availableFields)

  const last = result => Array.isArray(result) ? result[result.length - 1] : result

  const createTableIfNotExists = (tableName, callback) => {
    callback = _.once(callback)
    return db.schema.hasTable(tableName)
      .then((tableExists) => {
        return db.schema.createTableIfNotExists(tableName, table => !tableExists ? callback(table) : void 0)
      })
  }

  return {
    init () {
      return Promise.resolve()
        .then(() => {
          return db.schema.hasTable('auth_users')
            .then((tableExists) => {
              return fieldNames.reduce((prom, fieldName) => {
                return prom.then((missing) => {
                  return db.schema.hasColumn('auth_users', fieldName)
                    .then(exists => {
                      if (!exists) missing.push(fieldName)
                      return missing
                    })
                })
              }, Promise.resolve([]))
              .then((missing) => {
                return db.schema.createTableIfNotExists('auth_users', _.once(table => {
                  if (!tableExists) {
                    table.uuid('id').primary()
                    table.string('email').notNullable().unique()
                    table.string('twofactor').nullable()
                    table.string('password').nullable()
                    table.boolean('emailConfirmed').notNullable().defaultTo(false)
                    table.string('emailConfirmationToken').nullable().unique()
                    table.string('image').nullable()
                    table.string('termsAndConditions').nullable()
                    table.timestamps()
                  }
                  missing.forEach(fieldName => table.string(fieldName))
                }))
              })
            })
        })
        .then(() => {
          return createTableIfNotExists('auth_providers', table => {
            table.uuid('userId').notNullable()
            table.foreign('userId').references('auth_users.id').onDelete('cascade')
            table.string('login').notNullable().unique()
            table.json('data').notNullable()
            table.timestamps()
          })
        })
        .then(() => {
          return createTableIfNotExists('auth_sessions', table => {
            table.uuid('userId').notNullable()
            table.foreign('userId').references('auth_users.id').onDelete('cascade')
            table.string('userAgent').notNullable()
            table.string('ip').notNullable()
            table.timestamps()
          })
        })
    },
    findUserByEmail (email) {
      return db('auth_users').where({ email }).then(last)
    },
    findUserByEmailConfirmationToken (emailConfirmationToken) {
      return db('auth_users').where({ emailConfirmationToken }).then(last)
    },
    findUserById (id) {
      return db('auth_users').where({ id }).select().then(last)
    },
    insertUser (user) {
      return db('auth_users').insert(user)
    },
    updateUser (user) {
      return db('auth_users').where('id', '=', user.id).update(user)
    },
    insertProvider (provider) {
      return db('auth_providers').insert(provider)
    },
    findUserByProviderLogin (login) {
      return db('auth_providers').where({ login })
        .leftJoin('auth_users', 'auth_providers.userId', 'auth_users.id')
        .then(last)
    }
  }
}
