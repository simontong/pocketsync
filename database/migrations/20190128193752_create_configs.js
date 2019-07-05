exports.up = async function(knex) {
  await knex.schema.createTable('configs', function(t) {
    t.charset('utf8mb4');
    t.collate('utf8mb4_unicode_ci');
    t.increments();
    t.integer('user_id').notNullable().unsigned().references('id').inTable('users');
    t.integer('provider_id').notNullable().unsigned().references('id').inTable('providers');
    t.json('config');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    t.unique(['user_id', 'provider_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('configs');
};
