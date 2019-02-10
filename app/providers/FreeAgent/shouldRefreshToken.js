'use strict';

const _ = require('lodash');
const { api } = require('./api');

module.exports = async (ctx, err) => {
  const { config, log, model, userRow, providerRow } = ctx;

  // check if err message was actually requesting token refresh
  if (_.get(err, 'error.errors.error.message') !== 'Access token not recognised') {
    throw err;
  }

  // if we made it here then must be invalid access token
  log.warn('Invalid access token, attempting to renew');

  const req = api(ctx);
  try {
    // fetch new token
    const token = await req.refreshAccessToken();

    // prepare new config to store token
    const curConfig = await config();
    const newConfig = {
      ...curConfig,
      accessToken: token.access_token,
      expiresIn: token.expires_in,
    };

    // save new token to database
    await model('config').updateOrCreateConfig(userRow.id, providerRow.id, newConfig);
    log.debug('Access token renewed');
  } catch (e) {
    const message = 'Renew access token failed';

    // if 401 error then need to go through OAuth process so display app auth url
    if (e.statusCode === 401) {
      log.warn(`${message}. Re-auth URL: ${await req.getAppAuthUrl()}`);
    }

    throw new Error(`${message}.\n${e.stack}`);
  }
};
