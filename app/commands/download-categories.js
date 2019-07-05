'use strict';

const composeAction = require('../core/composeAction');
const handleError = require('../core/handleError');
const invalidParamError = require('../core/errors/invalidParamError');
const util = require('util');

module.exports = (config, program) => {
  program
    .command('download-categories <provider-name>')
    .description('Fetches, stores and normalizes a providers categories')
    .option('-u, --user <user>', `Execute as user (default: ${config.app.defaultUser})`, config.app.defaultUser)
    .action(composeAction(config, main));
};

/**
 * command executor
 * @returns {Promise<void>}
 */
const main = async (ctx, providerName) => {
  const { fn } = await ctx.loadProvider(providerName);

  console.log('Fetching categories from %s. Please wait ...', providerName);
  const categories = await fn.downloadCategories();

  // console.log(categories);

  // console.log('Categories available:\n- %s', _.map(categories, 'user').join('\n- '));
};
