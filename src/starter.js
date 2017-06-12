#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const ncp = require('ncp').ncp
const inquirer = require('inquirer')
const dedent = require('dedent')

const availableFields = require('./constants').availableFields

const normalize = str => (str.toLowerCase().match(/\w+/g) || []).join('-')
const envFile = path.join(process.cwd(), '.env')
const envFileExists = fs.existsSync(envFile)

console.log('This utility will help you generate a .env file and optionally email templates to use pnp-authentication-service')

Promise.resolve()
  .then(() => {
    if (envFileExists) {
      const question = {
        type: 'confirm',
        message: 'The .env file already exists. Do you want to override it?',
        name: '_override',
        filter: (dont) => console.log('dont', dont) || dont && process.exit(0)
      }
      return inquirer.prompt([question])
        .then((answers) => {
          if (!answers._override) process.exit(0)
        })
    }
  })
  .then(() => {
    const questions = []
    questions.push({
      type: 'input',
      message: 'What\'s the name of the project?',
      name: 'AUTH_PROJECT_NAME',
      default: path.basename(process.cwd())
    })

    questions.push({
      type: 'input',
      message: 'What\'s the URL where the microservice will be served from?',
      name: 'AUTH_BASE_URL',
      default: 'http://localhost:3000/auth'
    })

    questions.push({
      type: 'input',
      message: 'What\'s the database URL?',
      name: 'DATABASE_URL',
      default: (answers) => `postgresql://localhost/${normalize(answers.AUTH_PROJECT_NAME)}`
    })

    questions.push({
      type: 'checkbox',
      message: 'Which additional fields you want users to have?',
      name: 'AUTH_SIGNUP_FIELDS',
      choices: Object.keys(availableFields)
    })

    questions.push({
      type: 'input',
      message: 'To what URL users will be redirected after login/register?',
      name: 'AUTH_REDIRECT_URL',
      default: 'http://localhost:3000/callback'
    })

    questions.push({
      type: 'confirm',
      message: 'Do you want to support signin with Facebook?',
      name: '_facebook'
    })

    questions.push({
      type: 'input',
      message: 'What\'s your Facebook app id?',
      name: 'FACEBOOK_APP_ID',
      when: (answers) => answers._facebook
    })

    questions.push({
      type: 'input',
      message: 'What\'s your Facebook app secret?',
      name: 'FACEBOOK_APP_SECRET',
      when: (answers) => answers._facebook
    })

    questions.push({
      type: 'confirm',
      message: 'Do you want to support signin with Google?',
      name: '_google'
    })

    questions.push({
      type: 'input',
      message: 'What\'s your Google app client id?',
      name: 'GOOGLE_CLIENT_ID',
      when: (answers) => answers._google
    })

    questions.push({
      type: 'input',
      message: 'What\'s your Google app client secret?',
      name: 'GOOGLE_CLIENT_SECRET',
      when: (answers) => answers._google
    })

    questions.push({
      type: 'confirm',
      message: 'Do you want to make email confirmation mandatory?',
      name: 'AUTH_EMAIL_CONFIRMATION'
    })

    questions.push({
      type: 'confirm',
      message: 'Even for people that have signed in with third party services?',
      name: 'AUTH_EMAIL_CONFIRMATION_PROVIDERS',
      when: (answers) => answers.AUTH_EMAIL_CONFIRMATION && (answers.facebook || answers.google)
    })

    questions.push({
      type: 'input',
      message: 'Optionally specify a URL for the Terms and Conditions',
      name: 'AUTH_TERMS_AND_CONDITIONS'
    })

    questions.push({
      type: 'confirm',
      message: 'Do you want to use ReCAPTCHA?',
      name: '_recaptcha'
    })

    questions.push({
      type: 'input',
      message: 'What\'s your ReCAPTCHA site key?',
      name: 'RECAPTCHA_SITE_KEY',
      when: (answers) => answers._recaptcha
    })

    questions.push({
      type: 'input',
      message: 'What\'s your ReCAPTCHA secret key?',
      name: 'RECAPTCHA_SECRET_KEY',
      when: (answers) => answers._recaptcha
    })

    questions.push({
      type: 'input',
      message: 'What JWT algorithm you want to use?',
      name: 'JWT_ALGORITHM',
      default: 'HS256'
    })

    questions.push({
      type: 'input',
      message: 'Specify a JWT secret (the one suggested has just been randomnly generated)',
      name: 'JWT_SECRET',
      default: require('crypto').randomBytes(128 / 8).toString('hex'),
      when: (answers) => (answers.JWT_ALGORITHM || '').startsWith('H')
    })

    questions.push({
      type: 'confirm',
      message: 'Do you want to support 2 Factor Authentication?',
      name: '_2fa'
    })

    questions.push({
      type: 'input',
      message: 'Specify a symmetric key for storing 2FA users\' seeds (the one suggested has just been randomnly generated)',
      name: 'SYMMETRIC_KEY',
      default: require('crypto').randomBytes(128 / 8).toString('hex'),
      when: (answers) => answers._2fa
    })

    questions.push({
      type: 'input',
      message: 'Specify a symmetric algorithm for storing 2FA users\' seeds',
      name: 'SYMMETRIC_ALGORITHM',
      default: 'aes-256-gcm',
      when: (answers) => answers._2fa
    })

    questions.push({
      type: 'input',
      message: 'Do you want to support sending SMS with Twilio for 2 Factor Authentication?',
      name: '_twilio',
      when: (answers) => answers._2fa
    })

    questions.push({
      type: 'input',
      message: 'Specify your Twilio Account SID',
      name: 'TWILIO_ACCOUNT_SID',
      when: (answers) => answers._twilio
    })

    questions.push({
      type: 'input',
      message: 'Specify your Twilio Auth Token',
      name: 'TWILIO_AUTH_TOKEN',
      when: (answers) => answers._twilio
    })

    questions.push({
      type: 'input',
      message: 'Specify your Twilio number from which messages will be sent (you can use an Alphanumeric Sender ID)',
      name: 'TWILIO_NUMBER_FROM',
      when: (answers) => answers._twilio
    })

    questions.push({
      type: 'input',
      message: 'What Amazon SES email from address do you want to use?',
      name: 'EMAIL_DEFAULT_FROM'
    })

    questions.push({
      type: 'input',
      message: 'What Amazon Key do you want to use? (required for Amazon SES)',
      name: 'AWS_KEY'
    })

    questions.push({
      type: 'input',
      message: 'What Amazon Secret do you want to use? (required for Amazon SES)',
      name: 'AWS_SECRET'
    })

    questions.push({
      type: 'list',
      message: 'What Amazon Region do you want to use? (required for Amazon SES)',
      name: 'AWS_REGION',
      choices: [
        'us-east-1',
        'us-east-2',
        'us-west-1',
        'us-west-2',
        'ca-central-1',
        'eu-west-1',
        'eu-central-1',
        'eu-west-2',
        'ap-northeast-1',
        'ap-northeast-2',
        'ap-southeast-1',
        'ap-southeast-2',
        'ap-south-1',
        'sa-east-1'
      ]
    })

    questions.push({
      type: 'confirm',
      message: `Do you want to copy the email templates to your project?`,
      name: '_emailTemplates'
    })

    questions.push({
      type: 'input',
      message: `Where do you want to copy the email templates to?`,
      name: '_emailTemplatesDir',
      default: path.join(process.cwd(), 'templates'),
      when: (answers) => answers._emailTemplates
    })

    questions.push({
      type: 'confirm',
      message: `Do you use Express.js?`,
      name: '_expressSnippet'
    })

    let _expressSnippet = null
    return inquirer.prompt(questions)
      .then((answers) => {
        _expressSnippet = answers._expressSnippet
        const data = Object.keys(answers).reduce((arr, key) => {
          if (!key.startsWith('_')) {
            const value = answers[key]
            const str = Array.isArray(value) ? value.join(',') : String(value)
            arr.push(`${key}=${str}`)
          }
          return arr
        }, []).join('\n')
        fs.writeFileSync(envFile, data, 'utf8')

        const destination = answers._emailTemplatesDir
        if (destination) {
          const source = path.join(__dirname, '..', 'templates')
          return new Promise((resolve, reject) => {
            ncp(source, destination, (err) => err ? reject(err) : resolve())
          })
        }
      })
      .then(() => {
        if (_expressSnippet) {
          const code = dedent`
            require('dotenv').config() // for reading the .env file

            const { createJwtClient, createRouter } = require('pnp-authentication-service')
            const config = { EMAIL_TEMPLATES_DIR: path.join(__dirname, 'templates') } // adjust if necessary
            const jwt = createJwtClient(config)

            // If you want to run it as an express router
            app.use('/auth', createRouter(config))

            // Callback URL. Adjust if necessary
            app.get('/callback', (req, res, next) => {
              jwt.verify(req.query.jwt)
                .then(data => {
                  // User information inside \`data.user\`
                  // Handle that information here
                  res.redirect('/home')
                })
                .catch(next)
            })
          `
          console.log('// Here you have a code snippet to integrate pnp-authentication-service into your app')
          console.log(code)
          console.log()
        }
        console.log('Done!')
      })
  })
  .catch((err) => {
    console.error(err)
  })
