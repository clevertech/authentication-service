const querystring = require('querystring')
const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })

module.exports = (router, redirect, env) => {
  const baseUrl = env('BASE_URL')
  const facebookAppId = env('FACEBOOK_APP_ID')
  const facebookAppSecret = env('FACEBOOK_APP_SECRET')
  if (!facebookAppId || !facebookAppSecret) return false

  const redirectUrl = (req) => baseUrl + '/provider/facebook/callback'

  router.get('/provider/facebook', (req, res, next) => {
    const base = 'https://www.facebook.com/v2.8/dialog/oauth?'
    const query = querystring.stringify({
      app_id: facebookAppId,
      redirect_uri: redirectUrl(req),
      scope: 'email'
    })
    res.redirect(base + query)
  })

  router.get('/provider/facebook/callback', (req, res, next) => {
    const { code } = req.query
    const base = 'https://graph.facebook.com/v2.8/oauth/access_token?'
    const query = querystring.stringify({
      client_id: facebookAppId,
      redirect_uri: redirectUrl(req),
      client_secret: facebookAppSecret,
      code
    })
    request({ url: base + query, json: true })
      .then(([response, body]) => {
        const { access_token } = body
        var url = 'https://graph.facebook.com/v2.8/me'
        var options = {
          url,
          qs: {
            access_token,
            fields: 'first_name,last_name,email,picture'
          },
          json: true
        }
        return request.get(options)
          .then(([response, body]) => {
            const user = {
              firstName: body.first_name,
              lastName: body.last_name,
              email: body.email,
              login: 'facebook:' + body.id,
              data: { access_token }
            }
            return redirect(user).then(url => res.redirect(url))
          })
      })
      .catch(next)
  })

  return true
}
