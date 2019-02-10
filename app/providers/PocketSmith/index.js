'use strict';

const api = require('./api');
const { downloadAccounts } = require('./downloadAccounts');
const { downloadTransactions, newestTransactionDate } = require('./downloadTransactions');
const uploadTransactions = require('./uploadTransactions');

module.exports = (ctx) => ({
  meta: {
    isSource: true,
    isTarget: true,
  },

  api: api(ctx),
  downloadAccounts: downloadAccounts(ctx),
  newestTransactionDate: newestTransactionDate(ctx),
  downloadTransactions: downloadTransactions(ctx),
  uploadTransactions: uploadTransactions(ctx),
});
