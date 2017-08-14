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

  function sanitizeOutputs(f) {
    return (key) => {
      return f(key).then(res => {
        if (res) {
          res.id = res._id.toString()
          return res
        } else {
          return null
        }
      })
    }
  }

  return {
    engine: env('DATABASE_ENGINE'),
    init () {
      return Promise.resolve()
    },
    findUserByEmail: sanitizeOutputs(function(email) {
      return db.collection('auth_users').findOne({ email })
    }),
    findUserByEmailConfirmationToken: sanitizeOutputs(function(emailConfirmationToken) {
      return db.collection('auth_users').findOne({ emailConfirmationToken })
    }),
    findUserById: sanitizeOutputs(function(id) {
      return db.collection('auth_users').findOne({ _id: mongo.ObjectID(id) })
    }),
    findUserByProviderLogin: sanitizeOutputs(function(login) {
      return db.collection('auth_providers').findOne({ login }).then(function (provider) {
        if(!provider) {
          return Promise.resolve(null)
        }
        return db.collection('auth_users').findOne({ _id: mongo.ObjectID(provider.userId) })
      })
    }),
    findRecoveryCodesByUserId (userId) {
      return db.collection('auth_recovery_codes').find({ userId })
    },
    insertRecoveryCodes (userId, codes) {
      return db.collection('auth_recovery_codes').deleteMany({ userId })
        .then(res => {
          return Promise.all(_.map(codes, (code) => {
            return db.collection('auth_recovery_codes').insertOne({ userId, code, used: false })
          }))
        }).then(() => {
          return Promise.resolve(_.map(codes, code => ({ code, used: false })))
        }).catch((err) => {
          console.error(err)
          return Promise.reject()
        })
    },
    useRecoveryCode (userId, code) {
      return db.collection('auth_recovery_codes')
        .updateOne({ userId, code, used: false }, { used: true })
        .then(res => !!res.result.nModified)
    },
    insertUser (user) {
      return db.collection('auth_users').insert(user).then(res => {
        return res.insertedIds[0]
      })
    },
    updateUser (user) {
      return db.collection('auth_users')
        .update({ _id: mongo.ObjectID(user.id) }, {$set: _.omit(user, 'id')})
        .then(res => {
          return res.result.nModified
        })
    },
    insertProvider (provider) {
      return db.collection('auth_providers').insert(provider).then(res => {
        return res.insertedIds[0]
      })
    }
  }
}
