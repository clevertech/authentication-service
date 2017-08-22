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

That example application can be [tested online](https://pnp-authentication-service.herokuapp.com)

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

__Quickly getting started__: if you want to use an `.env` file you can run `pnp-authentication-service-starter` which will guide you to configure almost all configuration options, will copy the email templates and will even give you a code snippet to integrate `pnp-authentication-service` in your app.

All configuration options can be configured using ENV variables. If using it as an express router, then configuration variables can also be passed as an argument to this method. All ENV variables can be prefixed with `AUTH_`. Since one value can be configured in many ways some take precedence over others. For example for the `DEFAULT_FROM` variable the value used will be the first found following this list:

- `AUTH_PROJECT_NAME` parameter passed to `createRouter()`
- `PROJECT_NAME` parameter passed to `createRouter()`
- `AUTH_PROJECT_NAME` ENV variable
- `PROJECT_NAME` ENV variable

This is the list of available configuration options:

| Variable | Description |
| --- | --- |
| `DATABASE_ENGINE` | The engine to use for your database of choice. Supported values: [`pg`, `mysql`, `mongo`] |
| `DATABASE_URL` | Connection string for your database. Example: `postgresql://user:pass@host/database` |
| `EMAIL_CONFIRMATION_PROVIDERS` | Set to true if you want to send a confirmation email to your users to confirm their email addresses even when they signup with third party services such as Facebook |
| `EMAIL_CONFIRMATION` | Set to true if you want to send a confirmation email to your users to confirm their email addresses |
| Email transport configuration | There are a number of configuration options used to control email sending behavior. See [the `pnp-email-service` README](https://github.com/clevertech/email-service#configuration-options) for more information. |
| `FACEBOOK_APP_ID` | Required if you want to sign in your users with Facebook |
| `FACEBOOK_APP_SECRET` | Required if you want to sign in your users with Facebook |
| `GOOGLE_CLIENT_ID` | Required if you want to sign in your users with Google |
| `GOOGLE_CLIENT_SECRET` | Required if you want to sign in your users with Google |
| `JWT_ALGORITHM` | The algorithm to be used in the JWT tokens. `HS256` by default |
| `JWT_EXPIRES_IN` | Optional. Default `expiresIn` value when generating JWT tokens |
| `JWT_NOT_BEFORE` | Optional. Default `notBefore` value when generating JWT tokens |
| `JWT_PRIVATE_KEY` | The PEM encoded private key for RSA and ECDSA algorithms |
| `JWT_PUBLIC_KEY` | The PEM encoded public key for RSA and ECDSA algorithms |
| `JWT_SECRET` | The JWT secret to be used when a HMAC algorithm is being used (such as for `HS256`) |
| `PROJECT_NAME` | Your project's name. Will be used in emails, SMS messages, and page titles. |
| `RECAPTCHA_SECRET_KEY` | If you want to use reCAPTCHA, set this configuration option and all forms will require to pass through reCAPTCHA |
| `RECAPTCHA_SITE_KEY` | If you want to use reCAPTCHA, set this configuration option and all forms will require to pass through reCAPTCHA |
| `REDIRECT_URL` | Callback URL that the user will be redirected to when authenticated |
| `SIGNUP_FIELDS` | List of additional fields for the sign up form separated by commas. Available values are: name, firstName, lastName, company, address, city, state, zip, country |
| `STYLESHEET` | Optionally specify a URL with the stylesheet to be used in the authentication service. The default one can be found in `http://localhost:3000/auth/stylesheet.css` (change the URL if you are running the microservice somewhere else) |
| `SYMMETRIC_ALGORITHM` | Optional. It's the algorithm used for encrypting users's 2FA seeds. Defaults to `aes-256-gcm` |
| `SYMMETRIC_KEY` | Optional. Required for 2FA. This is the key that will be used for encrypting users's 2FA seeds. You can easily create a key using `require('crypto').randomBytes(128 / 8).toString('hex')` on a Node.js interactive prompt. This generates a secure random 128bit key encoded as hexadecimal |
| `TERMS_AND_CONDITIONS` | Optionally specify the URL to the terms and conditions. If you specify one, a checkbox will be added with a link to them and the user will be required to accept the terms for signing up. Then this value is stored in the database, so you can for example specify a different URL every time you update the terms and conditions and you will know which version of the terms and conditions the user accepted. |
| `TWILIO_ACCOUNT_SID` | Optional. Configure this for adding SMS support for 2FA |
| `TWILIO_AUTH_TOKEN` | Optional. Configure this for adding SMS support for 2FA |
| `TWILIO_NUMBER_FROM` | Optional. Configure this for adding SMS support for 2FA |
| `WHITELISTED_DOMAINS` | Optional. Limits creating/authenticating users on these specified domains only |

The simplest JWT configuration is just setting up the `JWT_SECRET` value.

Any and all configuration options can be optionally prepended with `AUTH_`, while any Email configration can be prepended with `EMAIL_`, if you prefer to differentiate them.

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
WHITELISTED_DOMAINS=clevertech.biz,clevertech.com

EMAIL_DEFAULT_FROM=hello@yourserver.com
EMAIL_TRANSPORT=ses
AWS_KEY=xxxx
AWS_SECRET=xxxx
AWS_REGION=us-east-1
```

## Two factor authentication

Two factor authentication is optional. If you want to allow your users to have 2FA you just need to redirect them to `/auth/configuretwofactor?jwt=${jwtToken}`. The `jwtToken` only needs the `userId`:

```javascript
jwt.sign({ userId: user.id })
  .then(jwtToken => {
    // redirect or use the `jwtToken` in a template
  })
```

There are two supported mechanisms for 2FA: via authenticator app (such as Google Authenticator) or via SMS. If you want to enable SMS you will need to configure the `TWILIO_xxx` env variables.

You will also need to configure a `SYMMETRIC_KEY` that will be used to encrypt users's 2FA seeds.

## Change password

To allow a user to change his/her password you just need to redirect him/her to `/auth/changepassword?jwt=${jwtToken}`. The `jwtToken` only needs the `userId`:

```javascript
jwt.sign({ userId: user.id })
  .then(jwtToken => {
    // redirect or use the `jwtToken` in a template
  })
```

## Security

This microservice is intented to be very secure.  User accounts can be limited to certain domains by configuring the `WHITELISTED_DOMAINS` env variable.

### Forgot password functionality

When an unknown email address is used in this functionality, an email is sent to that email address telling the user somebody tried to get access to that account. The email conteins information about the OS and browser versions used.

This way:

- We don't inform the attacker whether the account exists or not
- The user is informed about an attempt to get access to the account

### Passwords

Passwords are hashed with a `kdf` derivation that uses the `scrypt` hash function that incorporates HMAC (protecting against length extension attacks) into its format. More information [here](https://security.stackexchange.com/questions/88678/why-does-node-js-scrypt-function-use-hmac-this-way/91050#91050). The email address is also used as an additional salt so

- It's impossible to swap the hash between two users
- A user can only change his email address knowing his password

Why `scrypt`:

- Because it was specifically designed to make it costly to perform large-scale custom hardware attacks by requiring large amounts of memory
- Protects against brute-force attacks because it is computationally intensive

### JWT

JWT is used for exchanging information between the microservice and your app. You can configure the JWT algorithm (check the configuration options above). You can choose between just hashing with HMAC or using private key algorithms such as RSA and ECDSA.

JWT is also used for passing information around between some redirects. For example when a user signs up with Facebook and needs to accept the terms and conditions or confirm or fill more information to sign up. In that case the Facebook accessToken and other information is passed in the URL inside a JWT token.

Email confirmation tokens are JWT tokens with a expiration date. This could be enough, but we also make the token contain a random value and we store it in the database. So one user can only have one confirmation token at a time and can be used only once.

### To be done regarding security

- Protection against brute force attacks slowing down the server response:
  - From same IP
  - To the same login
  - Using the same password
- Password strength calculator
- Re-confirm email after long inactivity
