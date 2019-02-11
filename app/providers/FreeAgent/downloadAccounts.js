'use strict';

const { api, extractId } = require('./api');
const { processAccounts } = require('../../core/helpers');
const shouldRefreshToken = require('./shouldRefreshToken');
const schema = require('./schemas/account');

/**
 * Fetch and normalize accounts
 * @param ctx
 * @return {function(): Promise<*|Knex.QueryBuilder>}
 */
const downloadAccounts = (ctx) => async () => {
  return processAccounts(ctx, schema, fetchAccounts, getAccountProviderRef, normalizeAccount);
};

/**
 * Fetch accounts
 * @param ctx
 * @return {Promise<function(): Promise<*|Knex.QueryBuilder>>}
 */
const fetchAccounts = async (ctx) => {
  const req = api(ctx);
  let data;
  try {
    data = await req.fetchAccounts();
  } catch (e) {
    await shouldRefreshToken(ctx, e);
    return fetchAccounts(ctx);
  }

  return data.bank_accounts;
};

/**
 * account provider ref getter
 * @param transaction
 * @return {*}
 */
const getAccountProviderRef = (transaction) => {
  return extractId('bank_accounts', transaction.url);
};

/**
 * Normalize API data from account fetch
 * @param row
 * @return {*}
 */
const normalizeAccount = (row) => {
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
};

module.exports = {
  downloadAccounts,
  getAccountProviderRef,
  normalizeAccount,
};
