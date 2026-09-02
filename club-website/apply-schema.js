const fs = require('fs');
const db = require('./config/database');

async function run() {
  try {
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log('Schema applied successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
