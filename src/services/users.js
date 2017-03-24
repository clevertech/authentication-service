const passwords = require('../utils/passwords')
const querystring = require('querystring')
const uuid = require('uuid/v4')

const random = () => require('crypto').randomBytes(16).toString('hex')
const createToken = () => {
  const token = exports.latestToken = random()
  return token
}

const normalizeEmail = email => email.toLowerCase()

const reject = reason => {
  const err = new Error(reason)
  err.handled = true
  return Promise.reject(err)
}

module.exports = (env, jwt, database, sendEmail) => {
  const baseUrl = env('BASE_URL')
  return {
    login (email, password) {
      email = normalizeEmail(email)
      return database.findUserByEmail(email)
        .then(user => {
          if (!user) return reject('INVALID_CREDENTIALS') // TODO: simulate password check?
          return passwords.check(email, password, user.password)
            .then(ok => ok ? user : reject('INVALID_CREDENTIALS'))
        })
    },
    register (params) {
      const id = uuid()
      const email = normalizeEmail(params.email)
      const emailConfirmationToken = createToken()
      return database.findUserByEmail(email)
        .then(exists => {
          if (exists) return reject('USER_ALREADY_EXISTS')
          // TODO: If not password and not provider
          if (params.password) {
            return passwords.hash(params.email, params.password)
              .then(hash => (params.password = hash))
          }
        })
        .then(() => {
          delete params.provider // TODO: _.pick()
          return database.insertUser(Object.assign({}, params, {
            id,
            emailConfirmationToken
          }))
        })
        .then(() => {
          if (params.provider) {
            return jwt.verify(params.provider)
              .then(userInfo => {
                return database.insertProvider({ userId: id, login: userInfo.login, data: {} })
              })
          }
        })
        .then(() => database.findUserByEmail(email))
        .then(user => {
          sendEmail({ to: email }, 'welcome', {
            user,
            link: process.env.BASE_URL + '/confirm?' + querystring.stringify({ emailConfirmationToken })
          })
          return user
        })
    },
    forgotPassword (email) {
      email = normalizeEmail(email)
      const emailConfirmationToken = createToken()
      return database.findUserByEmail(email)
        .then(user => {
          if (!user) {
            // TODO: just send an email with password-reset-help
            return reject('USER_NOT_FOUND')
          }
          const token = createToken()
          return database.updateUser({ id: user.id, emailConfirmationToken })
            .then(() => {
              sendEmail({ to: user.email }, 'password-reset', {
                link: baseUrl + '/reset?' + querystring.stringify({ token })
              })
            })
        })
    },
    resetPassword (token, password) {
      return database.findUserByEmailConfirmationToken(token)
        .then(user => {
          if (!user) return reject('EMAIL_CONFIRMATION_TOKEN_NOT_FOUND')
          return passwords.hash(user.email, password)
            .then(hash => database.updateUser({
              id: user.id,
              password: hash,
              emailConfirmed: true,
              emailConfirmationToken: null
            }))
        })
    },
    changePassword (id, oldPassword, newPassword) {
      return database.findUserById(id)
        .then(user => {
          if (!user) return reject('USER_NOT_FOUND')
          return passwords.check(user.email, oldPassword, user.password)
            .then(ok => {
              if (!ok) return reject('INVALID_CREDENTIALS')
              return passwords.hash(user.email, newPassword)
            })
            .then(hash => database.updateUser({
              id: user.id,
              password: hash
            }))
        })
    },
    confirmEmail (token, password) {
      return database.findUserByEmailConfirmationToken(token)
        .then(user => {
          if (!user) return reject('EMAIL_CONFIRMATION_TOKEN_NOT_FOUND')
          return database.updateUser({
            id: user.id,
            emailConfirmed: true,
            emailConfirmationToken: null
          })
        })
    }
  }
}
