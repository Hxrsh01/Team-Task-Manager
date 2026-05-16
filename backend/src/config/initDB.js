const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initDB(retries = 5, delayMs = 3000) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(schema);
      console.log('✅ Database schema initialized');
      return;
    } catch (err) {
      console.error(`❌ DB init attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}

module.exports = initDB;
