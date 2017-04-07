const test = require('ava')
const env = require('../src/utils/env')({
  SIGNUP_FIELDS: 'firstName,lastName',
  TERMS_AND_CONDITIONS: 'http://example.com'
})
const validations = require('../src/validations')(env)

test('validation forms with provider', t => {
  t.deepEqual(validations.forms(true), {
    register: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        termsAndConditions: [
          'checked'
        ],
        firstName: ['empty'],
        lastName: ['empty']
      }
    },
    signin: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        password: [
          'empty'
        ]
      }
    },
    resetpassword: {
      fields: {
        email: [
          'email',
          'empty'
        ]
      }
    },
    reset: {
      fields: {
        password: [
          'empty'
        ]
      }
    },
    changepassword: {
      fields: {
        oldpassword: [
          'empty'
        ],
        newpassword: [
          'empty'
        ]
      }
    },
    changeemail: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        password: [
          'empty'
        ]
      }
    }
  })
})

test('validation forms without provider', t => {
  t.deepEqual(validations.forms(false), {
    register: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        password: ['empty'],
        termsAndConditions: [
          'checked'
        ],
        firstName: ['empty'],
        lastName: ['empty']
      }
    },
    signin: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        password: [
          'empty'
        ]
      }
    },
    resetpassword: {
      fields: {
        email: [
          'email',
          'empty'
        ]
      }
    },
    reset: {
      fields: {
        password: [
          'empty'
        ]
      }
    },
    changepassword: {
      fields: {
        oldpassword: [
          'empty'
        ],
        newpassword: [
          'empty'
        ]
      }
    },
    changeemail: {
      fields: {
        email: [
          'email',
          'empty'
        ],
        password: [
          'empty'
        ]
      }
    }
  })
})

test('validate register form without provider', t => {
  const values = {}
  const result = validations.validate(false, 'register', values)
  t.truthy(result.error)
  t.deepEqual(result.error.details, [
    {
      message: '"email" is required',
      path: 'email',
      type: 'any.required',
      context: {
        key: 'email'
      }
    },
    {
      message: '"password" is required',
      path: 'password',
      type: 'any.required',
      context: {
        key: 'password'
      }
    },
    {
      message: '"termsAndConditions" is required',
      path: 'termsAndConditions',
      type: 'any.required',
      context: {
        key: 'termsAndConditions'
      }
    },
    {
      message: '"firstName" is required',
      path: 'firstName',
      type: 'any.required',
      context: {
        key: 'firstName'
      }
    },
    {
      message: '"lastName" is required',
      path: 'lastName',
      type: 'any.required',
      context: {
        key: 'lastName'
      }
    }
  ])
})

test('validate register form with provider', t => {
  const values = {}
  const result = validations.validate(true, 'register', values)
  t.truthy(result.error)
  t.deepEqual(result.error.details, [
    {
      message: '"email" is required',
      path: 'email',
      type: 'any.required',
      context: {
        key: 'email'
      }
    },
    {
      message: '"termsAndConditions" is required',
      path: 'termsAndConditions',
      type: 'any.required',
      context: {
        key: 'termsAndConditions'
      }
    },
    {
      message: '"firstName" is required',
      path: 'firstName',
      type: 'any.required',
      context: {
        key: 'firstName'
      }
    },
    {
      message: '"lastName" is required',
      path: 'lastName',
      type: 'any.required',
      context: {
        key: 'lastName'
      }
    }
  ])
})

test('validate register form successfully', t => {
  const values = {
    email: 'user@example.com',
    termsAndConditions: 'on',
    firstName: 'Anakin',
    lastName: 'Skywalker',
    password: 'something'
  }
  const result = validations.validate(false, 'register', values)
  t.falsy(result.error)
  t.truthy(result.value)
})
