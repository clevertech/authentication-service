module.exports = env => {
  // If we don't have a DATABASE_ENGINE, default to postgres (as we had before)
  const databaseEngine = env('DATABASE_ENGINE', 'pg')
  // If we have a relational database, just grab the knex adapter
  if (['mysql', 'pg'].indexOf(databaseEngine) !== -1) {
    return require('./knex')(env)
  // Otherwise, grab the specific database adapter
  } else if (databaseEngine === 'mongodb') {
    return require('./mongodb')(env)
  } else {
    throw new Error(`Unknown database engine ${databaseEngine}`)
  }
}
