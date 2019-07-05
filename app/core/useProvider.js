'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const useRequest = require('./useRequest');

/**
 * @param appCtx
 * @return {function(*=): *}
 */
const useProvider = (appCtx) => {
  const { model, log, userRow } = appCtx;
  let providersAdded = false;

  return async (providerName) => {
    // check provider dir exists
    const providerDir = path.join(__dirname, '../providers', providerName);
    if (!fs.existsSync(providerDir)) {
      throw new Error(`No such provider '${providerName}'. Could not load ${providerDir}`);
    }

    // add providers
    if (!providersAdded) {
      await addProviders(appCtx);
      providersAdded = true;
    }

    // provider row function
    const providerRowFn = useProviderRow(model, providerName);

    // make sure provider actually exists
    const providerRow = await providerRowFn();
    if (!providerRow) {
      throw new Error(`Provider '${providerName}' not found in database`);
    }

    // config function
    const config = useConfig(model, userRow.id, providerRow.id);

    // child log for provider
    const providerLog = log.child(
      {
        user: userRow.user,
        provider: providerName,
      },
      true,
    );

    // request function (uses provider log)
    const request = useRequest(providerLog);

    // provider context for passing into provider functions
    const providerCtx = {
      appConfig: appCtx.config,
      appLog: appCtx.log,
      db: appCtx.db,
      model: appCtx.model,
      userRow: appCtx.userRow,

      // provider context
      log: providerLog,
      providerRow,
      config,
      request,
    };

    // load provider functions
    providerCtx.fn = require(providerDir)(providerCtx);

    // log
    providerLog.trace('Loaded provider %s', providerName);

    return providerCtx;
  };
};

/**
 * Add providers
 * @param appCtx
 * @return {Promise<void>}
 */
const addProviders = async (appCtx) => {
  const { model } = appCtx;
  const dir = path.join(__dirname, '../providers');

  // get providers
  for (const name of fs.readdirSync(dir)) {
    const providerDir = path.join(dir, name);

    // if not a dir then ignore
    if (!fs.lstatSync(providerDir).isDirectory()) {
      continue;
    }

    // load provider so we can check if its a source and / or target
    const provider = require(providerDir)(appCtx);
    if (!provider.meta) {
      continue;
    }
    const meta = provider.meta;

    // prep meta
    const params = {
      code: meta.code,
      name,
      is_source: !!meta.isSource,
      is_target: !!meta.isTarget,
    };

    await model('provider').updateOrCreateProvider(params);
  }
};

/**
 * Get provider row
 * @param model
 * @param providerName
 * @return {function(*=): *}
 */
const useProviderRow = (model, providerName) => () => {
  return model('provider').byName(providerName);
};

/**
 * Get config
 * @param model
 * @param userId
 * @param providerId
 * @return {function(*=): *}
 */
const useConfig = (model, userId, providerId) => async (key) => {
  const row = await model('config').byKey(userId, providerId, key);
  if (!row || row.config === null) {
    return null;
  }
  if (key !== undefined) {
    if (Array.isArray(key)) {
      return _.pick(row.config, key);
    }
    return row.config[key];
  }
  return row.config;
};

module.exports = useProvider;
