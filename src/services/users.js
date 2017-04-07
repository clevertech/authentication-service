const passwords = require('../utils/passwords')
const querystring = require('querystring')
const uuid = require('uuid/v4')

let invalidHash = null
passwords.hash('invalidEmail', 'anypasswordyoucanimagine')
  .then(hash => (invalidHash = hash))
  .catch(err => console.error(err))

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

module.exports = (env, jwt, database, sendEmail, validations) => {
  const baseUrl = env('BASE_URL')
  const projectName = env('PROJECT_NAME')
  const random = () => require('crypto').randomBytes(16).toString('hex')
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
        })
    },
    register (params, client) {
      const id = uuid()
      const email = normalizeEmail(params.email)
      return createToken()
        .then(emailConfirmationToken => {
          return database.findUserByEmail(email)
            .then(exists => {
              if (exists) return reject('USER_ALREADY_EXISTS')
              if (!params.password && !params.provider) return reject('PASSWORD_REQUIRED')
              if (params.password) {
                return passwords.hash(params.email, params.password)
                  .then(hash => (params.password = hash))
              }
            })
            .then(() => {
              return (params.provider ? jwt.verify(params.provider) : Promise.resolve())
                .then(userInfo => {
                  const validation = validations.validate(params.provider, 'register', params)
                  if (validation.error) {
                    // Check validation.error.details
                    return reject('FORM_VALIDATION_FAILED')
                  }
                  const user = validation.value
                  return database.insertUser(Object.assign({}, user, {
                    id,
                    emailConfirmationToken
                  }))
                  .then(() => {
                    const user = userInfo && userInfo.user
                    if (user) return database.insertProvider({ userId: id, login: user.login, data: user.data || {} })
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
