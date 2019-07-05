'use strict';

const invalidConfigError = require('../../core/errors/invalidConfigError');
const invalidParamError = require('../../core/errors/invalidParamError');

const baseUrl = 'https://api.pocketsmith.com/v2';

module.exports = (ctx) => {
  /**
   * Call API
   * @param path
   * @param customOpts
   * @param withToken
   * @returns {Promise<*>}
   */
  const call = async (path, customOpts = {}, withToken = true) => {
    const { config, request } = ctx;

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
        throw invalidConfigError('PocketSmith config missing `accessToken`. See README for instructions');
      }
      opts.headers.Authorization = `Key ${accessToken}`;
    }

    return request(opts);
  };

  return {
    /**
     * Fetch user
     * @returns {Promise<*>}
     */
    fetchMe () {
      return call('me');
    },

    /**
     * fetch transaction categories
     * @param userId
     */
    fetchCategories(userId) {
      if (!userId) throw invalidParamError('PocketSmith missing `userId` argument');
      return call(`users/${userId}/categories`);
    },

    /**
     * fetch accounts
     * @param userId
     * @returns {Promise<*>}
     */
    fetchTransactionAccounts (userId) {
      if (!userId) throw invalidParamError('PocketSmith missing `userId` argument');
      return call(`users/${userId}/transaction_accounts`);
    },

    /**
     * Fetch categories
     * @param accountId
     * @param page
     * @param startDate
     * @param endDate
     * @param perPage
     * @returns {Promise<void>}
     */
    fetchTransactions ({ accountId, perPage = 100, page = 1, startDate, endDate }) {
      if (!accountId) throw invalidParamError('PocketSmith missing `accountId` argument');

      const qs = {
        page,
        per_page: perPage,
        start_date: startDate,
        end_date: endDate,
      };

      return call(`transaction_accounts/${accountId}/transactions`, { qs });
    },

    /**
     * Fetch attachments for a transaction
     * @param transactionId
     */
    fetchTransactionAttachments (transactionId) {
      return call(`transactions/${transactionId}/attachments`);
    },

    /**
     * Create transaction
     * @param accountId
     * @param transaction
     * @return {Promise<*>}
     */
    createTransaction (accountId, transaction) {
      if (!accountId) throw invalidParamError('PocketSmith missing `accountId` argument');
      if (!transaction) throw invalidParamError('PocketSmith missing `transaction` argument');

      const opts = {
        method: 'post',
        form: transaction,
      };

      return call(`transaction_accounts/${accountId}/transactions`, opts);
    },
  };
};
