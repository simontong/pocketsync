'use strict';

const _ = require('lodash');
const Ajv = require('ajv');
const { Base64 } = require('js-base64');

// ISO 4217 decimals - https://en.wikipedia.org/wiki/ISO_4217#cite_note-ReferenceA-7
const CURRENCY_SCALE = {
  cents: 2, // cents
  BTC: 8, //satoshi
  // LTC: 8, // litoshi
  // ETH: 18, // ethereum wei
};

/**
 * Convert amounts to lowest common unit (cents, satoshi, wei etc.)
 * @param amount
 * @param currency
 * @return {number}
 */
const toLowestCommonUnit = (amount, currency = 'cents') => {
  // calculate precision
  const precision = Math.pow(10, CURRENCY_SCALE[currency] || CURRENCY_SCALE.cents);

  // round to nearest whole so we don't get the floating point issue
  return Math.round(amount * precision);
};

/**
 * Convert amounts to dollars/bitcoin etc. from cents, satoshi etc.
 * @param amount
 * @param currency
 * @returns {string}
 */
const fromLowestCommonUnit = (amount, currency = 'cents') => {
  // calculate precision
  const scale = CURRENCY_SCALE[currency] || CURRENCY_SCALE.cents;
  const precision = Math.pow(10, scale);

  // round to nearest whole so we don't get the floating point issue
  return (amount / precision).toFixed(scale);
};

/**
 * Result counter for updates
 * @return {*}
 */
const resultCounter = () => {
  const result = { created: 0, updated: 0, total: 0, ids: [] };

  return {
    /**
     * Get outcome
     * @return {{total: number, created: number, ids: Array, updated: number}}
     */
    get () {
      return result;
    },

    /**
     * Increase count
     * @param created
     * @param updated
     * @param id
     */
    add ({ created = 0, updated = 0, id = null }) {
      if (id) {
        result.ids.push(id);
      }
      result.created += created;
      result.updated += updated;
      result.total += 1;
    },
  };
};

/**
 * Process accounts (fetch, store, normalize)
 * @param ctx
 * @param schema
 * @param fetchFn
 * @param getProviderRef
 * @param normalizeFn
 * @return {Promise<Array|*>}
 */
const processAccounts = async (ctx, schema, fetchFn, getProviderRef, normalizeFn) => {
  const { log } = ctx;

  // fetch data from API
  const data = await fetchFn(ctx);
  log.trace('%d accounts fetched', data.length);

  // no data? bail
  if (!data.length) {
    return [];
  }

  // store api data
  const rows = await storeFetched(ctx, data, 'account', getProviderRef);

  // store fetched data in db
  return storeNormalized(ctx, rows, 'account', schema, normalizeFn);
};

/**
 * Process categories (fetch, store, normalize)
 * @param ctx
 * @param schema
 * @param fetchFn
 * @param getProviderRef
 * @param normalizeFn
 * @return {Promise<Array|*>}
 */
const processCategories = async (ctx, schema, fetchFn, getProviderRef, normalizeFn) => {
  const { log } = ctx;

  // fetch data from API
  const data = await fetchFn(ctx);
  log.trace('%d categories fetched', data.length);

  // no data? bail
  if (!data.length) {
    return [];
  }

  // store api data
  const rows = await storeFetched(ctx, data, 'category', getProviderRef);

  return storeNormalized(ctx, rows, 'category', schema, normalizeFn);
};

/**
 * Process transactions (fetch, store, normalize)
 * @param ctx
 * @param schema
 * @param fetchFn
 * @param getProviderRef
 * @param normalizeFn
 * @return {Promise<Array|*>}
 */
const processTransactions = async (ctx, schema, fetchFn, getProviderRef, normalizeFn) => {
  const { log } = ctx;

  // fetch and save transactions based on date
  const transactions = [];
  while (true) {
    // fetch next set of data from API
    const data = await fetchFn();
    log.trace('%d transactions fetched', data.length);

    // no rows? bail
    if (!data.length) {
      break;
    }

    // store api data
    const rows = await storeFetched(ctx, data, 'transaction', getProviderRef);

    // normalize
    const normalized = await storeNormalized(ctx, rows, 'transaction', schema, normalizeFn);
    transactions.push(...normalized);
  }

  // no transactions?
  if (!transactions.length) {
    return [];
  }

  // return unique set of transactions
  return _.uniqBy(transactions, 'id');
};

/**
 * Store api fetched data in db
 * @param ctx
 * @param data
 * @param type
 * @param getProviderRef
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeFetched = async (ctx, data, type, getProviderRef) => {
  const { log, model, providerRow, userRow } = ctx;

  // save api fetch
  const countResult = resultCounter();
  for (const item of data) {
    const providerRef = typeof getProviderRef === 'function' ? getProviderRef(item) : item[getProviderRef];
    countResult.add(await model('api').updateOrCreateApi(type, userRow.id, providerRow.id, providerRef, item));
  }
  const { created, updated, total, ids } = countResult.get();
  log.debug(
    '%s stored - Created:%d, Updated:%d, Total:%d',
    type.charAt(0).toUpperCase() + type.slice(1),
    created,
    updated,
    total,
  );

  // fetch newly created/updated rows
  return model('api').byId(ids);
};

/**
 * Normalize data for API and store in db
 * @param ctx
 * @param rows
 * @param type
 * @param schema
 * @param normalizeFn
 * @return {Promise<*|Knex.QueryBuilder>}
 */
const storeNormalized = async (ctx, rows, type, schema, normalizeFn) => {
  const { log, model } = ctx;
  const ajv = new Ajv({ allErrors: true, coerceTypes: true });

  const updateFn = {
    account: (...args) => model('account').updateOrCreateAccount(...args),
    category: (...args) => model('category').updateOrCreateCategory(...args),
    transaction: (...args) => model('transaction').updateOrCreateTransaction(...args),
  };

  // make sure update function exists
  if (!updateFn[type]) {
    throw new Error(`Invalid type ${type}`);
  }

  const countResult = resultCounter();
  for (const row of rows) {
    // schema check
    if (schema) {
      const valid = ajv.validate(schema, row.data);
      if (!valid) {
        log.warn('[apis.id=%d] JSON validation failed:', row.id, ajv.errorsText());
        continue;
      }
    }

    // get normalized data from provider
    const data = normalizeFn(row, rows);
    if (!data) {
      continue;
    }

    // save and count
    countResult.add(await updateFn[type](data));
  }
  const { created, updated, total, ids } = countResult.get();
  log.debug(
    '%s normalized - Created:%d, Updated:%d, Total:%d',
    type.charAt(0).toUpperCase() + type.slice(1),
    created,
    updated,
    total,
  );

  return model(type).byId(ids);
};

/**
 * fetch attachment and return as base64
 * @param ctx
 * @param url
 * @returns {Promise<string>}
 */
const fetchAttachment = async ({ request }, url) => {
  if (!url || !/^https?:/.test(url)) {
    return null;
  }

  const data = await request({ url });
  return Base64.encode(data);
};

module.exports = {
  resultCounter,
  toLowestCommonUnit,
  fromLowestCommonUnit,
  processAccounts,
  processCategories,
  processTransactions,
  storeFetched,
  storeNormalized,
  fetchAttachment,
};
