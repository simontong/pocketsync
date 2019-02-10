'use strict';

const api = require('./api');
const { downloadAccounts } = require('./downloadAccounts');
const { downloadTransactions } = require('./downloadTransactions');

module.exports = (ctx) => ({
  meta: {
    isSource: true,
    isTarget: false,
  },

  api: api(ctx),
  downloadAccounts: downloadAccounts(ctx),
  downloadTransactions: downloadTransactions(ctx),
});
