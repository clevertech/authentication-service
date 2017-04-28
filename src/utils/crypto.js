const crypto = require('crypto')

const separator = '.'
const encoding = 'hex'

module.exports = env => {
  const key = env('SYMMETRIC_KEY')
  const algorithm = env('SYMMETRIC_ALGORITHM', 'aes-256-gcm')
  return {
    encrypt (text) {
      return Promise.resolve()
        .then(() => {
          const iv = crypto.randomBytes(16)
          const cipher = crypto.createCipheriv(algorithm, key, iv)
          let encrypted = cipher.update(text, 'utf8', encoding)
          encrypted += cipher.final(encoding)
          const tag = cipher.getAuthTag()
          return [encrypted, tag.toString(encoding), iv.toString(encoding)].join(separator)
        })
    },
    decrypt (encrypted) {
      return Promise.resolve()
        .then(() => {
          const [content, tag, iv] = encrypted.split(separator)
          const decipher = crypto.createDecipheriv(algorithm, key, new Buffer(iv, encoding))
          decipher.setAuthTag(new Buffer(tag, encoding))
          let dec = decipher.update(content, encoding, 'utf8')
          dec += decipher.final('utf8')
          return dec
        })
    }
  }
}

// const crypt = module.exports(key => key === 'SYMMETRIC_KEY' ? '3zTvzr3p67VC61jmV54rIYu1545x4TlY' : 'aes-256-gcm')
// crypt.encrypt('hello world')
//   .then(encrypted => crypt.decrypt(encrypted))
//   .then(plainText => console.log(plainText))
//   .catch(err => console.error(err.stack))

