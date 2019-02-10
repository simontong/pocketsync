'use strict';

const _ = require('lodash');
const composeAction = require('../core/composeAction');

module.exports = (config, program) => {
  program
    .command('provider')
    .description('Manager providers')
    .option('-l, --list', 'List available providers')
    // .option('-s, --stats', 'Show provider stats')
    .action(composeAction(config, main));
};

/**
 * command executor
 * @param ctx
 * @param list
 * @returns {Promise<void>}
 */
const main = async (ctx, { list }) => {
  const { model } = ctx;

  // list providers
  const providers = await model('provider')
    .find()
    .orderBy('name');

  // output providers
  console.log('Providers available:\n- %s', _.map(providers, 'name').join('\n- '));
};
