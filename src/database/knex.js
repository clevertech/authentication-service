const knex = require('knex')
const constants = require('../constants')
const _ = require('lodash')
const uuid = require('uuid/v4')

module.exports = env => {
  const db = knex({
    client: env('DATABASE_ENGINE', 'pg'),
    connection: env('DATABASE_URL'),
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

  const addColumn = (table, columnName, callback) => {
    return db.schema.hasColumn(table, columnName)
      .then(exists => (!exists && db.schema.alterTable(table, callback)))
  }

  const adapter = {
    engine: env('DATABASE_ENGINE'),
    init () {
      return Promise.resolve()
        .then(() => {
          return db.schema.hasTable('auth_users').then(tableExists => {
            let p
            if (!tableExists) {
              p = db.schema.createTableIfNotExists('auth_users', _.once(table => {
                table.uuid('id').primary()
                table.string('email').notNullable().unique()
                table.string('twofactor').nullable()
                table.string('password').nullable()
                table.boolean('emailConfirmed').notNullable().defaultTo(false)
                table.string('emailConfirmationToken').nullable().unique()
                table.string('termsAndConditions').nullable()
                table.timestamps()
              }))
            } else {
              p = Promise.resolve()
            }
            return p.then(function () {
              return fieldNames
                .reduce((prom, fieldName) => {
                  return prom.then(missing => {
                    return db.schema.hasColumn('auth_users', fieldName).then(exists => {
                      if (!exists) missing.push(fieldName)
                      return missing
                    })
                  })
                }, Promise.resolve([]))
                .then(missing => {
                  if (missing) {
                    return db.schema.alterTable(
                      'auth_users',
                      _.once(table => {
                        missing.forEach(fieldName => table.string(fieldName))
                      })
                    )
                  } else {
                    return Promise.resolve()
                  }
                })
            })
          })
        })
        .then(() => {
          return db.schema.hasTable('auth_providers').then(tableExists => {
            return tableExists ? Promise.resolve() : createTableIfNotExists('auth_providers', _.once(table => {
              table.uuid('userId').notNullable()
              table.foreign('userId').references('auth_users.id').onDelete('cascade')
              table.string('login').notNullable().unique()
              table.json('data').notNullable()
              table.timestamps()
            }))
          })
        })
        .then(() => {
          return db.schema.hasTable('auth_sessions').then(tableExists => {
            return tableExists ? Promise.resolve() : createTableIfNotExists('auth_sessions', _.once(table => {
              table.uuid('userId').notNullable()
              table.foreign('userId').references('auth_users.id').onDelete('cascade')
              table.string('userAgent').notNullable()
              table.string('ip').notNullable()
              table.timestamps()
            }))
          })
        })
        .then(() => {
          return db.schema.hasTable('auth_recovery_codes').then(tableExists => {
            return tableExists ? Promise.resolve() : createTableIfNotExists('auth_recovery_codes', _.once(table => {
              table.uuid('userId').notNullable()
              table.foreign('userId').references('auth_users.id').onDelete('cascade')
              table.string('code').notNullable()
              table.boolean('used').notNullable().defaultTo(false)
            }))
          })
        })
        .then(() => addColumn('auth_users', 'twofactorSecret', table => table.string('twofactorSecret')))
        .then(() => addColumn('auth_users', 'twofactorPhone', table => table.string('twofactorPhone')))
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
    findUserByProviderLogin (login) {
      return db('auth_providers')
        .where({ login })
        .leftJoin('auth_users', 'auth_providers.userId', 'auth_users.id')
        .then(last)
    },
    findRecoveryCodesByUserId (userId) {
      return db('auth_recovery_codes')
        .where({ userId })
        .then(codes => codes)
    },
    insertRecoveryCodes (userId, codes) {
      return db.transaction(trx => {
        return db('auth_recovery_codes')
          .where({ userId })
          .del()
          .then(res => {
            return Promise.all(_.map(codes, (code) => {
              return db('auth_recovery_codes')
                .transacting(trx)
                .insert({ userId, code })
            }))
          })
          .then(trx.commit)
          .catch(trx.rollback)
      }).then(() => {
        return Promise.resolve(_.map(codes, code => ({ code, used: false })))
      }).catch((err) => {
        console.error(err)
        return Promise.reject()
      })
    },
    useRecoveryCode (userId, code) {
      return db('auth_recovery_codes')
        .where({ userId, code, used: false })
        .update({ used: true })
        .then(updateCount => updateCount)
    },
    insertUser (user) {
      user = _.omit(user, ['id', '_id']);
      const userId = uuid()
      user.id = userId
      return db('auth_users').insert(user).then(res => {
        return userId
      })
    },
    updateUser (user) {
      return db('auth_users').where('id', '=', user.id).update(user)
    },
    insertProvider (provider) {
      if(env('DATABASE_ENGINE') === 'mysql') {
        provider.data = JSON.stringify(provider.data)
      }
      return db('auth_providers').insert(provider)
    }
  }

  adapter.useRecoveryCode('e4b279f8-6550-472d-ae96-8bacba1b518f', '7e429e32')
  return adapter
}

