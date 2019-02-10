'use strict';

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// get env vars for default
const defaultEnv = dotenv.config({ path: '.env' });
let testingEnv;
if (fs.existsSync(path.join(__dirname, '../.env.testing'))) {
  testingEnv = dotenv.config({ path: '.env.testing' });
}

// default opts (development or production, depends on your .env)
const defaultOptions = {
  client: 'mysql2',
  connection: {
    host: defaultEnv.parsed.DB_HOST || '127.0.0.1',
    database: defaultEnv.parsed.DB_DATABASE,
    user: defaultEnv.parsed.DB_USER,
    password: defaultEnv.parsed.DB_PASSWORD,
  },
  // pool: {
  //   min: 2,
  //   max: 10
  // },
  migrations: {
    tableName: 'knex_migrations',
    directory: `${__dirname}/../database/migrations`,
  },
};

/**
 * config
 */
const opts = {
  /**
   * config
   */
  development: {
    ...defaultOptions,
    seeds: {
      directory: `${__dirname}/../database/seeds/development`,
    },
  },

  /**
   * config
   */
  production: {
    ...defaultOptions,
    seeds: {
      directory: `${__dirname}/../database/seeds/production`,
    },
  },
};

// add testing
if (testingEnv) {
  opts.testing = {
    ...defaultOptions,
    connection: {
      database: testingEnv.parsed.DB_DATABASE,
      user: testingEnv.parsed.DB_USER,
      password: defaultEnv.parsed.DB_PASSWORD,
    },
    seeds: {
      directory: `${__dirname}/../database/seeds/testing`,
    },
  };
}

module.exports = opts;
