const path = require('path');
const fs = require('fs');

exports.up = async function(knex) {
  await knex.schema.table('providers', function(t) {
    t.string('code').unique().after('id');
  });

  const dir = path.join(__dirname, '../../app/providers');

  // get providers
  for (const name of fs.readdirSync(dir)) {
    const providerDir = path.join(dir, name);

    // if not a dir then ignore
    if (!fs.lstatSync(providerDir).isDirectory()) {
      continue;
    }

    // load provider so we can check if its a source and / or target
    const provider = require(providerDir)({});
    if (!provider.meta) {
      continue;
    }
    const meta = provider.meta;

    // prep meta
    const params = {
      code: meta.code,
      name,
      is_source: !!meta.isSource,
      is_target: !!meta.isTarget,
    };

    const check = await knex.table('providers').where('name', name).first();
    if (!check) {
      await knex.table('providers').insert(params);
    } else {
      await knex.table('providers').update(params).where('id', check.id);
    }
  }
};

exports.down = async function(knex) {
  await knex.schema.table('providers', function(t) {
    t.dropColumn('code');
  });
};
