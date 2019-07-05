'use strict';

const program = require('commander');

module.exports = (config, argv) => {
  // set version
  program.version(require('../../package').version);

  // load commands
  require('./api')(config, program);
  require('./config')(config, program);
  require('./create-sync')(config, program);
  require('./provider')(config, program);
  require('./download-categories')(config, program);
  require('./sync')(config, program);
  require('./user')(config, program);

  // handle command errors
  program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands', program.args.join(' '));
    process.exit(1);
  });

  // show help if command omitted
  if (argv.slice(2).length === 0) {
    program.outputHelp();
    return;
  }

  // pars args
  program.parse(argv);
};

