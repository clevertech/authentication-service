const mongo = require('mongodb');
const _ = require('lodash')

module.exports = env => {
  let _MongoClient;
  mongo.MongoClient.connect(env('DATABASE_URL'), (err, db) => {
    _MongoClient = db;
  })

  const interface = {
    init() {
      return Promise.resolve()
    },
    findUserByEmail(email) {
      return _MongoClient.collection('auth_users').findOne({ email });
    },
    findUserByEmailConfirmationToken(emailConfirmationToken) {
      return _MongoClient.collection('auth_users').findOne({ emailConfirmationToken });
    },
    findUserById(id) {
      return _MongoClient.collection('auth_users').findOne({ _id: mongo.ObjectID(id) });
    },
    insertUser(user) {
      return _MongoClient.collection('auth_users').insert( user );
    },
    updateUser(user) {
      return _MongoClient.collection('auth_users').update({ _id: mongo.ObjectID(user._id) }, {$set: _.omit(user, '_id')});
    },
    insertProvider(provider) {
      return _MongoClient.collection('auth_providers').insert( provider );
    },
    findUserByProviderLogin(login) {
      return _MongoClient.collection('auth_providers').findOne({ login }).then(function(provider) {
        return _MongoClient.collection('auth_users').findOne({ _id: mongo.ObjectID(provider.userId) });
      })
    }
  };

  return interface;
};
