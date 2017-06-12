exports.availableFields = {
  name: {
    type: 'text',
    icon: 'user',
    description: 'Full name'
  },
  firstName: {
    type: 'text',
    icon: 'user',
    description: 'First name'
  },
  lastName: {
    type: 'text',
    icon: 'user',
    description: 'Last name'
  },
  company: {
    type: 'text',
    icon: 'building',
    description: 'Company name'
  },
  address: {
    type: 'text',
    icon: 'map',
    description: 'Address'
  },
  city: {
    type: 'text',
    icon: 'map',
    description: 'City'
  },
  state: {
    type: 'text',
    icon: 'map',
    description: 'State'
  },
  zip: {
    type: 'text',
    icon: 'map',
    description: 'Zip code'
  },
  country: {
    type: 'text',
    icon: 'map',
    description: 'Coumtry'
  },
  username: {
    type: 'text',
    icon: 'user',
    unique: true
  },
  image: {
    type: 'image',
    description: 'User image'
  }
}
