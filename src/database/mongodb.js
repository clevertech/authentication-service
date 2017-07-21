const mongo = require('mongodb')
const _ = require('lodash')

module.exports = env => {
  let mongoClient
  mongo.MongoClient.connect(env('DATABASE_URL'), (err, db) => {
    if (err) {
      console.error(err)
    }
    mongoClient = db
  })

  const dbInterface = {
    init () {
      return Promise.resolve()
    },
    findUserByEmail (email) {
      return mongoClient.collection('auth_users').findOne({ email })
    },
    findUserByEmailConfirmationToken (emailConfirmationToken) {
      return mongoClient.collection('auth_users').findOne({ emailConfirmationToken })
    },
    findUserById (id) {
      return mongoClient.collection('auth_users').findOne({ _id: mongo.ObjectID(id) })
    },
    insertUser (user) {
      return mongoClient.collection('auth_users').insert(user)
    },
    updateUser (user) {
      return mongoClient.collection('auth_users').update({ _id: mongo.ObjectID(user._id) }, {$set: _.omit(user, '_id')})
    },
    insertProvider (provider) {
      return mongoClient.collection('auth_providers').insert(provider)
    },
    findUserByProviderLogin (login) {
      return mongoClient.collection('auth_providers').findOne({ login }).then(function (provider) {
        return mongoClient.collection('auth_users').findOne({ _id: mongo.ObjectID(provider.userId) })
      })
    }
  }

  return dbInterface
}
