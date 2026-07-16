import bcrypt from 'bcryptjs';
import pool from './db';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent';
}

const defaultUsers: SeedUser[] = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    name: 'Agent User',
    email: 'agent@example.com',
    password: 'Agent123!',
    role: 'agent',
  },
];

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    for (const user of defaultUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await client.query(
        `INSERT INTO users (name, email, "passwordHash", role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [user.name, user.email, passwordHash, user.role]
      );

      console.log(`Seeded user: ${user.email} (${user.role})`);
    }

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
