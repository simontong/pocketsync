'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'providers';

const provider = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Fetch by provider name
   * @param name
   * @return {Knex.QueryBuilder}
   */
  byName(name) {
    return db
      .table(tableName)
      .where({ name })
      .first();
  },

  /**
   * Get providers for displaying in select list
   * @param where
   * @return {Knex.QueryBuilder}
   */
  getForSelectList(...where) {
    return db
      .table(tableName)
      .where(...where)
      .orderBy('name')
      .pluck('name');
  },

  /**
   * Find or create provider
   * @param params
   * @return {*|Promise<*|*>}
   */
  updateOrCreateProvider(params) {
    const where = {
      name: params.name,
    };

    // fix params (so that shouldUpdateFn matches number always from db)
    params.is_source = Number(params.is_source);
    params.is_target = Number(params.is_target);

    // should update function
    const shouldUpdateFn = (newParams, oldParams) => {
      return _.filter(newParams, (val, key) => oldParams[key] !== val).length;
    };

    return this.updateOrCreate(params, where, shouldUpdateFn);
  },
});

module.exports = provider;
