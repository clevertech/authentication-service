const constants = require('./constants')
const Joi = require('joi')

module.exports = env => {
  const signupFields = env('SIGNUP_FIELDS', '').split(',')
    .filter(name => constants.availableFields[name])
    .map(name => Object.assign({ name }, constants.availableFields[name]))

  const termsAndConditions = env('TERMS_AND_CONDITIONS')
  return {
    forms (provider) {
      const forms = {
        register: {
          fields: {
            email: ['email', 'empty'],
            image: []
          }
        },
        signin: {
          fields: {
            email: ['email', 'empty'],
            password: ['empty']
          }
        },
        resetpassword: {
          fields: {
            email: ['email', 'empty']
          }
        },
        reset: {
          fields: {
            password: ['empty']
          }
        },
        changepassword: {
          fields: {
            oldpassword: ['empty'],
            newpassword: ['empty']
          }
        },
        changeemail: {
          fields: {
            email: ['email', 'empty'],
            password: ['empty']
          }
        }
      }

      const registerFields = forms.register.fields
      if (!provider) registerFields.password = ['empty']
      if (termsAndConditions) registerFields.termsAndConditions = ['checked']
      for (const field of signupFields) {
        registerFields[field.name] = ['empty']
      }
      return forms
    },
    schema (provider, formName) {
      const { fields } = this.forms(provider)[formName]
      const keys = Object.keys(fields).reduce((keys, key) => {
        const arr = fields[key]
        const constraint = Joi.string().required().trim()
        if (arr.indexOf('email') >= 0) constraint.email().lowercase()
        keys[key] = constraint
        return keys
      }, {})
      return Joi.object().keys(keys)
    },
    validate (provider, formName, values) {
      values = Object.assign({}, values)
      delete values['g-recaptcha-response']
      const schema = this.schema(provider, formName)
      return Joi.validate(values, schema, { abortEarly: false })
    },
    signupFields,
    termsAndConditions
  }
}
