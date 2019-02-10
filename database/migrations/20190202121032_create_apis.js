exports.up = async function(knex) {
  await knex.schema.createTable('apis', function(t) {
    t.increments();
    t.integer('user_id').notNullable().unsigned().references('id').inTable('users');
    t.integer('provider_id').notNullable().unsigned().references('id').inTable('providers');
    t.string('type').notNullable();
    t.string('provider_ref').notNullable().comment('ID from provider to identify this api call');
    t.json('data').notNullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    t.unique(['user_id', 'provider_id', 'type', 'provider_ref']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('apis');
};
