const passwords = require('../utils/passwords')
const querystring = require('querystring')
const async = require('async')
const _ = require('lodash')

const invalidHash = ''
const NUMBER_OF_RECOVERY_CODES = 10

const normalizeEmail = email => email.toLowerCase()

const userName = user => {
  return user.name ||
    user.firstName ||
    user.lastName ||
    user.username ||
    user.email.substring(0, user.email.indexOf('@'))
}

const reject = reason => {
  const err = new Error(reason)
  err.handled = true
  return Promise.reject(err)
}

module.exports = (env, jwt, database, sendEmail, mediaClient, validations) => {
  const baseUrl = env('BASE_URL')
  const projectName = env('PROJECT_NAME')
  const random = (length = 16) => require('crypto').randomBytes(length).toString('hex')
  const createToken = () => {
    return jwt.sign({ code: random() }, { expiresIn: '24h' })
  }

  return {
    login (email, password, client) {
      email = normalizeEmail(email)
      return database.findUserByEmail(email)
        .then(user => {
          // If the user does not exist, use the check function anyways
          // to avoid timing attacks.
          // See https://en.wikipedia.org/wiki/Timing_attack
          return passwords.check(email, password, (user && user.password) || invalidHash)
            .then(ok => user && ok ? user : reject('INVALID_CREDENTIALS'))
            .catch(err => Promise.reject(err))
        })
    },
    createRecoveryCodes (user) {
      const codes = _.map(Array(NUMBER_OF_RECOVERY_CODES), () => random(4))
      return database.insertRecoveryCodes(user.id, codes)
    },
    register (params, client) {
      const email = normalizeEmail(params.email)
      const { provider } = params
      delete params.provider
      if (!params.image) delete params.image // removes empty strings
      return createToken()
        .then(emailConfirmationToken => {
          return database.findUserByEmail(email)
            .then(exists => {
              if (exists) return reject('USER_ALREADY_EXISTS')
              if (!params.password && !provider) return reject('PASSWORD_REQUIRED')
              if (params.password) {
                return passwords.hash(params.email, params.password)
                  .then(hash => (params.password = hash))
              }
            })
            .then(() => {
              return (provider ? jwt.verify(provider) : Promise.resolve())
                .then(userInfo => {
                  const validation = validations.validate(provider, 'register', params)
                  if (validation.error) {
                    return reject('FORM_VALIDATION_FAILED: ' + validation.error.details.map(detail => detail.message).join(', '))
                  }
                  const user = validation.value
                  return Promise.resolve()
                    .then(() => {
                      if (user.image) {
                        return mediaClient.upload({
                          buffer: user.image,
                          destinationPath: 'user-' + Date.now(),
                          imageOperations: {
                            width: 160,
                            height: 160,
                            autoRotate: true,
                            appendExtension: true
                          }
                        })
                        .then((response) => {
                          user.image = response.url
                        })
                      }
                    })
                    .then(() => {
                      return database.insertUser(Object.assign({}, user, {
                        emailConfirmationToken
                      }))
                        .then((id) => {
                          const user = userInfo && userInfo.user
                          if (user) return database.insertProvider({ userId: id, login: user.login, data: user.data || {} })
                        })
                    })
                })
            })
            .then(() => database.findUserByEmail(email))
            .then(user => {
              sendEmail({ to: email }, 'welcome', {
                user,
                name: userName(user),
                client,
                projectName,
                link: baseUrl + '/confirm?' + querystring.stringify({ emailConfirmationToken })
              })
              return user
            })
        })
    },
    forgotPassword (email, client) {
      email = normalizeEmail(email)
      return createToken()
        .then(emailConfirmationToken => {
          return database.findUserByEmail(email)
            .then(user => {
              if (!user) {
                sendEmail({ to: email }, 'password_reset_help', {
                  emailAddress: email,
                  client,
                  projectName,
                  tryDifferentEmailUrl: baseUrl + '/resetpassword'
                })
                return
              }
              return database.updateUser({ id: user.id, emailConfirmationToken })
                .then(() => {
                  sendEmail({ to: user.email }, 'password_reset', {
                    user,
                    name: userName(user),
                    client,
                    projectName,
                    link: baseUrl + '/reset?' + querystring.stringify({ emailConfirmationToken })
                  })
                  // console.log('link', baseUrl + '/reset?' + querystring.stringify({ emailConfirmationToken }))
                })
            })
        })
    },
    resetPassword (token, password, client) {
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
