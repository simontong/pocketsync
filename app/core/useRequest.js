'use strict';

const request = require('request-promise-native');

/**
 * Use request
 * @param log
 * @return {function(...[*])}
 */
const useRequest = (log) => async (...opts) => {
  try {
    const fn = request(...opts);
    log.trace('Request:', fn.method.toUpperCase(), fn.uri.href);
    return await fn;
  } catch (e) {
    throw e;
  }
};

module.exports = useRequest;
