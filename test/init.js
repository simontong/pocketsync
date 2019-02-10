'use strict';

require('dotenv').config({ path: '.env.testing' });
require('dotenv').config();

const app = require('../app/core/app');
const config = require('../config');
const { expect } = require('chai');

module.exports = {
  app: app(config),
  config,
  expect,
};
