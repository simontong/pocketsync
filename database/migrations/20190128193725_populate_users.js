'use strict';

const { defaultUser } = require('../../config/app');

exports.up = async function(knex) {
  await knex.table('users').insert({ user: defaultUser });
};

exports.down = async function(knex) {
  await knex
    .table('users')
    .where({ user: defaultUser })
    .delete();
};
