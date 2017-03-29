const constants = require('./constants')

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
            password: !provider && 'empty',
            termsAndConditions: termsAndConditions && 'checked'
          }
        },
        signin: {
          fields: {
            email: ['email', 'empty'],
            password: 'empty'
          }
        },
        resetpassword: {
          fields: {
            email: ['email', 'empty']
          }
        },
        reset: {
          fields: {
            password: 'empty'
          }
        },
        changepassword: {
          fields: {
            oldpassword: 'empty',
            newpassword: 'empty'
          }
        },
        changeemail: {
          fields: {
            email: ['email', 'empty'],
            password: 'empty'
          }
        }
      }

      const registerFields = forms.register.fields
      for (const field of signupFields) {
        registerFields[field.name] = 'empty'
      }
      return forms
    },
    signupFields,
    termsAndConditions
  }
}
