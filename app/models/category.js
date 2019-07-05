'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'categories';

const category = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Update or create category
   * @param params
   * @return {*|Promise<Knex.QueryBuilder>}
   */
  updateOrCreateCategory(params) {
    const where = {
      user_id: params.user_id,
      provider_id: params.provider_id,
      provider_ref: params.provider_ref,
    };

    // check db params match passed params for should update
    const shouldUpdateFn = (newParams, oldParams) => {
      return _.filter(newParams, (val, key) => oldParams[key] !== val).length;
    };

    return this.updateOrCreate(params, where, shouldUpdateFn);
  },
});

module.exports = category;
