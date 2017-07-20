const knex = require('knex')
const _MongoClient = require('mongodb').MongoClient
const constants = require('../constants')
const _ = require('lodash')

module.exports = env => {
  let _RelationalClient;
  if(['mysql', 'pg'].indexOf(env('DATABASE_ENGINE')) !== -1) {
    _RelationalClient = knex({ 
      client: env('DATABASE_ENGINE'),
      connection: env('DATABASE_URL'),
      searchPath: 'knex,public'
    })
  } else {
    _MongoClient.connect(env('DATABASE_URL'))
  }

  const fieldNames = Object.keys(constants.availableFields)

  const last = result => Array.isArray(result) ? result[result.length - 1] : result

  const createTableIfNotExists = (tableName, callback) => {
    callback = _.once(callback)
    return _RelationalClient.schema.hasTable(tableName)
      .then((tableExists) => {
        return _RelationalClient.schema.createTableIfNotExists(tableName, table => !tableExists ? callback(table) : void 0)
      })
  }

  const addColumn = (table, columnName, callback) => {
    return _RelationalClient.schema.hasColumn(table, columnName)
      .then(exists => (!exists && _RelationalClient.schema.alterTable(table, callback)))
  }

  const interface = {
    pg: {
      init() {
        return Promise.resolve()
          .then(() => {
            return _RelationalClient.schema.hasTable('auth_users').then(tableExists => {
              let p;
              if (!tableExists) {
                p = _RelationalClient.schema.createTableIfNotExists('auth_users', _.once(table => {
                  table.uuid('id').primary();
                  table.string('email').notNullable().unique();
                  table.string('twofactor').nullable();
                  table.string('password').nullable();
                  table.boolean('emailConfirmed').notNullable().defaultTo(false);
                  table.string('emailConfirmationToken').nullable().unique();
                  table.string('termsAndConditions').nullable();
                  table.timestamps();
                }))
              } else {
                p = Promise.resolve()
              }
              return p.then(function() {
                return fieldNames
                  .reduce((prom, fieldName) => {
                    return prom.then(missing => {
                      return _RelationalClient.schema.hasColumn('auth_users', fieldName).then(exists => {
                        if (!exists) missing.push(fieldName);
                        return missing;
                      });
                    });
                  }, Promise.resolve([]))
                  .then(missing => {
                    if(missing) {
                      return _RelationalClient.schema.createTableIfNotExists(
                        'auth_users',
                        _.once(table => {
                          missing.forEach(fieldName => table.string(fieldName));
                        })
                      );
                    } else {
                      return Promise.resolve()
                    }
                  });

              });
            });
          })
          .then(() => {
            return _RelationalClient.schema.hasTable('auth_providers').then(tableExists => {
              return tableExists ? Promise.resolve() : createTableIfNotExists('auth_providers', _.once(table => {
                table.uuid('userId').notNullable();
                table.foreign('userId').references('auth_users.id').onDelete('cascade');
                table.string('login').notNullable().unique();
                table.json('data').notNullable();
                table.timestamps();
              }));
            })
          })
          .then(() => {
            return _RelationalClient.schema.hasTable('auth_sessions').then(tableExists => {
              return tableExists ? Promise.resolve() : createTableIfNotExists('auth_sessions', _.once(table => {
                table.uuid('userId').notNullable();
                table.foreign('userId').references('auth_users.id').onDelete('cascade');
                table.string('userAgent').notNullable();
                table.string('ip').notNullable();
                table.timestamps();
              }));
            })
          })
          .then(() => addColumn('auth_users', 'twofactorSecret', table => table.string('twofactorSecret')))
          .then(() => addColumn('auth_users', 'twofactorPhone', table => table.string('twofactorPhone')));
      },
      findUserByEmail(email) {
        return _RelationalClient('auth_users').where({ email }).then(last);
      },
      findUserByEmailConfirmationToken(emailConfirmationToken) {
        return _RelationalClient('auth_users').where({ emailConfirmationToken }).then(last);
      },
      findUserById(id) {
        return _RelationalClient('auth_users').where({ id }).select().then(last);
      },
      insertUser(user) {
        return _RelationalClient('auth_users').insert(user);
      },
      updateUser(user) {
        return _RelationalClient('auth_users').where('id', '=', user.id).update(user);
      },
      insertProvider(provider) {
        return _RelationalClient('auth_providers').insert(provider);
      },
      findUserByProviderLogin(login) {
        return _RelationalClient('auth_providers')
          .where({ login })
          .leftJoin('auth_users', 'auth_providers.userId', 'auth_users.id')
          .then(last);
      }
    },
    mongodb: {
      init() {
        return Promise.resolve()
      },
      findUserByEmail(email) {
        return Promise.resolve()
      },
      findUserByEmailConfirmationToken(emailConfirmationToken) {
        return Promise.resolve()
      },
      findUserById(id) {
        return Promise.resolve()
      },
      insertUser(user) {
        return Promise.resolve()
      },
      updateUser(user) {
        return Promise.resolve()
      },
      insertProvider(provider) {
        return Promise.resolve()
      },
      findUserByProviderLogin(login) {
        return Promise.resolve()
      }
    }
  };
  interface.mysql = interface.pg;

  return interface[env('DATABASE_ENGINE')];
};
