const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let connected = false;
pool.on('connect', () => {
  if (!connected) { console.log('📦 Connected to PostgreSQL'); connected = true; }
});
pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message);
});

module.exports = { query: (text, params) => pool.query(text, params), pool };
