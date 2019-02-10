'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const invalidConfigError = require('../core/errors/invalidConfigError');
const invalidParamError = require('../core/errors/invalidParamError');
const moment = require('moment');
const composeAction = require('../core/composeAction');
const { fromLowestCommonUnit } = require('../core/helpers');
const inquirer = require('inquirer');
const { table } = require('table');
const util = require('util');

module.exports = (config, program) => {
  program
    .command('sync [name]')
    .description('Run an sync profile')
    .option('-u, --user <user>', `Execute as user (default: ${config.app.defaultUser})`, config.app.defaultUser)
    .option('-d, --dry-run', 'Dry run sync, do not push any actual transactions to target')
    .option('-l, --list-syncs', 'List available syncs')
    .option('--unattended', 'Run sync unattended')
    .option('--run-all', 'Run all sync profiles')
    .action(composeAction(config, main));
};

/**
 * command executor
 * @param ctx
 * @param name
 * @param dryRun
 * @param listSyncs
 * @param unattended
 * @param runAll
 * @returns {Promise<void>}
 */
const main = async (ctx, name, { dryRun, listSyncs, unattended, runAll }) => {
  const { model, loadProvider, userRow } = await ctx;
  let syncNames = [];

  // get current syncs for this user
  const syncs = await model('sync').byUserId(userRow.id);

  // no syncs available
  if (!syncs.length) {
    throw invalidConfigError('No sync profiles available. Run `node . create-sync` to create a new one');
  }

  if (listSyncs) {
    console.log('Available sync profiles:\n- %s', syncs.map((s) => s.name).join('\n- '));
    return;
  }

  // sync name exists
  if (name && !syncs.find((s) => s.name === name)) {
    throw invalidParamError(
      'Sync profile %s does not exist.\nAvailable sync profiles:\n- %s',
      name,
      syncs.map((s) => s.name).join('\n- '),
    );
  }

  // run all
  if (runAll) {
    syncNames = _.map(syncs, 'name');
  }
  // get name of sync
  else if (!name) {
    if (unattended) {
      throw invalidParamError('Missing sync profile argument');
    }

    const { syncName } = await inquirer.prompt({
      type: 'list',
      name: 'syncName',
      message: 'Select a sync profile:',
      choices: syncs.map((s) => s.name),
    });
    syncNames = [syncName];
  }

  for (const [i, syncName] of syncNames.entries()) {
    if (i > 0) console.log('-');
    console.log('Running sync profile %s', syncName);

    // get sync
    const sync = syncs.find((s) => s.name === syncName);

    // get accounts
    const sourceAccount = await model('account')
      .byId(sync.source_account_id)
      .first();
    const targetAccount = await model('account')
      .byId(sync.target_account_id)
      .first();

    // get providers
    const sourceProviderName = (await model('provider')
      .byId(sourceAccount.provider_id)
      .first()).name;
    const targetProviderName = (await model('provider')
      .byId(targetAccount.provider_id)
      .first()).name;

    // load providers
    const sourceProvider = await loadProvider(sourceProviderName);
    const targetProvider = await loadProvider(targetProviderName);

    // get source transactions (from db - if sync_transactions - or fetch new)
    let sourceTransactions = [];
    let newestTransactionDate;

    /**
     * Check for previous sync jobs. Ask user to run these instead grabbing fresh transactions
     * from the source API
     */
    const syncTransactions = await model('syncTransaction').find('sync_id', sync.id);
    if (syncTransactions.length) {
      let confirm = true;

      // if not unattended mode
      if (!unattended) {
        const prompt = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          default: true,
          message: util.format(
            'An incomplete sync job was found containing %d transactions. Resume it?',
            syncTransactions.length,
          ),
        });
        confirm = prompt.confirm;
      }

      // resume previous sync
      const ids = _.map(syncTransactions, 'transaction_id');
      if (confirm) {
        sourceTransactions = await model('transaction').byId(ids);
        newestTransactionDate = _.maxBy(sourceTransactions, (i) => moment(i.date).valueOf()).date;
        newestTransactionDate = moment(newestTransactionDate);
      } else {
        // delete syncs queued
        await model('syncTransaction').deleteById(ids);
        console.log('%d transactions were cleared from previous sync job', syncTransactions.length);
      }
    }

    /**
     * Else fetch source transactions from API
     */
    if (!sourceTransactions.length) {
      // grab most recent transaction from target so we can get date
      console.log('Fetching most recent target transaction. Please wait ...');
      newestTransactionDate = await targetProvider.fn.newestTransactionDate(targetAccount);
      newestTransactionDate = moment(newestTransactionDate || 0);

      // pull transactions from source for this date
      console.log('Fetching source transactions from %s. Please wait ...', newestTransactionDate.format('YYYY-MM-DD'));
      sourceTransactions = await sourceProvider.fn.downloadTransactions(sourceAccount, newestTransactionDate);

      // no transactions to be pushed
      if (!sourceTransactions.length) {
        console.log('No transactions to be pushed to %s (%s)', targetProviderName, targetAccount.name);
        continue;
      }
    }

    // because newestTransactionDate is inclusive from start of date it will include transactions that might
    // already exist on target, so we need to pull from target for this date also to make sure there isn't
    console.log('Fetching target transactions from %s. Please wait ...', newestTransactionDate.format('YYYY-MM-DD'));
    const targetTransactions = await targetProvider.fn.downloadTransactions(targetAccount, newestTransactionDate);

    /**
     * Compare source transactions with target to make sure there isn't any duplicates being synced
     */
    let transactions = sourceTransactions;
    if (targetTransactions.length) {
      const duplicateSyncTransactionIds = [];
      const tmpTargetTransactions = [...targetTransactions];

      // fields to compare source and target
      const compareBy = ['payee', 'amount', 'date'];

      // remove duplicates between source and target
      transactions = sourceTransactions.filter((sourceTransaction) => {
        // get source fields for comparison
        const sourceCompare = _(sourceTransaction)
          .pick(compareBy)
          .mapValues((i) => (_.isString(i) ? i.toLowerCase().trim() : i))
          .value();

        const isDuplicate = _.some(tmpTargetTransactions, (targetTransaction, i) => {
          // get target fields for comparison
          const targetCompare = _(targetTransaction)
            .pick(compareBy)
            .mapValues((i) => (_.isString(i) ? i.toLowerCase().trim() : i))
            .value();

          // if fields are equal then remove from tmpTargetTransactions just in case there
          // is two transactions on the same day with same payee etc but should not be treated
          // as duplicates
          if (_.isEqual(sourceCompare, targetCompare)) {
            duplicateSyncTransactionIds.push(sourceTransaction.id);
            tmpTargetTransactions.splice(i, 1);
            return true;
          }
        });

        return !isDuplicate;
      });

      // remove sync transactions that were duplicates
      if (duplicateSyncTransactionIds.length) {
        await model('syncTransaction').deleteByTransactionId(sync.id, duplicateSyncTransactionIds);
      }

      // no transactions to be pushed
      if (!transactions.length) {
        console.log('No transactions to be pushed to %s (%s)', targetProviderName, targetAccount.name);
        continue;
      }
    }

    // log transaction push stats
    console.log('%d transactions ready to push to %s (%s)', transactions.length, targetProviderName, targetAccount.name);

    /**
     * If doing a dry run
     */
    if (dryRun) {
      // table config
      const config = {
        columns: {
          2: { alignment: 'right' },
          3: { alignment: 'right' },
        },
      };

      // table data
      const data = [
        ['Provider ID', 'Payee', 'Amount', 'Date'].map((i) => chalk.bold(i)),
        ...transactions.map((t) => [
          t.provider_ref,
          t.payee,
          fromLowestCommonUnit(t.amount, sourceAccount.currency),
          moment(t.date).format('YYYY-MM-DD'),
        ]),
      ];

      // output table
      console.log(table(data, config));
      continue;
    }

    // confirm push
    let confirm = true;

    // if not unattended
    if (!unattended) {
      const prompt = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: util.format(
          'Ready to sync %s: %s to %s: %s. Proceed?',
          sourceProviderName,
          sourceAccount.name,
          targetProviderName,
          targetAccount.name,
        ),
      });
      confirm = prompt.confirm;
    }

    // if did not confirm
    if (!confirm) {
      console.log('Sync cancelled');
      continue;
    }

    // add transactions to sync_transaction job table so they can be resumed if there is a failure
    for (const transaction of transactions) {
      await model('syncTransaction').updateOrCreateSyncTransaction(sync.id, transaction.id);
    }

    /**
     * function to run after each transaction uploaded
     * @param sync
     * @return {Function}
     */
    const onTransactionUploaded = (sync) => async (transaction) => {
      await model('syncTransaction').deleteByTransactionId(sync.id, transaction.id);
    };

    // upload transactions
    console.log(
      'Sync running - %s: %s to %s: %s. Please wait ...',
      sourceProviderName,
      sourceAccount.name,
      targetProviderName,
      targetAccount.name,
    );
    await targetProvider.fn.uploadTransactions(targetAccount, transactions, onTransactionUploaded(sync));
    console.log('Sync completed');
  }
};
