'use strict';

const baseModel = (db, tableName, primaryKey = 'id') => ({
  /**
   * Get last inserted id
   * @return {Promise<null|Number>}
   */
  async lastInsertedId(table = tableName) {
    const lastInserted = await db
      .table(table)
      .select(db.raw('last_insert_id() as id'))
      .first();

    return lastInserted ? lastInserted.id : null;
  },

  /**
   * find
   * @param where
   * @return {Knex.QueryBuilder}
   */
  find(...where) {
    const q = db.table(tableName);
    if (!where.length) {
      return q;
    }
    return q.where(...where);
  },

  /**
   * Find record or fail
   * @param where
   * @returns {Promise<*>}
   */
  async findOrFail(...where) {
    const row = await this.find(...where).first();
    if (!row) {
      throw new Error(`Could not find row in ${tableName} table`);
    }
    return row;
  },

  /**
   * Fetch by id(s)
   * @param id
   * @return {Knex.QueryBuilder}
   */
  byId(id) {
    id = Array.isArray(id) ? id : [id];
    return db.table(tableName).whereIn(primaryKey, id);
  },

  /**
   * Create
   * @param params
   * @return {Knex.QueryBuilder}
   */
  create(params) {
    return db.table(tableName).insert(params);
  },

  /**
   * Update
   * @param params
   * @param where
   * @return {Knex.QueryBuilder}
   */
  update(params, where) {
    return db
      .table(tableName)
      .where(where)
      .update(params);
  },

  /**
   * Update or create
   * @param params
   * @param where
   * @param shouldUpdateFn
   * @return {Promise<*>}
   */
  async updateOrCreate(params, where, shouldUpdateFn) {
    // if does not exist then create
    const check = await this.find(where).first();
    if (!check) {
      await this.create(params);

      // get last inserted
      const lastInsertedId = await this.lastInsertedId();

      return { created: 1, id: lastInsertedId };
    }

    // check if should update
    if (shouldUpdateFn && !shouldUpdateFn(params, check)) {
      return { id: check[primaryKey] };
    }

    // else update
    await this.update(params, where);

    return { updated: 1, id: check[primaryKey] };
  },

  /**
   * Find or create
   * @param params
   * @param where
   * @return {Promise<Knex.QueryBuilder>}
   */
  async findOrCreate(params, where) {
    // check if exists
    const check = await this.find(where).first();
    if (check) {
      return check;
    }

    // if does not exist then create
    await db.table(tableName).insert(params);

    // get last inserted
    const lastInsertedId = await this.lastInsertedId();

    // return new row
    return db
      .table(tableName)
      .where(primaryKey, lastInsertedId)
      .first();
  },

  /**
   * Delete rows by id
   * @param id
   * @return {Knex.QueryBuilder}
   */
  deleteById(id) {
    id = Array.isArray(id) ? id : [id];
    return db(tableName)
      .whereIn(primaryKey, id)
      .delete();
  },
});

module.exports = baseModel;
