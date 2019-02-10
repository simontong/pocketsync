'use strict';

const invalidConfigError = require('../../core/errors/invalidConfigError');
// const invalidParamError = require('../../core/errors/invalidParamError');

const baseUrl = 'https://b2b.revolut.com/api/1.0';

module.exports = (ctx) => {
  const { config, request } = ctx;

  /**
   * Call API
   * @param path
   * @param customOpts
   * @param withToken
   * @returns {Promise<*>}
   */
  const call = async (path, customOpts = {}, withToken = true) => {
    const opts = {
      json: true,
      url: `${baseUrl}/${path}`,
      headers: {},
      ...customOpts,
    };

    // add auth token
    if (withToken && !opts.headers.Authorization) {
      const accessToken = await config('accessToken');
      if (!accessToken) {
        throw invalidConfigError('RevolutBusiness config missing `accessToken`. See README for instructions');
      }
      opts.headers.Authorization = `Bearer ${accessToken}`;
    }

    return request(opts);
  };

  return {
    /**
     * Fetch accounts
     * @returns {*}
     */
    fetchAccounts() {
      return call('accounts');
    },

    /**
     * Fetch transactions
     * @param from
     * @param to
     * @param counterParty
     * @param type
     * @param perPage
     * @return {Promise<*>}
     */
    fetchTransactions({ perPage = 1000, from, to, counterParty, type }) {
      const qs = {
        from,
        to,
        counterparty: counterParty,
        type,
        count: perPage,
      };

      return call('transactions', { qs });
    },
  };
};
