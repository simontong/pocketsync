'use strict';

const api = require('./api');
const { storeFetched, storeNormalized } = require('../../core/helpers');
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
 * Fetch accounts from API and store in `apis` table
 * @param ctx
 * @return {Promise<*>}
 */
const fetchAccounts = async (ctx) => {
  const { log } = ctx;
  const req = api(ctx);

  // fetch accounts
  const data = await req.fetchAccounts();
  log.trace('%d accounts fetched', data.length);

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
  return storeFetched(ctx, data, 'account', 'id');
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
      currency: data.currency.toUpperCase(),
      // starting_balance: toLowestCommonUnit(data.starting_balance),
    };
  });
};

module.exports = {
  downloadAccounts,
  storeFetchedAccounts,
  storeNormalizedAccounts,
};
