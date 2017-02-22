const env = require('../utils/env')
const twitterClientId = env('TWITTER_CLIENT_ID')
const twitterClientSecret = env('TWITTER_CLIENT_SECRET')

module.exports = (router, redirectUrl) => {
  if (!twitterClientId || !twitterClientSecret) return false

  router.get('/provider/twitter', (req, res) => {
    res.json({ twitter: true })
  })
  return true
}
