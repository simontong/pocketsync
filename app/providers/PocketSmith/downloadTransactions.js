'use strict';

const _ = require('lodash');
const api = require('./api');
const moment = require('moment');
const { processTransactions, toLowestCommonUnit } = require('../../core/helpers');
const schema = require('./schemas/transaction');

/**
 * Fetch most recent transaction from API
 * @param ctx
 * @return {Function}
 */
const newestTransactionDate = (ctx) => async (account) => {
  const data = await fetchTransactions(ctx, {
    accountId: account.provider_ref,
    perPage: 10,
  })();

  if (!data.length) {
    return null;
  }

  // figure out more recently completed transaction
  return _.maxBy(data, (i) => moment(i.date).valueOf()).date;
};

/**
 * Fetch and normalize transactions
 * @param ctx
 * @return {Function}
 */
const downloadTransactions = (ctx) => async (account, fromDate) => {
  let endDate;
  if (fromDate) {
    fromDate = moment(fromDate).format('YYYY-MM-DD');
    endDate = moment().format('YYYY-MM-DD');
  }

  // prep fetch function
  const fetchTransactionsFn = fetchTransactions(ctx, {
    accountId: account.provider_ref,
    startDate: fromDate,
    endDate,
  });

  return processTransactions(
    ctx,
    schema,
    fetchTransactionsFn,
    getTransactionProviderRef,
    normalizeTransaction(account),
  );
};

/**
 * Fetch transactions
 * @param ctx
 * @param apiParams
 * @return {Promise<Array|Knex.QueryBuilder>}
 */
const fetchTransactions = (ctx, apiParams) => {
  const req = api(ctx);

  return async () => {
    let data;
    try {
      data = await req.fetchTransactions(apiParams);
    } catch (e) {
      // if page out of bounds (no more pages left, also returns status code 400)
      if (_.get(e, 'error.error') === 'Requested page is out of bounds') {
        return [];
      }
      throw new Error(e);
    }

    // next page
    apiParams.page = (apiParams.page || 1) + 1;

    return data;
  };
};

/**
 * transaction provider ref getter
 * @param transaction
 * @return {*}
 */
const getTransactionProviderRef = (transaction) => {
  return transaction.id;
};

/**
 * Normalize transaction
 * @param account
 * @return {*}
 */
const normalizeTransaction = (account) => (row) => {
  const data = row.data;

  // normalize
  const payee = data.original_payee;
  // const memo = data.memo.trim() || null;
  // const note = data.note.trim() || null;
  const amount = toLowestCommonUnit(data.amount);
  const date = moment(data.date).format('YYYY-MM-DD');
  const isTransfer = data.is_transfer ? 1 : 0;

  return {
    account_id: account.id,
    provider_ref: row.provider_ref,
    payee,
    amount,
    date,
    is_transfer: isTransfer,
    // memo,
  };
};

module.exports = {
  newestTransactionDate,
  downloadTransactions,
  getTransactionProviderRef,
  normalizeTransaction,
};
