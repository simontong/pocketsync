'use strict';

const _ = require('lodash');
const baseModel = require('../models/baseModel');

const tableName = 'sync_transaction';

const syncTransaction = (db) => ({
  ...baseModel(db, tableName),

  /**
   * Update or create sync transaction
   * @param syncId
   * @param transactionId
   * @return {*|Promise<*>}
   */
  updateOrCreateSyncTransaction(syncId, transactionId) {
    const params = {
      sync_id: syncId,
      transaction_id: transactionId,
    };

    const where = {
      sync_id: syncId,
      transaction_id: transactionId,
    };

    // should update function
    const shouldUpdateFn = (newParams, oldParams) => !_.isEqual(newParams, oldParams);

    return this.updateOrCreate(params, where, shouldUpdateFn);
  },

  /**
   * Delete sync transaction by transaction id
   * @param syncId
   * @param transactionId
   * @return {Knex.QueryBuilder}
   */
  deleteByTransactionId(syncId, transactionId) {
    transactionId = Array.isArray(transactionId) ? transactionId : [transactionId];
    return db
      .table(tableName)
      .where('sync_id', syncId)
      .whereIn('transaction_id', transactionId)
      .delete();
  },
});

module.exports = syncTransaction;
