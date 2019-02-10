'use strict';

const { api } = require('./api');
const { fromLowestCommonUnit } = require('../../core/helpers');
const { js2xml } = require('xml-js');
const moment = require('moment');
const shouldRefreshToken = require('./shouldRefreshToken');

/**
 * Upload transactions
 * @param ctx
 * @return {Function}
 */
const uploadTransactions = (ctx) => async (account, transactions, onTransactionUploaded) => {
  const req = api(ctx);

  // prepare statement in OFX format
  const statement = prepareOfx(account, transactions);

  // push transactions
  try {
    await req.createTransactions(account.provider_ref, statement);
  } catch (e) {
    await shouldRefreshToken(ctx, e);
    return uploadTransactions(account, transactions, onTransactionUploaded);
  }

  // execute onTransactionUploaded for all transactions as we sent them up in a statement
  if (typeof onTransactionUploaded === 'function') {
    for (const transaction of transactions) {
      await onTransactionUploaded(transaction);
    }
  }
};

/**
 * Prepare OFX formatted text to upload
 * @param account
 * @param transactions
 * @return {string}
 */
const prepareOfx = (account, transactions) => {
  const xml = {
    _declaration: {
      _attributes: {
        version: 1.0,
        encoding: 'UTF-8',
        standalone: 'no',
      },
    },
    _instruction: {
      OFX: {
        _attributes: {
          OFXHEADER: 200,
          VERSION: 211,
          SECURITY: 'NONE',
          OLDFILEUID: 'NONE',
          NEWFILEUID: 'NONE',
        },
      },
    },
    OFX: {
      BANKMSGSRSV1: {
        STMTTRNRS: {
          STMTRS: {
            CURDEF: account.currency,
          },
          BANKTRANLIST: transactions.map(t => {
            const amount = fromLowestCommonUnit(t.amount);
            const date = moment(t.date).format('YYYYMMDD');

            return {
              STMTTRN: {
                TRNTYPE: 'OTHER',
                DTPOSTED: date,
                TRNAMT: amount,
                FITID: t.id,
                NAME: t.payee,
                // MEMO: memo,
              },
            };
          }),
        },
      },
    },
  };

  return js2xml(xml, {
    compact: true,
    spaces: 2,
  });
};

module.exports = uploadTransactions;
