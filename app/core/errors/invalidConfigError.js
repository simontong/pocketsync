'use strict';

const VError = require('verror');

module.exports = (...args) => new VError({ name: 'InvalidConfigError' }, ...args);
