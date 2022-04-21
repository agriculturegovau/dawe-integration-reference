// Update with your config settings.
require('dotenv').config()

let env = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        enableArithAbort: true,
        trustServerCertificate: true,
        port: 5432
      }
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

module.exports = {
  development: env,
  test: env,
  production: env
};
