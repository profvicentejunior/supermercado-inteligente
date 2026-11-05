
const knexFactory = require('knex');
const config = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';

async function migrateDatabase(name, databaseConfig) {
  const db = knexFactory(databaseConfig);

  try {
    console.log(`\nIniciando migrations: ${name}`);

    const [batch, migrations] = await db.migrate.latest();

    console.log(`Banco: ${name}`);
    console.log(`Lote: ${batch}`);
    console.log(`Migrations executadas: ${migrations.length}`);

    migrations.forEach(migration => {
      console.log(`  ✔ ${migration}`);
    });
  } finally {
    await db.destroy();
  }
}

async function main() {
  try {
    await migrateDatabase('OLTP', config[env].oltp);
    await migrateDatabase('OLAP', config[env].olap);

    console.log('\n✅ PROCESSO DE MIGRATIONS CONCLUÍDO!');
  } catch (error) {
    console.error('\n❌ ERRO NAS MIGRATIONS');
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();

