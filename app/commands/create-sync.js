'use strict';

const composeAction = require('../core/composeAction');
const handleError = require('../core/handleError');
const invalidParamError = require('../core/errors/invalidParamError');
const inquirer = require('inquirer');
const util = require('util');

module.exports = (config, program) => {
  program
    .command('create-sync [source-provider-name] [target-provider-name]')
    .description('Create a sync profile')
    .option('-u, --user <user>', `Execute as user (default: ${config.app.defaultUser})`, config.app.defaultUser)
    .action(composeAction(config, main));
};

/**
 * command executor
 * @returns {Promise<void>}
 * todo: break this into smaller testable units
 */
const main = async (ctx, sourceProviderName, targetProviderName) => {
  const { model, loadProvider } = await ctx;

  // get source+target providers available
  const sourceProviders = await model('provider').getForSelectList('is_source', 1);
  const targetProviders = await model('provider').getForSelectList('is_target', 1);

  // check sourceProviderName is an existing provider
  if (sourceProviderName && !sourceProviders.includes(sourceProviderName)) {
    throw invalidParamError(
      'Source provider %s does not exist.\nAvailable source providers:\n- %s',
      sourceProviderName,
      sourceProviders.join('\n- '),
    );
  }

  // check targetProviderName is an existing provider
  if (targetProviderName && !targetProviders.includes(targetProviderName)) {
    throw invalidParamError(
      'Target provider %s does not exist.\nAvailable target providers:\n- %s',
      targetProviderName,
      targetProviders.join('\n- '),
    );
  }

  // if no source arg
  if (!sourceProviderName) {
    const { providerName } = await inquirer.prompt({
      type: 'list',
      name: 'providerName',
      message: 'Select a source provider:',
      choices: sourceProviders,
    });
    sourceProviderName = providerName;
  }

  // if no target arg
  if (!targetProviderName) {
    const { providerName } = await inquirer.prompt({
      type: 'list',
      name: 'providerName',
      message: 'Select a target provider:',
      choices: targetProviders,
    });
    targetProviderName = providerName;
  }

  // load providers
  const sourceProvider = await loadProvider(sourceProviderName);
  const targetProvider = await loadProvider(targetProviderName);

  // download source accounts
  let sourceAccounts;
  try {
    console.log('Fetching source accounts for %s. Please wait ...', sourceProviderName);
    sourceAccounts = await sourceProvider.fn.downloadAccounts();
    if (!sourceAccounts.length) {
      console.log('No accounts found on %s', sourceProviderName);
      return;
    }
  } catch (e) {
    handleError(sourceProvider.log, e);
    return;
  }

  // download target accounts
  let targetAccounts;
  try {
    console.log('Fetching target accounts for %s. Please wait ...', targetProviderName);
    targetAccounts = await targetProvider.fn.downloadAccounts();
    if (!targetAccounts.length) {
      console.log('No accounts found on %s', targetProviderName);
      return;
    }
  } catch (e) {
    handleError(targetProvider.log, e);
    return;
  }

  // get source account name
  const { sourceAccountId } = await inquirer.prompt({
    type: 'list',
    name: 'sourceAccountId',
    message: `Select a source account for ${sourceProviderName}:`,
    choices: sourceAccounts.map((a) => ({ name: a.name, value: a.id })),
  });

  // remove source account id from target (can't sync from account to the same account)
  targetAccounts = targetAccounts.filter((a) => a.id !== sourceAccountId);

  // get target account name
  const { targetAccountId } = await inquirer.prompt({
    type: 'list',
    name: 'targetAccountId',
    message: `Select a target account for ${targetProviderName}:`,
    choices: targetAccounts.map((a) => ({ name: a.name, value: a.id })),
  });

  // get accounts
  const sourceAccount = sourceAccounts.find((a) => a.id === sourceAccountId);
  const targetAccount = targetAccounts.find((a) => a.id === targetAccountId);

  // if accounts currencies don't match, ask if sure to proceed
  if (sourceAccount.currency !== targetAccount.currency) {
    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: util.format(
        `Warning: account currencies don't match - (%s : %s). Proceed anyway?`,
        sourceAccount.currency,
        targetAccount.currency,
      ),
    });

    if (!confirm) {
      console.log('Sync profile creation cancelled');
      return;
    }
  }

  // sync name
  const defaultName = util.format(
    '%s: %s >> %s: %s',
    sourceProviderName,
    sourceAccount.name,
    targetProviderName,
    targetAccount.name,
  );

  const { name } = await inquirer.prompt({
    type: 'input',
    name: 'name',
    message: `Enter a unique name for this sync:`,
    default: defaultName,
    validate: function(name) {
      const done = this.async();
      model('sync')
        .byName(name)
        .then((r) => (r ? done('Name already exists') : done(null, true)));
    },
  });

  // create sync
  await model('sync').updateOrCreateSync(name, sourceAccount.id, targetAccount.id);
  console.log(
    `Sync profile '%s' created between %s (%s) and %s (%s)`,
    name,
    sourceProviderName,
    sourceAccount.name,
    targetProviderName,
    targetAccount.name,
  );

  // todo: inquire if want to execute now
  // inquirer type = confirm

  console.log('Execute `node . sync \'%s\'` to run', name);
};
