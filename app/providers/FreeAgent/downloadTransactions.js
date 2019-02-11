'use strict';

const _ = require('lodash');
const { api, extractId } = require('./api');
const moment = require('moment');
const shouldRefreshToken = require('./shouldRefreshToken');
const { processTransactions, toLowestCommonUnit } = require('../../core/helpers');
const schema = require('./schemas/transaction');

/**
 * Get most recent transaction date so we can figure out where to sync from
 * @param ctx
 * @return {Function}
 */
const newestTransactionDate = (ctx) => async (account) => {
  const data = await fetchTransactions(ctx, {
    bankAccount: account.provider_ref,
    perPage: 1,
  })();

  // no rows found? return null
  if (!data.length) {
    return null;
  }

  // figure out more recently completed transaction
  return _.maxBy(data, (i) => moment(i.dated_on).valueOf()).dated_on;
};

/**
 * Fetch and normalize transactions
 * @param ctx
 * @return {Function}
 */
const downloadTransactions = (ctx) => async (account, fromDate) => {
  if (fromDate) {
    fromDate = moment(fromDate).format('YYYY-MM-DD');
  }

  // prep fetch function
  const fetchTransactionsFn = fetchTransactions(ctx, {
    bankAccount: account.provider_ref,
    fromDate,
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
 * @return {Promise<function(): Promise<*|Knex.QueryBuilder>>}
 */
const fetchTransactions = (ctx, apiParams) => {
  const req = api(ctx);

  return async function fetchTransactions() {
    let data;
    try {
      data = await req.fetchTransactions(apiParams);
    } catch (e) {
      await shouldRefreshToken(ctx, e);
      return fetchTransactions();
    }

    // next page
    apiParams.page = (apiParams.page || 1) + 1;

    return data.bank_transactions;
  };
};

/**
 * transaction provider ref getter
 * @param transaction
 * @return {*}
 */
const getTransactionProviderRef = (transaction) => {
  return extractId('bank_transactions', transaction.url);
};

/**
 * Normalize transaction
 * @param account
 * @return {*}
 */
const normalizeTransaction = (account) => (row) => {
  const data = row.data;

  // normalize
  const [, payee, memo] = data.description.match(/(.+)\/(.*)\/(.*)\/$/);
  const amount = toLowestCommonUnit(data.amount);
  const date = moment(data.dated_on).format('YYYY-MM-DD');
  const isTransfer = _.get(row, 'bank_transaction_explanations.0.linked_transfer_account') ? 1 : 0;

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
