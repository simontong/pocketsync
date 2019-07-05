'use strict';

const { api } = require('./api');
const { downloadAccounts } = require('./downloadAccounts');
const { downloadCategories } = require('./downloadCategories');
const { downloadTransactions, newestTransactionDate } = require('./downloadTransactions');
const uploadTransactions = require('./uploadTransactions');

module.exports = (ctx) => ({
  meta: {
    code: 'FREEAG',
    isSource: true,
    isTarget: true,
  },

  api: api(ctx),
  downloadAccounts: downloadAccounts(ctx),
  downloadCategories: downloadCategories(ctx),
  newestTransactionDate: newestTransactionDate(ctx),
  downloadTransactions: downloadTransactions(ctx),
  uploadTransactions: uploadTransactions(ctx),
});
