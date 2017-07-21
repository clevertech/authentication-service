module.exports = env => {
  // If we have a relational database, just grab the relational adapter
  if(['mysql', 'pg'].indexOf(env('DATABASE_ENGINE')) !== -1) {
    return require('./adapters/relational')(env);
  // Otherwise, grab the specific database adapter
  } else {
    return require(`./adapters/${env('DATABASE_ENGINE')}`)(env);
  }
}
