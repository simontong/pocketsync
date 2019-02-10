'use strict';

const invalidConfigError = require('../../core/errors/invalidConfigError');
const invalidParamError = require('../../core/errors/invalidParamError');
const qs = require('qs');

const baseUrl = 'https://api.freeagent.com/v2';
const userAgent = 'PocketSync';

const api = (ctx) => {
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
      headers: {
        'User-Agent': userAgent,
      },
      ...customOpts,
    };

    // add auth token
    if (withToken && !opts.headers.Authorization) {
      const accessToken = await config('accessToken');
      if (!accessToken) {
        throw invalidConfigError('FreeAgent config missing `accessToken`. See README for instructions');
      }
      opts.headers.Authorization = `Bearer ${accessToken}`;
    }

    return request(opts);
  };

  return {
    /**
     * Get app auth URL
     * @return {Promise<string>}
     */
    async getAppAuthUrl() {
      const { identifier, redirectUri } = await config();

      // make sure we have correct config
      if (!identifier) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `identifier`');
      if (!redirectUri) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `redirectUri`');

      const params = qs.stringify({
        redirect_uri: redirectUri,
        response_type: 'code',
        client_id: identifier,
      });

      return `${baseUrl}/approve_app?${params}`;
    },

    /**
     * Fetch access token
     * @param code
     * @return {Promise<*>}
     */
    async fetchAccessToken(code) {
      const { identifier, secret, redirectUri } = await config();

      // make sure we have correct config
      if (!identifier) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `identifier`');
      if (!secret) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `secret`');
      if (!redirectUri) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `redirectUri`');

      // check args
      if (!code) throw invalidParamError('FreeAgent missing `code` argument');

      // prepare request
      const opts = {
        method: 'post',
        auth: {
          user: identifier,
          password: secret,
        },
        form: {
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        },
      };

      return call('token_endpoint', opts, false);
    },

    /**
     * Refresh access token
     * @return {Promise<*>}
     */
    async refreshAccessToken() {
      const { identifier, secret, refreshToken } = await config();

      // make sure we have correct config
      if (!identifier) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `identifier`');
      if (!secret) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `secret`');
      if (!refreshToken) throw invalidConfigError('FreeAgent cannot refresh access token. Config missing `refreshToken`');

      // prepare request
      const opts = {
        method: 'post',
        auth: {
          user: identifier,
          password: secret,
        },
        form: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      };

      return call('token_endpoint', opts, false);
    },

    /**
     * Fetch authed user
     * @param userId
     * @return {Promise<*>}
     */
    fetchUser(userId = 'me') {
      return call(`users/${userId}`);
    },

    /**
     * Fetch accounts
     * @return {Promise<*>}
     * @public
     */
    fetchAccounts(view = 'all') {
      const qs = { view };
      return call('bank_accounts', { qs });
    },

    /**
     * Fetch bank transactions
     * @param bankAccount
     * @param page
     * @param fromDate
     * @param toDate
     * @param updatedSince
     * @param lastUploaded
     * @param perPage
     * @return {Promise<*>}
     */
    fetchTransactions({ bankAccount, perPage = 100, page = 1, fromDate, toDate, updatedSince, lastUploaded }) {
      // check args
      if (!bankAccount) throw invalidParamError('FreeAgent missing `bankAccount` argument');

      const qs = {
        bank_account: bankAccount,
        page: page,
        from_date: fromDate,
        to_date: toDate,
        updated_since: updatedSince,
        last_uploaded: lastUploaded,
        per_page: perPage,
      };

      return call('bank_transactions', { qs });
    },

    /**
     * Upload bank statement
     * @param bankAccount
     * @param statement
     * @return {Promise<*>}
     */
    createTransactions(bankAccount, statement) {
      // check args
      if (!bankAccount) throw invalidParamError('FreeAgent missing `bankAccount` argument');
      if (!statement) throw invalidParamError('FreeAgent missing `statement` argument');

      const opts = {
        method: 'post',
        qs: { bank_account: bankAccount },
        form: { statement },
      };

      return call('bank_transactions/statement', opts);
    },
  };
};

/**
 * Extract ID from API url for cleaner storage
 * Opposite of `formatId`
 * @param key
 * @param url
 * @return {*}
 */
const extractId = (key, url) => {
  const search = `${baseUrl}/${key}/`;
  if (!url.includes(search)) {
    throw new Error(`Could not extract ID. Key ${key} missing from ${url}`);
  }

  return url.replace(search, '');
};

/**
 * Opposite of `extractId`
 * @param key
 * @param id
 * @return {string}
 */
const formatId = (key, id) => {
  return `${baseUrl}/${key}/${id}`;
};

module.exports = {
  api,
  extractId,
  formatId,
};
