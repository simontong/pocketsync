'use strict';

const baseModel = require('../models/baseModel');

const tableName = 'configs';

const config = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Get config value by key
   * @param userId
   * @param providerId
   * @param key
   * @returns {*}
   */
  byKey(userId, providerId, key) {
    return db
      .table(tableName)
      .where({
        user_id: userId,
        provider_id: providerId,
      })
      .first();
  },

  /**
   * Update config
   * @param userId
   * @param providerId
   * @param config
   * @return {Knex.QueryBuilder}
   */
  async updateOrCreateConfig(userId, providerId, config) {
    if (typeof config !== 'string') {
      config = JSON.stringify(config);
    }

    const params = {
      user_id: userId,
      provider_id: providerId,
      config,
    };

    const where = {
      user_id: userId,
      provider_id: providerId,
    };

    return this.updateOrCreate(params, where);
  },
});

module.exports = config;
