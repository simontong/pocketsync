'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'accounts';

const account = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Update or create account
   * @param params
   * @return {*|Promise<Knex.QueryBuilder>}
   */
  updateOrCreateAccount(params) {
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

module.exports = account;
