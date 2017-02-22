const env = require('../utils/env')
const jwt = require('../utils/jwt')
const googleClientId = env('GOOGLE_CLIENT_ID')
const googleClientSecret = env('GOOGLE_CLIENT_SECRET')

module.exports = (router, redirectUrl) => {
  if (!googleClientId || !googleClientSecret) return false

  router.get('/provider/google', (req, res, next) => {
    jwt.sign({ email: 'test@example.com' })
      .then(token => res.redirect(redirectUrl + '?jwt=' + token))
      .catch(next)
  })

  return true
}
