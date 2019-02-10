'use strict';

const _ = require('lodash');
const useLog = require('./useLog');
const useProvider = require('./useProvider');
const { connectDb, useModels } = require('./useDb');

/**
 * @param config
 * @returns {{log: (Logger|*), config: object, init: (function())}}
 */
const app = (config) => {
  let log = useLog(config);
  let db;
  let model;

  /**
   * app init
   * @param user
   * @return {Promise<{object}>}
   */
  const init = async (user) => {
    // connect db
    const noDbConnection = _.get(db, 'client.pool.destroyed', true);
    if (noDbConnection === true) {
      db = await connectDb(config, log);
      model = useModels(db);
    }

    // fetch user
    const userRow = await model('user').byUser(user);
    if (!userRow) {
      await db.destroy();
      throw new Error(`User ${user} does not exist`);
    }

    // prepare app context
    const appCtx = {
      config,
      log,
      db,
      model,
      userRow,
    };

    // add provider getter
    appCtx.loadProvider = useProvider(appCtx);

    return appCtx;
  };

  return {
    log,
    config,
    init,
  };
};

module.exports = app;
