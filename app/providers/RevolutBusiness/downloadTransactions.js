'use strict';

const _ = require('lodash');
const api = require('./api');
const moment = require('moment');
const { processTransactions, toLowestCommonUnit } = require('../../core/helpers');
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
  const fetchTransactionsFn = fetchTransactions(ctx, {
    perPage: 1000,
    from,
    to,
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
  let oldestTransaction = null;

  return async () => {
    const data = await req.fetchTransactions(apiParams);

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
 * @return {Function}
 */
const normalizeTransaction = (account) => (row) => {
  const data = row.data;

  // only normalize completed transactions
  if (!data.completed_at) {
    return null;
  }

  // transactions might have two legs (transfer between accounts)
  // so we to create two separate transactions
  for (const leg of data.legs) {
    // skip normalizing transactions that aren't matching `matchAccount`
    if (account.provider_ref !== leg.account_id) {
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
};

module.exports = {
  downloadTransactions,
  getTransactionProviderRef,
  normalizeTransaction,
};
