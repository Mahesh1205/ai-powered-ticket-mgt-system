import fs from 'fs';
import path from 'path';
import pool from './db';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');

  // Get all .sql files sorted by name
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
