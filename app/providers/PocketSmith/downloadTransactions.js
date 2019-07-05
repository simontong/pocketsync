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
    fromDate = moment('2019-01-01').format('YYYY-MM-DD');
    endDate = moment().format('YYYY-MM-DD');
  }

  // prep fetch function
  const fetchTransactionsFn = fetchTransactions(ctx, {
    accountId: account.provider_ref,
    startDate: fromDate,
    endDate,
  });

  // todo: abstract
  const categories = await ctx.model('category').find('provider_id', account.provider_id);

  return processTransactions(
    ctx,
    schema,
    fetchTransactionsFn,
    getTransactionProviderRef,
    normalizeTransaction(account, categories),
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

    // add attachments to transactions
    data = fetchAttachments(req, data);

    // next page
    apiParams.page = (apiParams.page || 1) + 1;

    return data;
  };
};

/**
 * Fetch transaction attachments
 * @param req
 * @param data transaction data
 * @returns {Promise<Array>}
 */
const fetchAttachments = async (req, data) => {
  // how many requests to make in parallel
  const parallel = 5;

  /**
   * fetch attachments in parallel
   * @param transactions
   * @returns {Promise<any[]>}
   */
  const fetchFn = (transactions) => Promise.all(
    transactions.map(transaction => new Promise((resolve, reject) => {
      req.fetchTransactionAttachments(transaction.id)
        .then(attachments => resolve({
          ...transaction,
          $attachments: attachments,
        }))
        .catch(reject);
    })),
  );

  // fetch transactions in parallel (based on `parallel`)
  const transactionsWithAttachments = [];
  for (let i = 0; i < data.length; i += parallel) {
    // take slice of transactions to pass to `fetchFn`
    const transactions = data.slice(i, i + parallel);

    // fetch in parallel and add to transactions array
    transactionsWithAttachments.push(
      ...await fetchFn(transactions),
    );
  }

  return transactionsWithAttachments;
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
 * @param categories
 * @return {*}
 */
const normalizeTransaction = (account, categories) => (row) => {
  const data = row.data;

  // only normalize transactions that have been reviewed
  if (data.needs_review) {
    return null;
  }

  // get category
  const categoryId = Number(_.get(data, 'category.id', 0));
  const category = categoryId && categories.find(c => Number(c.provider_ref) === categoryId);

  // normalize
  const payee = data.original_payee;
  // const memo = data.memo.trim() || null;
  // const note = data.note.trim() || null;
  const amount = toLowestCommonUnit(data.amount);
  const date = moment(data.date).format('YYYY-MM-DD');
  const isTransfer = data.is_transfer ? 1 : 0;

  // deal with attachments
  const attachments = data.$attachments.map(attachment => ({
    description: attachment.title,
    type: attachment.content_type,
    filename: attachment.file_name,
    url: attachment.original_url,
  }));

  return {
    account_id: account.id,
    category_id: category && category.id,
    provider_ref: row.provider_ref,
    payee,
    amount,
    date,
    is_transfer: isTransfer,
    // memo,
    attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
  };
};

module.exports = {
  newestTransactionDate,
  downloadTransactions,
  getTransactionProviderRef,
  normalizeTransaction,
};
