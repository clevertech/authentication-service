module.exports = (router, redirectUrl, env) => {
  const twitterClientId = env('TWITTER_CLIENT_ID')
  const twitterClientSecret = env('TWITTER_CLIENT_SECRET')
  if (!twitterClientId || !twitterClientSecret) return false

  router.get('/provider/twitter', (req, res) => {
    res.json({ twitter: true })
  })
  return true
}
