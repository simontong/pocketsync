'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'apis';

const api = (db) => ({
  ...baseModel(db, tableName),

  /**
   * allowed types
   * @return {string[]}
   */
  get types() {
    return ['account', 'category', 'transaction'];
  },

  /**
   * Save api fetch
   * @param type
   * @param userId
   * @param providerId
   * @param providerRef
   * @param data
   * @return {Knex.QueryBuilder}
   * @private
   */
  async updateOrCreateApi(type, userId, providerId, providerRef, data) {
    if (!this.types.includes(type)) {
      throw new Error(`Invalid type ${type}`);
    }

    const where = {
      user_id: userId,
      provider_id: providerId,
      type,
      provider_ref: providerRef,
    };

    const params = {
      user_id: userId,
      provider_id: providerId,
      type,
      provider_ref: providerRef,
      data: JSON.stringify(data),
    };

    // compares data from API with data stored in db
    const shouldUpdateFn = (newParams, oldParams) => !_.isEqual(data, oldParams.data);

    return this.updateOrCreate(params, where, shouldUpdateFn);
  },
});

module.exports = api;
