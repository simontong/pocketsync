exports.up = async function(knex) {
  await knex.schema.createTable('sync_transaction', function(t) {
    t.increments();
    t.integer('sync_id').notNullable().unsigned().references('id').inTable('syncs');
    t.integer('transaction_id').notNullable().unsigned().references('id').inTable('transactions');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    t.unique(['sync_id', 'transaction_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('sync_transaction');
};
