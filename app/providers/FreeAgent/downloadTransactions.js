'use strict';

const _ = require('lodash');
const { api, extractId } = require('./api');
const moment = require('moment');
const shouldRefreshToken = require('./shouldRefreshToken');
const { storeFetched, storeNormalized, toLowestCommonUnit } = require('../../core/helpers');
const schema = require('./schemas/transaction');

/**
 * Get most recent transaction date so we can figure out where to sync from
 * @param ctx
 * @return {Function}
 */
const newestTransactionDate = (ctx) => async (account) => {
  const rows = await prepFetchTransactions(ctx, {
    bankAccount: account.provider_ref,
    perPage: 1,
  })();

  // no rows found? return null
  if (!rows.length) {
    return null;
  }

  // get most up to date transaction date
  const newestTransaction = _.maxBy(rows, (i) => moment(i.data.dated_on).valueOf());
  return newestTransaction.data.dated_on;
};

/**
 * Fetch and normalize transactions
 * @param ctx
 * @return {Function}
 */
const downloadTransactions = (ctx) => async (account, fromDate) => {
  // format from date (if passed)
  if (fromDate) {
    fromDate = moment(fromDate).format('YYYY-MM-DD');
  }

  // prep fetch params
  const fetchTransactions = prepFetchTransactions(ctx, {
    bankAccount: account.provider_ref,
    fromDate,
  });

  // fetch and save transactions based on date
  const transactions = [];
  while (true) {
    // fetch next set of data from API
    const rows = await fetchTransactions();

    // no data? bail
    if (!rows.length) {
      break;
    }

    // normalize fetched data
    const normalized = await storeNormalizedTransactions(ctx, rows, account);
    transactions.push(...normalized);
  }

  // no transactions?
  if (!transactions.length) {
    return [];
  }

  // return unique set of transactions
  return _(transactions)
    .uniqBy('id')
    .value();
};

/**
 * Fetch transactions
 * @param ctx
 * @param apiParams
 * @return {Promise<function(): Promise<*|Knex.QueryBuilder>>}
 */
const prepFetchTransactions = (ctx, apiParams) => {
  const req = api(ctx);
  const { log } = ctx;

  return async function fetchTransactions() {
    // fetch transactions from api
    let data;
    try {
      data = await req.fetchTransactions(apiParams);
    } catch (e) {
      await shouldRefreshToken(ctx, e);
      return fetchTransactions();
    }

    // log fetched
    log.trace('%d transactions fetched', data.bank_transactions.length);

    // next page
    apiParams.page = (apiParams.page || 1) + 1;

    // store fetched data in db
    return storeFetchedTransactions(ctx, data);
  };
};

/**
 * Store fetched transactions in db
 * @param ctx
 * @param data
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeFetchedTransactions = (ctx, data) => {
  return storeFetched(ctx, data.bank_transactions, 'transaction', (item) => {
    return extractId('bank_transactions', item.url);
  });
};

/**
 * Normalize transactions from api
 * @param ctx
 * @param rows
 * @param account
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeNormalizedTransactions = async (ctx, rows, account) => {
  return storeNormalized(ctx, rows, 'transaction', schema, (row) => {
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
  });
};

module.exports = {
  newestTransactionDate,
  downloadTransactions,
  storeFetchedTransactions,
  storeNormalizedTransactions,
};
