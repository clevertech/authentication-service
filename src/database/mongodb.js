const mongo = require('mongodb')
const _ = require('lodash')

module.exports = env => {
  let db
  mongo.MongoClient.connect(env('DATABASE_URL'), (err, connection) => {
    if (err) {
      console.error(err)
    }
    db = connection
  })

  return {
    init () {
      return Promise.resolve()
    },
    findUserByEmail (email) {
      return db.collection('auth_users').findOne({ email })
    },
    findUserByEmailConfirmationToken (emailConfirmationToken) {
      return db.collection('auth_users').findOne({ emailConfirmationToken })
    },
    findUserById (id) {
      return db.collection('auth_users').findOne({ _id: mongo.ObjectID(id) })
    },
    insertUser (user) {
      return db.collection('auth_users').insert(user)
    },
    updateUser (user) {
      return db.collection('auth_users').update({ _id: mongo.ObjectID(user._id) }, {$set: _.omit(user, '_id')})
    },
    insertProvider (provider) {
      return db.collection('auth_providers').insert(provider)
    },
    findUserByProviderLogin (login) {
      return db.collection('auth_providers').findOne({ login }).then(function (provider) {
        return db.collection('auth_users').findOne({ _id: mongo.ObjectID(provider.userId) })
      })
    }
  }
}
