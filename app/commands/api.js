'use strict';

const composeAction = require('../core/composeAction');
const inquirer = require('inquirer');
const dirtyJson = require('dirty-json');
const util = require('util');

module.exports = (config, program) => {
  program
    .command('api <provider-name> [command] [args...]')
    .description('Execute API command on a provider')
    .option('-u, --user <user>', `Execute as user (default: ${config.app.defaultUser})`, config.app.defaultUser)
    .option('-p, --prompt-option', 'Pass option via an input prompt')
    .option('-l, --list-commands', 'List available API commands')
    .action(composeAction(config, main));
};

/**
 * Get parameter names for function
 * @param funcs
 * @return {Array}
 */
const getAvailableCommands = (funcs) => {
  const stripExtra = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s)/gm;
  const argNames = /[^,]+/g;

  // get funcs
  const available = [];
  for (const [name, fn] of Object.entries(funcs)) {
    let fnStr = fn.toString();

    // ignore if includes @ignore-api
    if (fnStr.includes('@ignore-api')) {
      continue;
    }

    // strip comments
    fnStr = fn.toString().replace(stripExtra, '');
    let args = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(argNames);

    // no args for this command
    if (!args) {
      available.push(name);
      continue;
    }
    available.push(`${name} (params: ${args.join(', ')})`);
  }

  return available;
};

/**
 * command executor
 * @param ctx
 * @param providerName
 * @param command
 * @param args
 * @param options
 * @param listCommands
 * @returns {Promise<void>}
 */
const main = async (ctx, providerName, command, args = [], { promptOption, listCommands }) => {
  const { fn } = await ctx.loadProvider(providerName);

  // if --listCommands or command does not exist for provider api then list out commands
  if (listCommands || !fn.api[command]) {
    const funcs = getAvailableCommands(fn.api);
    console.log('%s API commands:\n- %s', providerName, funcs.join('\n- '));
    return;
  }

  // if opt
  if (promptOption) {
    const prompt = await inquirer.prompt({
      type: 'input',
      name: 'value',
      message: 'Enter arguments:',
    });
    args = prompt.value.split(' ');
  }

  // parse args
  const argsParsed = args.map((a) => {
    if (a === 'undefined') {
      return undefined;
    }
    if (a.match(/^[{\[].*[}\]]$/)) {
      return dirtyJson.parse(a);
    }
    return a;
  });

  // fetch api response
  const res = await fn.api[command](...argsParsed);

  // display response
  console.log(
    util.inspect(res, {
      depth: null,
      colors: true,
      compact: false,
    }),
  );
};
