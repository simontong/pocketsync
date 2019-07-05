'use strict';

const _ = require('lodash');
const { api } = require('./api');
const { fetchAttachment, fromLowestCommonUnit } = require('../../core/helpers');
const { js2xml } = require('xml-js');
const moment = require('moment');
const shouldRefreshToken = require('./shouldRefreshToken');

// bank explanations require a category, so pick the default
const categoryIdDefault = 285; // Accommodation and Meals

/**
 * Format memo to store sync data
 * @param providerCode
 * @param accountRef
 * @param transactionRef
 * @return {string}
 */
const memoFormat = (providerCode, accountRef, transactionRef) => {
  return `@${providerCode}:${accountRef}:${transactionRef}@`;
};

// regexp to get sync data from memo
const memoRegExp = '^@([^:]+):([^:]+):([^@]+)@$';

/**
 * Upload transactions
 * @param ctx
 * @return {Function}
 */
const uploadTransactions = (ctx) => async ({ sourceProvider, sourceAccount, targetProvider, targetAccount, transactions, onTransactionUploaded }) => {
  const req = api(ctx);

  // prepare statement in OFX format
  const statement = prepareOfx(sourceProvider.providerRow, sourceAccount, targetAccount, transactions);

  // push transactions
  try {
    await req.createTransactions(targetAccount.provider_ref, statement);
  } catch (e) {
    await shouldRefreshToken(ctx, e);
    return uploadTransactions(targetAccount, transactions, onTransactionUploaded);
  }

  // wait for a sec, so we can grab the uploadedTransactions
  await new Promise(resolve => setTimeout(resolve, 3000));

  // get last uploaded transactions
  const uploadedTransactions = await req.fetchTransactions({
    bankAccount: targetAccount.provider_ref,
    lastUploaded: true,
  });

  // match transactions with uploaded
  for (const uploadedTransaction of uploadedTransactions.bank_transactions) {
    const [, payee, memo] = uploadedTransaction.description.match(/(.+)\/(.*)\/(.*)\/$/);

    // cross check with transactions
    // if no match then don't add explaination
    const match = memo && memo.match(new RegExp(memoRegExp));
    if (!match) {
      continue;
    }

    // extract vars from regexp and match sure it all matches up
    const [, providerCode, accountRef, transactionRef] = match;
    const sourceTransaction = transactions.find(t => t.provider_ref === transactionRef);
    if (providerCode !== sourceProvider.providerRow.code || sourceAccount.provider_ref !== accountRef || !sourceTransaction) {
      continue;
    }

    // prep attachment
    let attachment;
    if (sourceTransaction.attachments && sourceTransaction.attachments.length) {
      const file = sourceTransaction.attachments[0];
      const data = await fetchAttachment(ctx, file.url);
      if (data) {
        attachment = {
          data,
          file_name: file.filename,
          description: file.description,
          content_type: file.type,
        };
      }
    }

    /**
     * todo: abstract
     */
    const category = await ctx.model('category')
      .find('id', sourceTransaction.category_id)
      .first();

    const q = `
      select provider_ref
      from categories
      where id in (
        select left_category_id 
        from category_map
        where left_category_id in (select id from categories where provider_id = ?) and right_category_id = ?
      )
      union
      select provider_ref
      from categories
      where id in (
        select right_category_id 
        from category_map
        where right_category_id in (select id from categories where provider_id = ?) and left_category_id = ?
      )
    `;
    const params = [
      targetProvider.providerRow.id,
      category.id,
      targetProvider.providerRow.id,
      category.id,
    ];
    const categoryId = _.get(await ctx.db.raw(q, params), '0.0.provider_ref', categoryIdDefault);

    // upload explanation
    await req.createTransactionExplanation({
      marked_for_review: true,
      category: categoryId,
      bank_transaction: uploadedTransaction.url,
      description: payee,
      dated_on: uploadedTransaction.dated_on,
      gross_value: uploadedTransaction.amount,
      attachment,
    });
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
 * @param sourceProviderRow
 * @param sourceAccount
 * @param targetAccount
 * @param transactions
 * @return {string}
 */
const prepareOfx = (sourceProviderRow, sourceAccount, targetAccount, transactions) => {
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
            CURDEF: targetAccount.currency,
          },
          BANKTRANLIST: transactions.map(t => {
            const amount = fromLowestCommonUnit(t.amount);
            const date = moment(t.date).format('YYYYMMDD');
            const memo = memoFormat(sourceProviderRow.code, sourceAccount.provider_ref, t.provider_ref);

            return {
              STMTTRN: {
                TRNTYPE: 'OTHER',
                DTPOSTED: date,
                TRNAMT: amount,
                FITID: t.id,
                NAME: t.payee,
                MEMO: memo,
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
