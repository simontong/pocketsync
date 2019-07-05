exports.up = async function(knex) {
  await knex.schema.table('transactions', function(t) {
    t.json('attachments').after('is_transfer');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('transactions', function(t) {
    t.dropColumn('attachments');
  });
};
