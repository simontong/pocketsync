'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'transactions';

const transaction = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Update or create transaction
   * @param params
   * @return {*|Promise<Knex.QueryBuilder>}
   */
  updateOrCreateTransaction(params) {
    const where = {
      account_id: params.account_id,
      provider_ref: params.provider_ref,
    };

    // check db params match passed params for should update
    const shouldUpdateFn = (newParams, oldParams) => {
      return _.filter(newParams, (val, key) => oldParams[key] !== val).length;
    };

    return this.updateOrCreate(params, where, shouldUpdateFn);
  },
});

module.exports = transaction;
