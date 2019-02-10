'use strict';

const { api, extractId } = require('./api');
const { storeFetched, storeNormalized } = require('../../core/helpers');
const shouldRefreshToken = require('./shouldRefreshToken');
const schema = require('./schemas/account');

/**
 * Fetch and normalize accounts
 * @param ctx
 * @return {function(): Promise<*|Knex.QueryBuilder>}
 */
const downloadAccounts = (ctx) => async () => {
  // fetch data from API
  const rows = await fetchAccounts(ctx);

  // no data? bail
  if (!rows.length) {
    return [];
  }

  // normalize fetched data
  return storeNormalizedAccounts(ctx, rows);
};

/**
 * Fetch accounts
 * @param ctx
 * @return {Promise<function(): Promise<*|Knex.QueryBuilder>>}
 */
const fetchAccounts = async (ctx) => {
  const req = api(ctx);
  const { log } = ctx;

  // fetch accounts
  let data;
  try {
    data = await req.fetchAccounts();
  } catch (e) {
    await shouldRefreshToken(ctx, e);
    return fetchAccounts(ctx);
  }

  // log fetched
  log.trace('%d accounts fetched', data.bank_accounts.length);

  // store fetched data in db
  return storeFetchedAccounts(ctx, data);
};

/**
 * Store fetched accounts in db
 * @param ctx
 * @param data
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeFetchedAccounts = (ctx, data) => {
  return storeFetched(ctx, data.bank_accounts, 'account', (row) => {
    return extractId('bank_accounts', row.url);
  });
};

/**
 * Normalize accounts from `apis` table
 * @param ctx
 * @param rows
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeNormalizedAccounts = async (ctx, rows) => {
  return storeNormalized(ctx, rows, 'account', schema, (row) => {
    const data = row.data;

    // normalize
    return {
      user_id: row.user_id,
      provider_id: row.provider_id,
      provider_ref: row.provider_ref,
      name: data.name,
      currency: data.currency,
      // starting_balance: toLowestCommonUnit(data.opening_balance),
    };
  });
};

module.exports = {
  downloadAccounts,
  storeFetchedAccounts,
  storeNormalizedAccounts,
};
