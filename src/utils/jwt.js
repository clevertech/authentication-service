const jwt = require('jsonwebtoken')

module.exports = env => {
  const algorithm = env('JWT_ALGORITHM')
  const isHMAC = algorithm.substring(0, 1) === 'H'
  const secretOrPrivateKey = isHMAC ? env('JWT_SECRET') : env('JWT_PRIVATE_KEY')
  const secretOrPublicKey = isHMAC ? env('JWT_SECRET') : env('JWT_PUBLIC_KEY')
  const expiresIn = env('JWT_EXPIRES_IN')
  const notBefore = env('JWT_NOT_BEFORE')

  return {
    sign (payload, options) {
      const opts = Object.assign({ algorithm, expiresIn, notBefore }, options)
      return new Promise((resolve, reject) => {
        jwt.sign(payload, secretOrPrivateKey, opts, (err, token) => {
          err ? reject(err) : resolve(token)
        })
      })
    },

    verify (token, options) {
      const opts = Object.assign({ algorithm }, options)
      return new Promise((resolve, reject) => {
        jwt.verify(token, secretOrPublicKey, opts, (err, decoded) => {
          err ? reject(err) : resolve(decoded)
        })
      })
    }
  }
}
