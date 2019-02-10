'use strict';

const _ = require('lodash');
const api = require('./api');
const moment = require('moment');
const { storeFetched, storeNormalized, toLowestCommonUnit } = require('../../core/helpers');
const schema = require('./schemas/transaction');

/**
 * Get most recent transaction date so we can figure out where to sync from
 * @param ctx
 * @return {Function}
 */
const newestTransactionDate = (ctx) => async (account) => {
  const rows = await prepFetchTransactions(ctx, {
    accountId: account.provider_ref,
    perPage: 10,
  })();

  // no rows found? return null
  if (!rows.length) {
    return null;
  }

  // get most up to date transaction date
  const newestTransaction = _.maxBy(rows, (i) => moment(i.data.date).valueOf());
  return newestTransaction.data.date;
};

/**
 * Fetch and normalize transactions
 * @param ctx
 * @return {Function}
 */
const downloadTransactions = (ctx) => async (account, fromDate) => {
  // format from date (if passed)
  let endDate;
  if (fromDate) {
    fromDate = moment(fromDate).format('YYYY-MM-DD');
    endDate = moment().format('YYYY-MM-DD');
  }

  // prep fetch params
  const fetchTransactions = prepFetchTransactions(ctx, {
    accountId: account.provider_ref,
    page: 1,
    startDate: fromDate,
    endDate,
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
 * @return {Promise<Array|Knex.QueryBuilder>}
 */
const prepFetchTransactions = (ctx, apiParams) => {
  const req = api(ctx);
  const { log } = ctx;

  return async () => {
    // fetch transactions from api
    let data;
    try {
      data = await req.fetchTransactions(apiParams);
    } catch (e) {
      // if page out of bounds (no more pages left, also returns status code 400)
      if (_.get(e, 'error.error') === 'Requested page is out of bounds') {
        log.trace('%d transactions fetched', 0);
        return [];
      }
      throw new Error(e);
    }

    // log fetched
    log.trace('%d transactions fetched', data.length);

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
  return storeFetched(ctx, data, 'transaction', 'id');
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
  });
};

module.exports = {
  newestTransactionDate,
  downloadTransactions,
  storeFetchedTransactions,
  storeNormalizedTransactions,
};
