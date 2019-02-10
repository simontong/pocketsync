exports.up = async function(knex) {
  await knex.schema.createTable('accounts', function(t) {
    t.increments();
    t.integer('user_id').notNullable().unsigned().references('id').inTable('users');
    t.integer('provider_id').notNullable().unsigned().references('id').inTable('providers');
    t.string('provider_ref').notNullable().comment('ID from provider to identify this account');
    t.string('name').notNullable();
    t.specificType('currency', 'char(3)').notNullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    t.unique(['user_id', 'provider_id', 'provider_ref']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('accounts');
};
