'use strict';

const app = require('./app');
const handleError = require('./handleError');

/**
 * Wrap command action
 * @param config
 * @param actionFn
 * @return {function(*): Function}
 */
const composeAction = (config, actionFn) => async (...args) => {
  const { log, init } = app(config);

  let appCtx;
  try {
    // get user passed as arg or use default user
    let { user } = args.slice(-1)[0];
    if (!user) {
      user = config.app.defaultUser;
    }

    // init app context
    appCtx = await init(user);

    // exec action
    await actionFn(appCtx, ...args);
  } catch (e) {
    handleError(log, e);
  }

  // close db
  if (appCtx && appCtx.db) {
    await appCtx.db.destroy();
  }
};

module.exports = composeAction;
