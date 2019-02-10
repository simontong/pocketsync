'use strict';

require('dotenv').config();

const command = require('./app/commands');
const config = require('./config');

// run
command(config, process.argv);
