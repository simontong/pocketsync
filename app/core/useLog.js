'use strict';

const _ = require('lodash');
const bunyan = require('bunyan');
const BunyanPrettyStream = require('bunyan-prettystream');
const path = require('path');

/**
 * @param config
 * @return {Logger|*}
 */
const useLog = (config) => {
  const prettyStdOut = new BunyanPrettyStream();
  prettyStdOut.pipe(process.stdout);

  // default opts
  const opts = {
    streams: [
      {
        type: 'rotating-file',
        level: 'trace',
        path: path.join(__dirname, '../../logs/pocketsync') + '.log',
        period: '1d',
        count: 3,
      },
      {
        type: 'rotating-file',
        level: 'error',
        path: path.join(__dirname, '../../logs/pocketsync') + '-errors.log',
        period: '1d',
      },
    ],
  };

  // show log output in console
  if (process.env.LOG_LEVEL) {
    opts.streams.push({
      stream: prettyStdOut,
      level: process.env.LOG_LEVEL,
      type: 'raw',
    });
  }

  // merge passed opts
  if (config.app.logger) {
    _.merge(opts, config.app.logger);
  }

  // load logger
  const logger = bunyan.createLogger(opts);

  // log
  logger.trace(`Loaded bunyan for logger ${opts.name}`);

  return logger;
};

module.exports = useLog;
