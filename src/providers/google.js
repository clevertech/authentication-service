module.exports = (router, redirect, env) => {
  const googleClientId = env('GOOGLE_CLIENT_ID')
  const googleClientSecret = env('GOOGLE_CLIENT_SECRET')
  if (!googleClientId || !googleClientSecret) return false

  router.get('/provider/google', (req, res, next) => {
    redirect({ email: 'test@example.com' })
      .then(url => res.redirect(url))
      .catch(next)
  })

  return true
}
