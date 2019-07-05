exports.up = async function(knex) {
  await knex.schema.createTable('providers', function(t) {
    t.charset('utf8mb4');
    t.collate('utf8mb4_unicode_ci');
    t.increments();
    t.string('name').notNullable().unique();
    t.boolean('is_source').notNullable().defaultTo(true);
    t.boolean('is_target').notNullable().defaultTo(false);
    // t.timestamps();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('providers');
};
