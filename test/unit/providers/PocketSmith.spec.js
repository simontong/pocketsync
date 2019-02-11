'use strict';

const { app, config, expect } = require('../../init');
const fxAccounts = require('../../fixtures/PocketSmith/accounts');
const fxTransactions = require('../../fixtures/PocketSmith/transactions');
const { storeFetched, storeNormalized } = require('../../../app/core/helpers');
const { normalizeAccount, getAccountProviderRef } = require('../../../app/providers/PocketSmith/downloadAccounts');
const accountSchema = require('../../../app/providers/PocketSmith/schemas/account');
const {
  normalizeTransaction,
  getTransactionProviderRef,
} = require('../../../app/providers/PocketSmith/downloadTransactions');
const transactionSchema = require('../../../app/providers/PocketSmith/schemas/transaction');

describe('Providers: PocketSmith', () => {
  let appCtx;
  let providerCtx;
  before(async () => {
    appCtx = await app.init(config.app.defaultUser);
    providerCtx = await appCtx.loadProvider('PocketSmith');
  });

  after(async () => {
    if (appCtx && appCtx.db) await appCtx.db.destroy();
  });

  /**
   * test
   */
  it('should store API request for accounts in db', async () => {
    const accounts = await storeFetched(providerCtx, fxAccounts, 'account', getAccountProviderRef);

    expect(accounts).to.be.an('array');
    expect(accounts).to.have.lengthOf(fxAccounts.length);
    for (const account of accounts) {
      expect(account).to.have.all.keys([
        'id',
        'user_id',
        'provider_id',
        'type',
        'provider_ref',
        'data',
        'created_at',
        'updated_at',
      ]);
      expect(account.id).to.be.a('number');
      expect(account.type).to.equal('account');
      expect(account.data).to.be.an('object');
    }
  });

  /**
   * test
   */
  it('should normalize API requests for accounts', async () => {
    const rows = await storeFetched(providerCtx, fxAccounts, 'account', getAccountProviderRef);
    const accounts = await storeNormalized(providerCtx, rows, 'account', accountSchema, normalizeAccount);

    expect(accounts).to.be.an('array');
    expect(accounts).to.have.lengthOf(rows.length);
    for (const account of accounts) {
      expect(account).to.have.all.keys([
        'id',
        'user_id',
        'provider_id',
        'provider_ref',
        'name',
        'currency',
        'created_at',
        'updated_at',
      ]);
      expect(account.id).to.be.a('number');
    }
  });

  /**
   * test
   */
  it('should store API request for transactions in db', async () => {
    const transactions = await storeFetched(providerCtx, fxTransactions, 'transaction', getTransactionProviderRef);

    expect(transactions).to.be.an('array');
    expect(transactions).to.have.lengthOf(fxTransactions.length);
    for (const transaction of transactions) {
      expect(transaction).to.have.all.keys([
        'id',
        'user_id',
        'provider_id',
        'type',
        'provider_ref',
        'data',
        'created_at',
        'updated_at',
      ]);
      expect(transaction.id).to.be.a('number');
      expect(transaction.type).to.equal('transaction');
      expect(transaction.data).to.be.an('object');
    }
  });

  /**
   * test
   */
  it('should normalize API requests for transactions', async () => {
    const account = await providerCtx.db.table('accounts').first();
    const rows = await storeFetched(providerCtx, fxTransactions, 'transaction', getTransactionProviderRef);
    const transactions = await storeNormalized(
      providerCtx,
      rows,
      'transaction',
      transactionSchema,
      normalizeTransaction(account),
    );

    expect(transactions).to.be.an('array');
    expect(transactions).to.have.lengthOf(rows.length);
    for (const transaction of transactions) {
      expect(transaction).to.have.all.keys([
        'id',
        'account_id',
        'provider_ref',
        'payee',
        'amount',
        'date',
        'is_transfer',
        'created_at',
        'updated_at',
      ]);
      expect(transaction.id).to.be.a('number');
    }
  });
});
