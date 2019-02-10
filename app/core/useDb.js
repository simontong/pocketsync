'use strict';

const knex = require('knex');
const path = require('path');

/**
 * @param config
 * @param log
 * @return {Knex.QueryBuilder | Knex}
 */
const connectDb = async (config, log) => {
  const opts = config.database[process.env.NODE_ENV || 'development'];

  // prep connection
  const connection = knex(opts);

  // execute query to make sure connection actually works
  try {
    await connection.raw('select 1 as connectionCheck');
  } catch (e) {
    await connection.destroy();
    throw e;
  }

  // success, log db opened
  log.trace(`Open ${opts.connection.database} database`);

  return connection;
};

/**
 * @param db
 * @return {function(*=): *}
 */
const useModels = (db) => {
  return (modelName) => {
    const modelFile = path.join(__dirname, '../models/', modelName);
    return require(modelFile)(db);
  };
};

module.exports = { connectDb, useModels };
