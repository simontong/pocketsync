'use strict';

const _ = require('lodash');
const knex = require('knex');
const path = require('path');

/**
 * @param config
 * @param log
 * @return {Knex.QueryBuilder | Knex}
 */
const useDb = (config, log) => {
  const opts = config.database[process.env.NODE_ENV || 'development'];
  let connection;

  return async () => {
    // check if connection was closed or has not yet been opened
    const connectionClosed = _.get(connection, 'client.pool.destroyed', true);
    if (!connectionClosed) {
      return connection;
    }

    // prep connection
    connection = knex(opts);

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

module.exports = { useDb, useModels };
