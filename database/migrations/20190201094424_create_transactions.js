exports.up = async function(knex) {
  await knex.schema.createTable('transactions', function(t) {
    t.increments();
    t.integer('account_id').notNullable().unsigned().references('id').inTable('accounts');
    t.string('provider_ref').notNullable().comment('ID from provider to identify this transaction');
    t.string('payee').notNullable();
    t.integer('amount').notNullable();
    t.date('date').notNullable();
    t.boolean('is_transfer').notNullable().defaultTo(false);
    // t.text('note');
    // t.text('memo');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.unique(['account_id', 'provider_ref']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('transactions');
};
