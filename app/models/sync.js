'use strict';

const baseModel = require('../models/baseModel');

const tableName = 'syncs';

const transaction = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Fetch by sync name
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
   * get by user id
   * @param userId
   * @return {Knex.QueryBuilder}
   */
  byUserId(userId) {
    return db
      .table(tableName)
      .whereIn(
        'source_account_id',
        db
          .table('accounts')
          .select('id')
          .where('user_id', userId),
      )
      .orderBy('name');
  },

  /**
   * Update or create sync
   * @param name
   * @param sourceAccountId
   * @param targetAccountId
   * @return {*|Promise<Knex.QueryBuilder>}
   */
  updateOrCreateSync(name, sourceAccountId, targetAccountId) {
    const params = {
      name,
      source_account_id: sourceAccountId,
      target_account_id: targetAccountId,
    };
    const where = {
      source_account_id: params.source_account_id,
      target_account_id: params.target_account_id,
    };

    return this.updateOrCreate(params, where);
  },
});

module.exports = transaction;
