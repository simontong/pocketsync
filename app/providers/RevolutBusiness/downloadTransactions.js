'use strict';

const _ = require('lodash');
const api = require('./api');
const moment = require('moment');
const { storeFetched, storeNormalized, toLowestCommonUnit } = require('../../core/helpers');
const schema = require('./schemas/transaction');

/**
 * Fetch and normalize transactions
 * @param ctx
 * @return {Function}
 */
const downloadTransactions = (ctx) => async (account, fromDate) => {
  const from = moment(fromDate || 0).toISOString();
  const to = moment()
    .endOf('day')
    .toISOString();

  // prep fetch params
  const fetchTransactions = prepFetchTransactions(ctx, {
    perPage: 1000,
    from,
    to,
  });

  // fetch and save transactions based on date
  const transactions = [];
  while (true) {
    // fetch next set of data from API
    const rows = await fetchTransactions();

    // no rows? bail
    if (!rows.length) {
      break;
    }

    // normalize
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
  const { log } = ctx;
  const req = api(ctx);
  let oldestTransaction = null;

  return async () => {
    // fetch transactions from api
    const data = await req.fetchTransactions(apiParams);
    log.trace('%d transactions fetched', data.length);

    // get `to` date for next set of records
    const prevTransaction = oldestTransaction;
    oldestTransaction = _.minBy(data, (o) => moment(o.created_at).valueOf());

    // if previously `newestTransaction` === `newestTransaction` don't fetch anymore records
    if (prevTransaction && oldestTransaction.id === prevTransaction.id) {
      return [];
    }

    // increment date for latest fetch
    apiParams.to = moment(oldestTransaction.created_at)
      .endOf('day')
      .toISOString();

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
 * @param matchAccount
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeNormalizedTransactions = async (ctx, rows, matchAccount = null) => {
  const { log, model, providerRow, userRow } = ctx;

  // get all accounts (Revolut Business API returns transactions for all accounts at once)
  // meaning it returns all transactions for all currencies
  const accounts = await model('account').find({
    user_id: userRow.id,
    provider_id: providerRow.id,
  });

  return storeNormalized(ctx, rows, 'transaction', schema, (row) => {
    const data = row.data;

    // only normalize completed transactions
    if (!data.completed_at) {
      log.info('[apis.id=%d] Ignoring transaction with no completed_at date set', row.id);
      return;
    }

    // transactions might have two legs (transfer between accounts)
    // so we to create two separate transactions
    for (const leg of data.legs) {
      const account = accounts.find((a) => a.provider_ref === leg.account_id);

      // skip normalizing transactions that aren't matching `matchAccount`
      if (matchAccount && matchAccount.id !== account.id) {
        continue;
      }

      const payee = leg.description;
      const amount = toLowestCommonUnit(leg.amount);
      const date = data.created_at && moment(data.created_at).format('YYYY-MM-DD');
      const isTransfer = data.legs.length === 2 && ['exchange', 'transfer'].includes(data.type) ? 1 : 0;
      // const note = data.reference || null;

      return {
        account_id: account.id,
        provider_ref: leg.leg_id,
        payee,
        amount,
        date,
        is_transfer: isTransfer,
        // note,
      };
    }
  });
};

module.exports = {
  downloadTransactions,
  storeFetchedTransactions,
  storeNormalizedTransactions,
};
