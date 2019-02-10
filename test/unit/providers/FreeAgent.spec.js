'use strict';

const { app, config, expect } = require('../../init');
const fxAccounts = require('../../fixtures/FreeAgent/accounts');
const fxTransactions = require('../../fixtures/FreeAgent/transactions');
const { storeFetchedAccounts, storeNormalizedAccounts } = require('../../../app/providers/FreeAgent/downloadAccounts');
const { storeFetchedTransactions, storeNormalizedTransactions } = require('../../../app/providers/FreeAgent/downloadTransactions');

describe('Providers: FreeAgent', () => {
  let appCtx;
  let providerCtx;
  before(async () => {
    appCtx = await app.init(config.app.defaultUser);
    providerCtx = await appCtx.loadProvider('FreeAgent');
  });

  after(async () => {
    if (appCtx && appCtx.db) await appCtx.db.destroy();
  });

  /**
   * test
   */
  it('should store API request for accounts in db', async () => {
    const accounts = await storeFetchedAccounts(providerCtx, fxAccounts);

    expect(accounts).to.be.an('array');
    expect(accounts).to.have.lengthOf(fxAccounts.bank_accounts.length);
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
    const rows = await storeFetchedAccounts(providerCtx, fxAccounts);
    const accounts = await storeNormalizedAccounts(providerCtx, rows);

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
    const transactions = await storeFetchedTransactions(providerCtx, fxTransactions);

    expect(transactions).to.be.an('array');
    expect(transactions).to.have.lengthOf(fxTransactions.bank_transactions.length);
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
    const rows = await storeFetchedTransactions(providerCtx, fxTransactions);
    const transactions = await storeNormalizedTransactions(providerCtx, rows, account);

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
