'use strict';

const api = require('./api');
const { fromLowestCommonUnit } = require('../../core/helpers');
const moment = require('moment');

/**
 * Upload transactions
 * @param ctx
 * @return {Function}
 */
const uploadTransactions = (ctx) => async (account, transactions, onTransactionUploaded) => {
  const req = api(ctx);

  // upload transactions
  for (const transaction of transactions) {
    const amount = fromLowestCommonUnit(transaction.amount);
    const date = moment(transaction.date).format('YYYY-MM-DD');

    // prepare data for upload
    const data = {
      payee: transaction.payee,
      amount,
      date,
      is_transfer: transaction.is_transfer,
      // memo: transaction.memo,
    };

    // push transactions
    await req.createTransaction(account.provider_ref, data);

    // execute onTransactionUploaded for all transactions as we sent them up in a statement
    if (typeof onTransactionUploaded === 'function') {
      await onTransactionUploaded(transaction);
    }
  }
};

module.exports = uploadTransactions;
