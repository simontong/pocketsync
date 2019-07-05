exports.up = async function(knex) {
  await knex.schema.createTable("category_map", function(t) {
    t.increments();
    t.integer('left_category_id').notNullable().unsigned().references('id').inTable('categories');
    t.integer('right_category_id').notNullable().unsigned().references('id').inTable('categories');
    // t.timestamps();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable("category_map");
};
