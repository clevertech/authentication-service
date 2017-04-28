const querystring = require('querystring')
const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })

module.exports = (router, redirect, env) => {
  const baseUrl = env('BASE_URL')
  const googleClientId = env('GOOGLE_CLIENT_ID')
  const googleClientSecret = env('GOOGLE_CLIENT_SECRET')
  if (!googleClientId || !googleClientSecret) return false

  const redirectUrl = baseUrl + '/provider/google/callback'

  router.get('/provider/google', (req, res, next) => {
    // See https://developers.google.com/identity/protocols/OAuth2UserAgent
    const base = 'https://accounts.google.com/o/oauth2/v2/auth?'
    const query = querystring.stringify({
      client_id: googleClientId,
      redirect_uri: redirectUrl,
      scope: 'email',
      response_type: 'code'
      // TODO: state
      // TODO: prompt
    })
    res.redirect(base + query)
  })

  router.get('/provider/google/callback', (req, res, next) => {
    const { code } = req.query
    const options = {
      url: 'https://www.googleapis.com/oauth2/v4/token',
      method: 'POST',
      form: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code'
      },
      json: true
    }
    return request(options)
      .then(([resp, body]) => {
        if (resp.statusCode !== 200) return Promise.reject(new Error(`${body.error}: ${body.error_description}`))
        const { access_token } = body

        const url = 'https://www.googleapis.com/plus/v1/people/me'
        const options = { url, qs: { access_token }, json: true }
        return request.get(options)
          .then((result) => {
            const [resp, body] = result
            if (resp.statusCode !== 200) {
              const message = (body.error && body.error.message) || `Google returned a status code = ${resp.statusCode}`
              return Promise.reject(new Error(message))
            }
            if (!body.id) return Promise.reject(new Error('Google returned a bad response'))
            let image = body.image && !body.image.isDefault && body.image.url
            image = image && image.replace('sz=50', 'sz=160')

            const user = {
              firstName: body.name.givenName,
              lastName: body.name.familyName,
              email: body.emails[0].value,
              image,
              login: 'google:' + body.id,
              icon: 'google',
              description: body.displayName,
              data: { access_token }
            }
            return redirect(user, res)
          })
      })
      .catch(next)
  })

  return true
}
