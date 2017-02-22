const path = require('path')
const express = require('express')
const winston = require('winston')
const ejs = require('ejs')
const env = require('./utils/env')
const views = env('VIEWS_DIR') || path.join(__dirname, '..', 'views')
const projectName = env('PROJECT_NAME')
const redirectUrl = env('REDIRECT_URL')

const providers = {
  google: require('./providers/google'),
  twitter: require('./providers/twitter'),
  facebook: require('./providers/facebook'),
  linkedin: require('./providers/linkedin'),
  github: require('./providers/github')
}

exports.createRouter = () => {
  const router = express.Router()
  let someProvidersAvailable = false
  const availableProviders = {}
  Object.keys(providers).forEach(provider => {
    const available = providers[provider](router, redirectUrl)
    availableProviders[provider] = available
    someProvidersAvailable = available || someProvidersAvailable
  })

  const renderIndex = (req, res, next, data) => {
    const {baseUrl} = req
    const filename = path.join(views, 'index.html')
    const allData = Object.assign({
      projectName,
      someProvidersAvailable,
      availableProviders,
      baseUrl
    }, data)
    const options = {}
    ejs.renderFile(filename, allData, options, (err, html) => {
      err ? next(err) : res.type('html').send(html)
    })
  }

  router.get('/', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Sign In',
      action: 'signin'
    })
  })

  router.get('/register', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Register',
      action: 'register'
    })
  })

  router.get('/resetpassword', (req, res, next) => {
    renderIndex(req, res, next, {
      title: 'Reset your password',
      action: 'resetpassword'
    })
  })

  return router
}

exports.standaloneApp = () => {
  const app = express()
  const router = exports.createRouter()
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

  app.listen(port, () => {
    winston.info('NODE_ENV: ' + process.env.NODE_ENV)
    winston.info(`Listening on port ${port}! Visit http://127.0.0.1:${port}/auth`)
  })
}

if (require.main === module) {
  exports.standaloneApp()
}
