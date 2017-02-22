const scrypt = require('scrypt')
const scryptParameters = scrypt.paramsSync(0.1)

exports.hash = (email, pass) => {
  pass = email + '#' + pass
  return scrypt.kdf(pass, scryptParameters)
    .then((result) => result.toString('base64'))
}

exports.check = (email, pass, hash) => {
  pass = email + '#' + pass
  return scrypt.verifyKdf(Buffer.from(hash, 'base64'), pass)
}
