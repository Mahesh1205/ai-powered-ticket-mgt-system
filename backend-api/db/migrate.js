/**
 * Database migration runner
 * Reads .sql files from db/migrations/ in order and executes them.
 */
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, 'migrations');

  const allFiles = await fs.readdir(migrationsDir);
  const files = allFiles
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');

      console.log(`  Running: ${file}`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
