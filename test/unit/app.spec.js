'use strict';

const { app, config, expect } = require('../init');

describe('App', () => {
  let appCtx;
  before(async () => {
    appCtx = await app.init(config.app.defaultUser);
  });

  after(async () => {
    await appCtx.db.destroy();
  });

  /**
   * test
   */
  it('should have pre-init context', async () => {
    expect(app).to.have.all.keys(['config', 'log', 'init']);
    expect(app.config).to.be.an('object');
    expect(app.log).to.be.an('object');
    expect(app.init).to.be.a('function');
  });

  /**
   * test
   */
  it('should have post-init context', () => {
    expect(appCtx).to.have.all.keys([
      'config',
      'db',
      'loadProvider',
      'log',
      'model',
      'userRow',
    ]);
    expect(appCtx.config).to.be.an('object');
    expect(appCtx.db).to.be.a('function');
    expect(appCtx.loadProvider).to.be.a('function');
    expect(appCtx.log).to.be.an('object');
    expect(appCtx.model).to.be.a('function');
    expect(appCtx.userRow).to.be.an('object');

    // make sure passed down context is same instance
    expect(appCtx.config).to.deep.equal(app.config);
    expect(appCtx.log).to.deep.equal(app.log);
  });

  /**
   * test
   */
  it('should get provider', async () => {
    const providerCtx = await appCtx.loadProvider('PocketSmith');

    // provider context
    expect(providerCtx).to.have.all.keys([
      'appConfig',
      'appLog',
      'db',
      'model',
      'request',
      'userRow',

      'log',
      'providerRow',
      'config',
      'fn',
    ]);

    // app context passed down to provider
    expect(providerCtx.appConfig).to.be.an('object');
    expect(providerCtx.appLog).to.be.an('object');
    expect(providerCtx.db).to.be.a('function');
    expect(providerCtx.model).to.be.a('function');
    expect(providerCtx.request).to.be.a('function');
    expect(providerCtx.userRow).to.be.an('object');
    expect(providerCtx.log).to.be.an('object');
    expect(providerCtx.providerRow).to.be.an('object');
    expect(providerCtx.config).to.be.an('function');
    expect(providerCtx.fn).to.be.an('object');

    // make sure passed down context is same instance
    expect(providerCtx.appConfig).to.deep.equal(appCtx.config);
    expect(providerCtx.appLog).to.deep.equal(appCtx.log);
    expect(providerCtx.db).to.deep.equal(appCtx.db);
    expect(providerCtx.model).to.deep.equal(appCtx.model);
  });

  /**
   * test
   */
  it('should have provider functions', async () => {
    const providers = await appCtx.db.table('providers');

    for (const { name } of providers) {
      const { fn } = await appCtx.loadProvider(name);
      expect(fn).to.include.all.keys(['meta', 'api']);
      expect(fn.meta).to.include.all.keys(['isSource', 'isTarget']);

      // if provider is source
      if (fn.meta.isSource) {
        expect(fn).to.include.all.keys(['downloadAccounts', 'downloadTransactions']);
      }

      // if provider is target
      if (fn.meta.isTarget) {
        expect(fn).to.include.all.keys(['newestTransactionDate', 'uploadTransactions']);
      }
    }
  });
});
