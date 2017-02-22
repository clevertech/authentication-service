const prefix = 'AUTH_'
const defaults = {
  JWT_ALGORITHM: 'HS256'
}

module.exports = (key, defaultValue) => {
  return process.env[prefix + key] ||
    process.env[key] ||
    defaults[key] ||
    defaultValue
}
