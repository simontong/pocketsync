exports.up = async function(knex) {
  await knex.schema.createTable('users', function(t) {
    t.charset('utf8mb4');
    t.collate('utf8mb4_unicode_ci');
    t.increments();
    t.string('user').notNullable().unique();
    // t.timestamps();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('users');
};
