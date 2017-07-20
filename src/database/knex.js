const knex = require('knex')
const mongodb = require('mongodb')
const constants = require('../constants')
const _ = require('lodash')

module.exports = env => {
  const relationalDB = knex({
    client: env('DATABASE_ENGINE'),
    connection: env('DATABASE_URL'),
    searchPath: 'knex,public'
  })
  const fieldNames = Object.keys(constants.availableFields)

  const last = result => Array.isArray(result) ? result[result.length - 1] : result

  const createTableIfNotExists = (tableName, callback) => {
    callback = _.once(callback)
    return relationalDB.schema.hasTable(tableName)
      .then((tableExists) => {
        return relationalDB.schema.createTableIfNotExists(tableName, table => !tableExists ? callback(table) : void 0)
      })
  }

  const addColumn = (table, columnName, callback) => {
    return relationalDB.schema.hasColumn(table, columnName)
      .then(exists => (!exists && relationalDB.schema.alterTable(table, callback)))
  }

  const createCollectionIfNotExists = (collectionName, callback) => {
    callback = _.once(callback)
  }

  const interface = {
    pg: {
      init() {
        return Promise.resolve()
          .then(() => {
            return relationalDB.schema.hasTable('auth_users').then(tableExists => {
              let p;
              if (!tableExists) {
                p = relationalDB.schema.createTableIfNotExists('auth_users', _.once(table => {
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
                      return relationalDB.schema.hasColumn('auth_users', fieldName).then(exists => {
                        if (!exists) missing.push(fieldName);
                        return missing;
                      });
                    });
                  }, Promise.resolve([]))
                  .then(missing => {
                    if(missing) {
                      return relationalDB.schema.createTableIfNotExists(
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
            return relationalDB.schema.hasTable('auth_providers').then(tableExists => {
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
            return relationalDB.schema.hasTable('auth_sessions').then(tableExists => {
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
        return relationalDB('auth_users').where({ email }).then(last);
      },
      findUserByEmailConfirmationToken(emailConfirmationToken) {
        return relationalDB('auth_users').where({ emailConfirmationToken }).then(last);
      },
      findUserById(id) {
        return relationalDB('auth_users').where({ id }).select().then(last);
      },
      insertUser(user) {
        return relationalDB('auth_users').insert(user);
      },
      updateUser(user) {
        return relationalDB('auth_users').where('id', '=', user.id).update(user);
      },
      insertProvider(provider) {
        return relationalDB('auth_providers').insert(provider);
      },
      findUserByProviderLogin(login) {
        return relationalDB('auth_providers')
          .where({ login })
          .leftJoin('auth_users', 'auth_providers.userId', 'auth_users.id')
          .then(last);
      }
    },
    mongo: {

    }
  };
  interface.mysql = interface.pg;

  return interface[env('DATABASE_ENGINE')];
};
