const { Pool } = require('pg');
const url = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
