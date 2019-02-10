'use strict';

module.exports = (log, err) => {
  switch (err.name) {
    case 'InvalidConfigError':
    case 'InvalidParamError':
      console.log(err.message);
      break;

    default:
      log.error(err);
      console.log(err.message);
      break;
  }
};
