exports.up = async function(knex) {
  await knex.schema.createTable("category_map", function(t) {
    t.charset('utf8mb4');
    t.collate('utf8mb4_unicode_ci');
    t.increments();
    t.integer('left_category_id').notNullable().unsigned().references('id').inTable('categories');
    t.integer('right_category_id').notNullable().unsigned().references('id').inTable('categories');
    // t.timestamps();

    t.unique(['left_category_id', 'right_category_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable("category_map");
};
