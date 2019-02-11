'use strict';

const useLog = require('./useLog');
const useProvider = require('./useProvider');
const { useDb, useModels } = require('./useDb');

/**
 * @param config
 * @returns {{log: (Logger|*), config: object, init: (function())}}
 */
const app = (config) => {
  let log = useLog(config);
  const connectDb = useDb(config, log);

  /**
   * app init
   * @param user
   * @return {Promise<{object}>}
   */
  const init = async (user) => {
    const db = await connectDb(config, log);
    const model = useModels(db);

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
