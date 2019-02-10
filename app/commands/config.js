'use strict';

const _ = require('lodash');
const inquirer = require('inquirer');
const composeAction = require('../core/composeAction');
const util = require('util');

module.exports = (config, program) => {
  program
    .command('config <provider-name>')
    .option('-u, --user <user>', `Execute as user (default: ${config.app.defaultUser})`, config.app.defaultUser)
    .option('-s, --set <key>', 'Set config option', setOpt, [])
    .option('-r, --replace', 'Replace existing config instead of merging')
    .description('Get or set config options')
    .action(composeAction(config, main));
};

/**
 * Option setter for command
 * @param opt
 * @param opts
 * @returns {*}
 */
const setOpt = (opt, opts = []) => {
  opts.push(opt);
  return opts;
};

/**
 * command executor
 * @param ctx
 * @param providerName
 * @param set
 * @param replace
 * @returns {Promise<void>}
 */
const main = async (ctx, providerName, { set, replace }) => {
  const { config, model, userRow, providerRow } = await ctx.loadProvider(providerName);

  // if set
  if (set.length) {
    // match options set
    const opts = {};
    for (const opt of set) {
      let [, key, value] = opt.match(/^([^=]+)(?:=(.+))?/);

      // if val was not passed via args then prompt
      if (!value) {
        const prompt = await inquirer.prompt({
          type: 'input',
          name: 'value',
          message: `Enter ${key}:`,
        });
        value = prompt.value;
      }

      opts[key] = value;
    }

    const curConfig = await config();
    const newConfig = replace ? opts : _.merge(curConfig, opts);
    await model('config').updateOrCreateConfig(userRow.id, providerRow.id, newConfig);
    console.log('Config options saved');
    return;
  }

  // if get
  const value = await config();
  console.log(
    util.inspect(value, {
      depth: null,
      colors: true,
      compact: false,
    }),
  );
};
