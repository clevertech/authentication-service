# Authentication service

This microservice exposes a web UI that implements all the flow and features for authenticating users. Such as:

- Sign in
- Registering a new account
- Forgot password
- Change email
- Change password

The communication between your app and the microservice is by using simple redirects and JWT tokens. You redirect the user to the signin / register URLs and when the user is authenticated it is redirected to a callback endpoint where you get a JWT token that needs to be verified.

There are many configuration options such as:

- Can authenticate users with email + password and optionally with third party services (facebook, google, etc.)
- Customizable fields when registering a new account (optinal first name, last name, company name, etc.)
- Optional terms and conditions checkbox
- Imports users's image from third party services
- Whether asking for email confirmation

The microservice requires a PostgreSQL database (other databases will be supported soon). The microservice creates the tables needed if they don't exist.

## Running as a command line application

The npm package configures an `pnp-authentication-service` executable. You will pass configuration options through ENV variables. Check the configuration options below.

Then visit `http://127.0.0.1:3000/auth`

## Usage as an express router

Basically you create an express router, mount it in some path (such as `/auth`) then you can redirect your users to `/auth/signin` or `/auth/register` and once they login or register they will be redirected to a callback endpoint with a JWT token that you will verify to get the user data.

### Basic example

```javascript
const app = express()
const { createJwtClient, createRouter } = require('pnp-authentication-service')

const config = { EMAIL_TEMPLATES_DIR: path.join(__dirname, 'templates') }
const jwt = createJwtClient(config)
const router = createRouter(config)
app.use('/auth', router)

app.get('/callback', (req, res, next) => {
  jwt.verify(req.query.jwt)
    .then(data => {
      const user = _.pick(data.user, ['id', 'firstName', 'lastName', 'image'])
      req.session.user = user
      res.redirect('/home')
    })
    .catch(next)
})
```

### Full example

You can find a [full example here](https://github.com/gimenete/authentication-service-example/blob/master/index.js)

## Email integration

Behind the scenes this microservice uses other microservice for sending emails [email service](https://github.com/clevertech/email-service). You will need to set up correctly its [configuration options](https://github.com/clevertech/email-service#configuration-options) such as:

```
EMAIL_DEFAULT_FROM=hello@yourserver.com
EMAIL_TRANSPORT=ses
AWS_KEY=xxxx
AWS_SECRET=xxxx
AWS_REGION=us-east-1
```

You need also to configure where your email templates are with `EMAIL_TEMPLATES_DIR`. That is better done from code if you are mounting the microservice as an express router:

```javascript
const config = { EMAIL_TEMPLATES_DIR: path.join(__dirname, 'templates') }
const router = createRouter(config)
app.use('/auth', router)
```

You will find [example templates here](https://github.com/clevertech/authentication-service/tree/master/templates/en).

## Configuration options

All configuration options can be configured using ENV variables. If using it as an express router, then configuration variables can also be passed as an argument to this method. All ENV variables can be prefixed with `AUTH_`. Since one value can be configured in many ways some take precedence over others. For example for the `DEFAULT_FROM` variable the value used will be the first found following this list:

- `AUTH_PROJECT_NAME` parameter passed to `createRouter()`
- `PROJECT_NAME` parameter passed to `createRouter()`
- `AUTH_PROJECT_NAME` ENV variable
- `PROJECT_NAME` ENV variable

This is the list of available configuration options:
| Variable | Description |
| --- | --- |
| `SIGNUP_FIELDS` | List of additional fields for the sign up form separated by commas. Available values are: name, firstName, lastName, company, address, city, state, zip, country |
| `PROJECT_NAME` | Your project's name |
| `REDIRECT_URL` | Callback URL that the user will be redirected to when authenticated |
| `FACEBOOK_APP_ID` | Required if you want to sign in your users with Facebook |
| `FACEBOOK_APP_SECRET` | Required if you want to sign in your users with Facebook |
| `EMAIL_CONFIRMATION` | Set to true if you want to send a confirmation email to your users to confirm their email addresses |
| `EMAIL_CONFIRMATION_PROVIDERS` | Set to true if you want to send a confirmation email to your users to confirm their email addresses even when they signup with third party services such as Facebook |
| `STYLESHEET` | Optionally specify a URL with the stylesheet to be used in the authentication service. The default one can be found in `http://localhost:3000/auth/stylesheet.css` (change the URL if you are running the microservice somewhere else) |
| `TERMS_AND_CONDITIONS` | Optionally specify the URL to the terms and conditions. If you specify one, a checkbox will be added with a link to them and the user will be required to accept the terms for signing up. Then this value is stored in the database, so you can for example specify a different URL every time you update the terms and conditions and you will know which version of the terms and conditions the user accepted. |
| `JWT_ALGORITHM` | The algorithm to be used in the JWT tokens. `HS256` by default |
| `JWT_SECRET` | The JWT secret to be used when a HMAC algorithm is being used (such as for `HS256`) |
| `JWT_PRIVATE_KEY` | The PEM encoded private key for RSA and ECDSA algorithms |
| `JWT_PUBLIC_KEY` | The PEM encoded public key for RSA and ECDSA algorithms |
| `JWT_EXPIRES_IN` | Optional. Default `expiresIn` value when generating JWT tokens |
| `JWT_NOT_BEFORE` | Optional. Default `notBefore` value when generating JWT tokens |

The simplest JWT configuration is just setting up the `JWT_SECRET` value.

## Configuration example

```
AUTH_BASE_URL=http://yourserver/auth
AUTH_DATABASE_URL=postgresql://localhost/database
AUTH_SIGNUP_FIELDS=firstName,lastName,company
AUTH_PROJECT_NAME=Your project name
AUTH_FACEBOOK_APP_ID=xxxx
AUTH_FACEBOOK_APP_SECRET=xxxx
AUTH_REDIRECT_URL=http://yourserver/callback
AUTH_EMAIL_CONFIRMATION=true
AUTH_STYLESHEET=http://yourserver/stylesheet.css
JWT_SECRET=shhhh

EMAIL_DEFAULT_FROM=hello@yourserver.com
EMAIL_TRANSPORT=ses
AWS_KEY=xxxx
AWS_SECRET=xxxx
AWS_REGION=us-east-1
```
