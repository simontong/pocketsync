'use strict';

const _ = require('lodash');
const composeAction = require('../core/composeAction');

module.exports = (config, program) => {
  program
    .command('user')
    .description('Manage users')
    .option('-c, --create <user>', 'Create a new user')
    .option('-l, --list', 'List available users')
    .action(composeAction(config, main));
};

/**
 * command executor
 * @param ctx
 * @param create
 * @param list
 * @returns {Promise<void>}
 */
const main = async (ctx, { create, list }) => {
  const { model } = ctx;

  // if create new user
  if (create) {
    const check = await model('user').byUser(create);
    if (check) {
      console.error('User %s already exists', create);
      return;
    }
    await model('user').create({ user: create });
    console.log('User %s created', create);
    return;
  }

  // list users
  const users = await model('user')
    .find()
    .orderBy('user');

  // output users
  console.log('Users available:\n- %s', _.map(users, 'user').join('\n- '));
};
