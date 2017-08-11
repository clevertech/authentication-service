#!/usr/bin/env node

const querystring = require('querystring')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const ejs = require('ejs')
const emailService = require('pnp-email-service')
const mediaService = require('pnp-media-service')
const fetch = require('node-fetch')
const useragent = require('useragent')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const i18n = require('i18n')
i18n.configure({
  locales: ['en'],
  defaultLocale: 'en',
  directory: path.join(__dirname, '/locales'),
  updateFiles: false
})

const providers = {
  google: require('./providers/google'),
  twitter: require('./providers/twitter'),
  facebook: require('./providers/facebook'),
  linkedin: require('./providers/linkedin'),
  github: require('./providers/github')
}

const qrForUrl = url => new Promise((resolve, reject) => {
  QRCode.toDataURL(url, (err, qrCode) => err ? reject(err) : resolve(qrCode))
})

exports.createJwtClient = (config = {}) => {
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  return jwt
}

exports.createRouter = (config = {}) => {
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  const crypto = require('./utils/crypto')(env)
  const validations = require('./validations')(env)
  const recaptcha = require('./recaptcha')(env, fetch)
  const database = require('./database/adapter')(env)
  const emailServer = emailService.startServer(config)
  const smsService = require('./sms/twilio')(env, fetch)
  const sendEmail = (emailOptions, templateName, templateOptions) => {
    const port = emailServer.address().port
    const url = `http://0.0.0.0:${port}/email/send`
    const body = { templateName, emailOptions, templateOptions }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
    // .then(res => res.text()).then(text => console.log(text))
    .catch((err) => {
      winston.error(err)
      return Promise.reject(err)
    })
  }
  const mediaClient = mediaService.createServerAndClient({})
  const users = require('./services/users')(env, jwt, database, sendEmail, mediaClient, validations)

  database.init().catch(err => console.error(err.stack))

  const views = env('VIEWS_DIR') || path.join(__dirname, '..', 'views')
  const baseUrl = env('BASE_URL')
  const projectName = env('PROJECT_NAME')
  const redirectUrl = env('REDIRECT_URL')
  const stylesheet = env('STYLESHEET', baseUrl + '/stylesheet.css')
  const emailConfirmation = env('EMAIL_CONFIRMATION', 'true') === 'true'
  const emailConfirmationProviders = emailConfirmation && env('EMAIL_CONFIRMATION_PROVIDERS', 'true') === 'true'
  const redirect = (user) =>
    jwt.sign({ user }, { expiresIn: '1h' }).then(token => redirectUrl + '?jwt=' + token)

  const signupRedirect = (user) =>
    jwt.sign({ user }, { expiresIn: '1h' }).then(token => baseUrl + '/register?provider=' + token)

  const redirectToDone = (res, qs) => {
    res.redirect(baseUrl + '/done?' + querystring.stringify(qs))
  }

  const redirectTwofactor = (user) => {
    if (user.twofactor) {
      return Promise.resolve()
        .then(() => {
          if (user.twofactor === 'sms') {
            return crypto.decrypt(user.twofactorSecret)
              .then(secret => {
                const phone = user.twofactorPhone
                const token = speakeasy.totp({ secret, encoding: 'base32' })
                return smsService.send(phone, `${token} is your ${projectName} verification code`)
              })
          }
        })
        .then(() => {
          return jwt.sign({ userId: user.id }, { expiresIn: '1h' }).then(token => baseUrl + '/twofactor?jwt=' + token)
        })
    }
    return redirect(user).then(url => url)
  }

  const providerSignup = (user, res) => {
    return database.findUserByProviderLogin(user.login)
      .then(existingUser => {
        if (existingUser) {
          if (emailConfirmationProviders && !existingUser.emailConfirmed) {
            return baseUrl + '/signin?error=EMAIL_CONFIRMATION_REQUIRED'
          }
          return redirectTwofactor(existingUser)
        }
        return signupRedirect(user)
      })
      .then(url => res.redirect(url))
  }

  const router = express.Router()
  router.use(bodyParser.urlencoded({ extended: false }))
  router.use(recaptcha.middleware())
  router.use(i18n.init)

  const availableProviders = Object.keys(providers).reduce((obj, provider) => {
    obj[provider] = providers[provider](router, providerSignup, env, database)
    return obj
  }, {})
  const someProvidersAvailable = Object.keys(availableProviders)
    .map(key => availableProviders[key])
    .filter(Boolean).length > 0

  const client = req => {
    const agent = useragent.lookup(req.headers['user-agent'])
    return {
      agent: agent.toAgent(),
      os: agent.os.toString(),
      device: agent.device.toString(),
      ip: req.ip
    }
  }

  const authenticated = (req, res, next) => {
    const token = req.query.jwt || req.body.jwt
    jwt.verify(token)
      .then(data => {
        return database.findUserById(data.userId || data.user.id)
          .then(user => {
            if (!user) return Promise.reject(new Error('USER_NOT_FOUND'))
            req.user = user
            req.jwt = token
            req.jwtData = data
            next()
          })
      })
      .catch(err => {
        console.error(err.stack)
        res.render('Error')
      })
  }

  const renderFile = (req, res, next, file, data) => {
    const { baseUrl, query } = req
    const { error, info, provider, token } = query
    const filename = path.join(views, file)
    const allData = Object.assign({
      projectName,
      baseUrl,
      error,
      info,
      provider,
      token,
      stylesheet,
      forms: validations.forms(provider),
      recaptchaSiteKey: recaptcha.siteKey(),
      __: res.__
    }, data)
    const options = {}
    ejs.renderFile(filename, allData, options, (err, html) => {
      err ? next(err) : res.type('html').send(html)
    })
  }

  const renderIndex = (req, res, next, data) => {
    const { query } = req
    const { provider } = query
    const { signupFields, termsAndConditions } = validations
    const imageField = signupFields.find(field => field.name === 'image')
    Promise.resolve()
      .then(() => provider ? jwt.verify(provider) : {})
      .then(userData => {
        const allData = Object.assign({
          someProvidersAvailable,
          availableProviders,
          termsAndConditions,
          signupFields,
          imageField,
          userInfo: userData.user || {}
        }, data)
        renderFile(req, res, next, 'index.html', allData)
      })
      .catch(next)
  }

  router.get('/', (req, res, next) => {
    res.redirect(req.baseUrl + '/signin')
  })

  router.get('/signin', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Sign In',
      action: 'signin'
    })
  })

  router.post('/signin', (req, res, next) => {
    const { email, password } = req.body
    users.login(email, password, client(req))
      .then(user => {
        if (emailConfirmation && !user.emailConfirmed) {
          return res.redirect(req.baseUrl + '/signin?error=EMAIL_CONFIRMATION_REQUIRED')
        }
        return redirectTwofactor(user)
          .then(url => res.redirect(url))
      })
      .catch(next)
  })

  router.get('/register', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Register',
      action: 'register'
    })
  })

  router.post('/register', (req, res, next) => {
    const { body } = req
    users.register(body, client(req))
      .then(user => {
        if (emailConfirmation && user.password) {
          return res.redirect(req.baseUrl + '/signin?info=EMAIL_CONFIRMATION_SENT')
        }
        if (emailConfirmationProviders && !user.password) {
          return res.redirect(req.baseUrl + '/signin?info=EMAIL_CONFIRMATION_SENT')
        }
        return redirect(user)
          .then(url => res.redirect(url))
      })
      .catch(next)
  })

  router.get('/resetpassword', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Reset your password',
      action: 'resetpassword'
    })
  })

  router.post('/resetpassword', (req, res, next) => {
    const { email } = req.body
    users.forgotPassword(email, client(req))
      .then(() => {
        res.redirect(req.baseUrl + req.path + '?info=RESET_LINK_SENT')
      })
      .catch(next)
  })

  router.get('/reset', (req, res, next) => {
    const { emailConfirmationToken: token } = req.query
    renderIndex(req, res, next, {
      title: 'Reset your password',
      action: 'reset',
      token
    })
  })

  router.post('/reset', (req, res, next) => {
    const { token, password } = req.body
    users.resetPassword(token, password, client(req))
      .then(() => {
        res.redirect(req.baseUrl + '/signin?info=PASSWORD_RESET')
      })
      .catch(next)
  })

  router.get('/changepassword', authenticated, (req, res, next) => {
    const { jwt } = req
    renderIndex(req, res, next, {
      title: 'Change your password',
      action: 'changepassword',
      jwt
    })
  })

  router.post('/changepassword', authenticated, (req, res, next) => {
    const { user } = req
    const { oldPassword, newPassword } = req.body
    users.changePassword(user.id, oldPassword, newPassword)
      .then(() => {
        redirectToDone(res, {
          info: 'PASSWORD_CHANGED_SUCCESSFULLY'
        })
      })
      .catch(next)
  })

  router.get('/changeemail', authenticated, (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Change your email address',
      action: 'changeemail'
    })
  })

  router.post('/changeemail', authenticated, (req, res, next) => {
    res.send('WIP')
  })

  router.get('/confirm', (req, res, next) => {
    const { emailConfirmationToken } = req.query
    users.confirmEmail(emailConfirmationToken)
      .then(() => {
        res.redirect(req.baseUrl + '/signin?info=EMAIL_CONFIRMED')
      })
      .catch(next)
  })

  const normalizePhone = str => {
    const match = str.match(/\d+/g)
    if (!match) return ''
    str = match.join('')
    if (str.startsWith('00')) str = '+' + str.substring(2)
    else if (!str.startsWith('+')) str = '+' + str
    return str
  }

  const obfuscatePhone = phone => {
    if (!phone) return ''
    return phone.substring(0, 4) +
      phone.substring(4, phone.length - 4).replace(/\d/g, '*') +
      phone.substring(phone.length - 4)
  }

  const renderConfigureTwofactor = (req, res, next, data) => {
    const { user, jwt } = req
    const { twofactorSecret } = req.jwtData
    const url = speakeasy.otpauthURL({
      secret: twofactorSecret,
      encoding: 'base32',
      label: user.email,
      issuer: projectName
    })
    qrForUrl(url)
      .then(qrCode => {
        renderFile(req, res, next, 'twofactorconfigure.html', Object.assign({
          qrCode,
          jwt,
          user,
          obfuscatePhone,
          smsService: !!smsService
        }, data))
      })
      .catch(next)
  }

  router.get('/configuretwofactor', authenticated, (req, res, next) => {
    const { user } = req
    const secret = speakeasy.generateSecret({ name: user.email })
    const jwtData = { userId: user.id, twofactorSecret: secret.base32 }
    jwt.sign(jwtData, { expiresIn: '1h' })
      .then((jwt) => {
        req.jwtData = jwtData
        req.jwt = jwt
        renderConfigureTwofactor(req, res, next, {
          title: 'Configure Two-Factor Authentication',
          action: 'configuretwofactor'
        })
      })
      .catch(next)
  })

  router.get('/configuretwofactorqr', authenticated, (req, res, next) => {
    renderConfigureTwofactor(req, res, next, {
      title: 'Configure Two-Factor Authentication',
      action: 'configuretwofactorqr'
    })
  })

  router.get('/configuretwofactorsms', authenticated, (req, res, next) => {
    renderConfigureTwofactor(req, res, next, {
      title: 'Add SMS Authentication',
      action: 'configuretwofactorsms'
    })
  })

  router.post('/configuretwofactorqr', authenticated, (req, res, next) => {
    const { user, jwtData } = req
    const { twofactorSecret: secret } = jwtData
    const { token } = req.body

    const tokenValidates = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 6
    })
    if (tokenValidates) {
      crypto.encrypt(secret)
        .then(encryptedSecret => {
          return database.updateUser({
            id: user.id,
            twofactor: 'qr',
            twofactorSecret: encryptedSecret,
            twofactorPhone: null
          })
        })
        .then(() => {
          redirectToDone(res, { info: 'TWO_FACTOR_AUTHENTICATION_CONFIGURATION_SUCCESS' })
        })
        .catch(next)
    } else {
      res.redirect(baseUrl + '/configuretwofactorsms?' + querystring.stringify({
        error: 'INVALID_AUTHENTICATION_CODE',
        jwt: req.jwt
      }))
    }
  })

  router.post('/configuretwofactorsms', authenticated, (req, res, next) => {
    const { user, jwtData } = req
    const { twofactorSecret: secret } = jwtData
    const phone = normalizePhone(req.body.phone) // TODO: handle error if missing
    const token = speakeasy.totp({ secret, encoding: 'base32' })

    // send sms
    smsService.send(phone, `${token} is your ${projectName} verification code`)
      .then(() => {
        return jwt.sign({ twofactorSecret: secret, phone, userId: user.id })
      })
      .then(jwt => {
        res.redirect(baseUrl + '/configuretwofactorsmsconfirm?jwt=' + jwt)
      })
      .catch(next)
  })

  router.get('/configuretwofactorsmsconfirm', authenticated, (req, res, next) => {
    const { jwtData } = req
    const { phone } = jwtData
    renderConfigureTwofactor(req, res, next, {
      title: 'Add SMS Authentication',
      action: 'configuretwofactorsmsconfirm',
      phone
    })
  })

  router.post('/configuretwofactorsmsconfirm', authenticated, (req, res, next) => {
    const { user, jwtData } = req
    const { twofactorSecret: secret, phone } = jwtData
    const { token } = req.body

    const tokenValidates = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 6
    })
    if (tokenValidates) {
      crypto.encrypt(secret)
        .then(encryptedSecret => {
          return database.updateUser({
            id: user.id,
            twofactor: 'sms',
            twofactorSecret: encryptedSecret,
            twofactorPhone: phone
          })
        })
        .then(() => {
          redirectToDone(res, { info: 'TWO_FACTOR_AUTHENTICATION_CONFIGURATION_SUCCESS' })
        })
        .catch(next)
    } else {
      res.redirect(baseUrl + '/configuretwofactorsms?' + querystring.stringify({
        error: 'INVALID_AUTHENTICATION_CODE',
        jwt: req.jwt
      }))
    }
  })

  router.get('/configuretwofactordisable', authenticated, (req, res, next) => {
    renderConfigureTwofactor(req, res, next, {
      title: 'Disable two factor authentication',
      action: 'configuretwofactordisable'
    })
  })

  router.post('/configuretwofactordisable', authenticated, (req, res, next) => {
    const { user } = req
    return database.updateUser({
      id: user.id,
      twofactor: null,
      twofactorSecret: null,
      twofactorPhone: null
    })
    .then(() => {
      redirectToDone(res, { info: 'TWO_FACTOR_AUTHENTICATION_DISABLED' })
    })
    .catch(next)
  })

  router.get('/twofactor', authenticated, (req, res, next) => {
    const { user, jwt } = req
    renderFile(req, res, next, 'twofactor.html', {
      title: 'Enter an authentication code',
      action: 'twofactor',
      obfuscatePhone,
      user,
      jwt
    })
  })

  router.post('/twofactor', authenticated, (req, res, next) => {
    const { user } = req
    const { token } = req.body
    crypto.decrypt(user.twofactorSecret)
      .then(secret => {
        const tokenValidates = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: 6
        })
        if (tokenValidates) {
          return redirect(user)
            .then(url => res.redirect(url))
        } else {
          return Promise.reject(new Error('INVALID_TOKEN'))
        }
      })
      .catch(next)
  })

  router.get('/done', (req, res, next) => {
    renderFile(req, res, next, 'done.html', { redirectUrl, title: '' })
  })

  const staticFiles = [
    'stylesheet.css',
    'jquery.cropit.js'
  ]

  for (const staticFile of staticFiles) {
    const fullPath = path.join(__dirname, '..', 'static', staticFile)
    router.get('/' + staticFile, (req, res, next) => {
      res.sendFile(fullPath, {}, err => err && next(err))
    })
  }

  router.use((err, req, res, next) => {
    console.error(err.stack)
    if (!err.handled) return redirectToDone(res, { error: 'INTERNAL_ERROR' })
    const jwt = req.query.jwt || req.body.jwt
    const index = err.message.indexOf(':')
    const error = err.message.substring(0, index >= 0 ? index : undefined)
    const qs = querystring.stringify(Object.assign({ jwt }, { error }))
    res.redirect(req.baseUrl + req.path + '?' + qs)
    if (!err.handled) winston.error(err)
  })

  return router
}

exports.startServer = (config, callback) => {
  const env = require('./utils/env')(config)
  const app = express()
  const router = exports.createRouter(config)
  const port = +env('MICROSERVICE_PORT') || 3000

  app.use('/auth', router)

  app.get('/healthz', (req, res) => {
    res.status(200).send({ 'status': 'OK' })
  })

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain')
    const pattern = process.env.ROBOTS_INDEX === 'true' ? '' : ' /'
    res.send(`User-agent: *\nDisallow:${pattern}\n`)
  })

  app.all('*', (req, res, next) => {
    res.redirect('/auth/signin')
  })

  return app.listen(port, callback)
}

if (require.main === module) {
  const server = exports.startServer({}, () => {
    const port = server.address().port
    winston.info(`Listening on port ${port}! Visit http://127.0.0.1:${port}/auth`)
  })
}
