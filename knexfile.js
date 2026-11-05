
require('dotenv').config();

function createConnection(prefix, databaseFallback) {
  return {
    client: 'mysql2',
    connection: {
      host: process.env[`${prefix}_HOST`],
      port: Number(process.env[`${prefix}_PORT`] || 3306),
      user: process.env[`${prefix}_USER`],
      password: process.env[`${prefix}_PASSWORD`],
      database: process.env[`${prefix}_DATABASE`] || databaseFallback,
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? {} : undefined
    },
    pool: {
      min: 0,
      max: Number(process.env.DB_CONNECTION_LIMIT || 10)
    },
    migrations: {
      directory: `./src/db/migrations/${prefix.replace('DB_', '').toLowerCase()}`,
      tableName: 'knex_migrations'
    }
  };
}

const oltp = createConnection('DB_OLTP', 'superuni_oltp');
const olap = createConnection('DB_OLAP', 'superunifame');

module.exports = {
  development: { oltp, olap },
  production: { oltp, olap }
};

