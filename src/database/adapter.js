module.exports = env => {
  // If we have a relational database, just grab the relational adapter
  if(['mysql', 'pg'].indexOf(env) !== -1) {
    return require('./adapters/relational');
  // Otherwise, grab the specific database adapter
  } else {
    return require(`./adapters/${env('DATABASE_ENGINE')}`)(env);
  }
}
