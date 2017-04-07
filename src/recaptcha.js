const querystring = require('querystring')

module.exports = (env, fetch) => {
  const siteKey = env('RECAPTCHA_SITE_KEY')
  const secret = env('RECAPTCHA_SECRET_KEY')
  const enabled = siteKey && secret

  return {
    siteKey () {
      return enabled && siteKey
    },
    middleware () {
      return (req, res, next) => {
        if (!enabled || req.method === 'GET') return next()
        const response = req.body['g-recaptcha-response']
        const remoteip = req.ip
        const url = 'https://www.google.com/recaptcha/api/siteverify'
        const body = { secret, response, remoteip }
        return fetch(url, {
          method: 'POST',
          body: querystring.stringify(body),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .then(res => res.json())
        .then(json => {
          // Other attributes
          // challenge_ts: '2017-04-07T16:22:44Z'
          // hostname: 'localhost'
          if (json.success !== true) {
            const err = new Error('RECAPTCHA_VALIDATION_FAILED')
            err.handled = true
            return next(err)
          }
          next()
        })
        .catch(err => next(err))
      }
    }
  }
}
