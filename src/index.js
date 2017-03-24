const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const ejs = require('ejs')

const constants = require('./constants')

const providers = {
  google: require('./providers/google'),
  twitter: require('./providers/twitter'),
  facebook: require('./providers/facebook'),
  linkedin: require('./providers/linkedin'),
  github: require('./providers/github')
}

exports.createRouter = (config = {}) => {
  const sendEmail = (...args) => {
    console.log('sendEmail', args)
  }
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  const database = require('./database/knex')(env)
  const users = require('./services/users')(env, jwt, database, sendEmail)

  database.init()

  const views = env('VIEWS_DIR') || path.join(__dirname, '..', 'views')
  const baseUrl = env('BASE_URL')
  const projectName = env('PROJECT_NAME')
  const redirectUrl = env('REDIRECT_URL')
  const signupFields = env('SIGNUP_FIELDS', '').split(',')
    .filter(name => constants.availableFields[name])
    .map(name => Object.assign({ name }, constants.availableFields[name]))
  const redirect = (payload) =>
    jwt.sign(payload).then(token => redirectUrl + '?jwt=' + token)

  const signupRedirect = (payload) =>
    jwt.sign(payload).then(token => baseUrl + '/register?provider=' + token)

  const providerSignup = user =>
    database.findUserByProviderLogin(user.login)
      .then(existingUser => existingUser ? redirect(existingUser) : signupRedirect(user))

  const router = express.Router()
  router.use(bodyParser.urlencoded({ extended: false }))

  const availableProviders = Object.keys(providers).reduce((obj, provider) => {
    obj[provider] = providers[provider](router, providerSignup, env, database)
    return obj
  }, {})
  const someProvidersAvailable = Object.keys(availableProviders).length > 0

  const renderIndex = (req, res, next, data) => {
    const { baseUrl, query } = req
    const { error, info, provider } = query
    const filename = path.join(views, 'index.html')
    const allData = Object.assign({
      projectName,
      someProvidersAvailable,
      availableProviders,
      signupFields,
      baseUrl,
      error,
      info,
      provider
    }, data)
    const options = {}
    Promise.resolve()
      .then(() => provider ? jwt.verify(provider) : {})
      .then(userInfo => {
        Object.assign(allData, { userInfo })
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
    users.login(email, password)
      .then(user => redirect(user))
      .then(url => res.redirect(url))
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
    users.register(body)
      .then(user => {
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
    users.forgotPassword(email)
      .then(() => {
        res.redirect(req.baseUrl + req.path + '?info=RESET_LINK_SENT')
      })
      .catch(next)
  })

  router.use((err, req, res, next) => {
    return err.handled
      ? res.redirect(req.baseUrl + req.path + '?error=' + err.message)
      : next(err)
  })

  return router
}

exports.standaloneApp = () => {
  const config = process.env
  const env = require('./utils/env')(config)
  const jwt = require('./utils/jwt')(env)
  const app = express()
  const router = exports.createRouter(config)
  const port = +env('PORT') || 3000

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

  app.listen(port, () => {
    winston.info('NODE_ENV: ' + process.env.NODE_ENV)
    winston.info(`Listening on port ${port}! Visit http://127.0.0.1:${port}/auth`)
  })
}

if (require.main === module) {
  exports.standaloneApp()
}
