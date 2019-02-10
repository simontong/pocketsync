'use strict';

const baseModel = require('../models/baseModel');

const tableName = 'users';

const user = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Fetch by user
   * @param user
   * @return {Knex.QueryBuilder}
   */
  byUser(user) {
    return db
      .table(tableName)
      .where({ user })
      .first();
  },
});

module.exports = user;
