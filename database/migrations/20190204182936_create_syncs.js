exports.up = async function(knex) {
  await knex.schema.createTable('syncs', function(t) {
    t.increments();
    t.integer('source_account_id').notNullable().unsigned().references('id').inTable('accounts');
    t.integer('target_account_id').notNullable().unsigned().references('id').inTable('accounts');
    t.string('name').notNullable().unique().comment('Unique name for calling from command line');
    // t.timestamps();

    t.unique(['source_account_id', 'target_account_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('syncs');
};
