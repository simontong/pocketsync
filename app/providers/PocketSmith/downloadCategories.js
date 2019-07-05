'use strict';

const _ = require('lodash');
const api = require('./api');
const { processCategories } = require('../../core/helpers');
const schema = require('./schemas/category');

/**
 * Fetch and normalize categories
 * @param ctx
 * @return {function(): Promise<*|Knex.QueryBuilder>}
 */
const downloadCategories = (ctx) => async () => {
  return processCategories(ctx, schema, fetchCategories, getCategoryProviderRef, normalizeCategory);
};

/**
 * Fetch categories
 * @param ctx
 * @return {Promise<any[]>}
 */
const fetchCategories = async (ctx) => {
  const req = api(ctx);

  // fetch categories
  const me = await req.fetchMe();
  const data = await req.fetchCategories(me.id);

  /**
   * Recurse to get flat array
   * @param rows
   * @param children
   * @returns {Array}
   */
  const recurse = (rows, children = []) => {
    children.push(...rows);
    for (const row of rows) {
      if (Array.isArray(row.children) && row.children.length) {
        recurse(row.children, children);
      }
    }
    return children;
  };

  return recurse(data);
};

/**
 * category provider ref getter
 * @param category
 * @return {*}
 */
const getCategoryProviderRef = (category) => {
  return category.id;
};

/**
 * Normalize API data from category fetch
 * @param row
 * @param rows
 * @return {*}
 */
const normalizeCategory = (row, rows) => {
  const data = row.data;

  /**
   * Recurse to find tree
   * @param rows
   * @param tree
   * @returns {Array}
   */
  const recurse = (rows, tree = []) => {
    const parentId = tree[0].parent_id;
    if (!parentId) {
      return tree;
    }

    for (const row of rows) {
      if (parentId === row.data.id) {
        tree.unshift(row.data);
        recurse(rows, tree);
        break;
      }
    }
    return tree;
  };

  // build tree
  const tree = JSON.stringify(
    _.map(recurse(rows, [data]), 'title'),
  );

  // normalize
  return {
    user_id: row.user_id,
    provider_id: row.provider_id,
    provider_ref: row.provider_ref,
    name: data.title,
    tree,
  };
};

module.exports = {
  downloadCategories,
  getCategoryProviderRef,
  normalizeCategory,
};
