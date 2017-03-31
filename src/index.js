const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const ejs = require('ejs')
const emailService = require('pnp-email-service')
const fetch = require('node-fetch')
const useragent = require('useragent')
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

exports.createJwtClient = (config = {}) => {
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  return jwt
}

exports.createRouter = (config = {}) => {
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  const validations = require('./validations')(env)
  const database = require('./database/knex')(env)
  const emailServer = emailService.startServer(config)
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
  const users = require('./services/users')(env, jwt, database, sendEmail)

  database.init()

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

  const providerSignup = user => {
    return database.findUserByProviderLogin(user.login)
      .then(existingUser => {
        if (existingUser) {
          if (!emailConfirmationProviders || existingUser.emailConfirmed) {
            return redirect(existingUser)
          }
          return baseUrl + '/signin?error=EMAIL_CONFIRMATION_REQUIRED'
        }
        return signupRedirect(user)
      })
  }

  const router = express.Router()
  router.use(bodyParser.urlencoded({ extended: false }))
  router.use(i18n.init)

  const availableProviders = Object.keys(providers).reduce((obj, provider) => {
    obj[provider] = providers[provider](router, providerSignup, env, database)
    return obj
  }, {})
  const someProvidersAvailable = Object.keys(availableProviders).length > 0

  const client = req => {
    const agent = useragent.lookup(req.headers['user-agent'])
    return {
      agent: agent.toAgent(),
      os: agent.os.toString(),
      device: agent.device.toString(),
      ip: req.ip
    }
  }

  const renderIndex = (req, res, next, data) => {
    const { baseUrl, query } = req
    const { error, info, provider, token } = query
    const { signupFields, termsAndConditions } = validations
    const filename = path.join(views, 'index.html')
    const allData = Object.assign({
      projectName,
      someProvidersAvailable,
      availableProviders,
      signupFields,
      baseUrl,
      error,
      info,
      provider,
      token,
      termsAndConditions,
      stylesheet,
      forms: validations.forms(provider),
      __: res.__
    }, data)
    const options = {}
    Promise.resolve()
      .then(() => provider ? jwt.verify(provider) : {})
      .then(data => {
        Object.assign(allData, { userInfo: data.user || {} })
        ejs.renderFile(filename, allData, options, (err, html) => {
          err ? next(err) : res.type('html').send(html)
        })
      })
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
        return redirect(user)
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
    renderIndex(req, res, next, {
      title: 'Reset your password',
      action: 'reset'
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

  router.get('/changepassword', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Change your password',
      action: 'changepassword'
    })
  })

  router.post('/changepassword', (req, res, next) => {
    res.send('WIP')
  })

  router.get('/changeemail', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Change your email address',
      action: 'changeemail'
    })
  })

  router.post('/changeemail', (req, res, next) => {
    res.send('WIP')
  })

  const stylesheetFullPath = path.join(__dirname, '../static/stylesheet.css')
  router.get('/stylesheet.css', (req, res, next) => {
    res.sendFile(stylesheetFullPath, {}, err => err && next(err))
  })

  router.use((err, req, res, next) => {
    const message = err.handled ? err.message : 'INTERNAL_ERROR'
    res.redirect(req.baseUrl + req.path + '?error=' + message)
    if (!err.handled) winston.error(err)
  })

  return router
}

exports.startServer = (config, callback) => {
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
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

  app.get('/callback', (req, res, next) => {
    jwt.verify(req.query.jwt)
      .then((info) => {
        res.send('hey ' + JSON.stringify(info))
      })
      .catch(next)
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
