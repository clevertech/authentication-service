const querystring = require('querystring')
const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })
const _ = require('lodash')

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
        const url = 'https://graph.facebook.com/v2.8/me'
        const options = {
          url,
          qs: {
            access_token,
            fields: 'first_name,last_name,email,picture'
          },
          json: true
        }
        return request.get(options)
          .then(([response, body]) => {
            return Promise.resolve()
              .then(() => {
                if (_.get(body, 'picture.data.is_silhouette') !== false) return
                const options = {
                  url: 'https://graph.facebook.com/v2.8/me/picture',
                  qs: { access_token, height: 160 },
                  followRedirect: false,
                  json: true
                }
                return request.get(options).then(([response, body]) => response.headers.location)
              })
              .then(image => {
                const user = {
                  firstName: body.first_name,
                  lastName: body.last_name,
                  email: body.email,
                  image,
                  login: 'facebook:' + body.id,
                  icon: 'facebook',
                  description: [body.first_name, body.last_name].filter(Boolean).join(' '),
                  data: { access_token }
                }
                return redirect(user).then(url => res.redirect(url))
              })
          })
      })
      .catch(next)
  })

  return true
}
