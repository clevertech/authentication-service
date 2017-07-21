module.exports = env => {
  // If we have a relational database, just grab the knex adapter
  if (['mysql', 'pg'].indexOf(env('DATABASE_ENGINE')) !== -1) {
    return require('./knex')(env)
  // Otherwise, grab the specific database adapter
  } else if (env('DATABASE_ENGINE') === 'mongodb') {
    return require('./mongodb')(env)
  // If we don't have a DATABASE_ENGINE, default to postgres (as we had before)
  } else {
    env('DATABASE_ENGINE', 'pg')
    return require('./knex')(env)
  }
}
