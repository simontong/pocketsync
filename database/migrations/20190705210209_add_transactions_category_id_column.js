exports.up = async function(knex) {
  await knex.schema.table('transactions', function(t) {
    t.integer('category_id').after('account_id');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('transactions', function(t) {
    t.dropColumn('category_id');
  });
};
