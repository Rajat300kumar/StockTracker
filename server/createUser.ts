// scripts/createUser.ts
import bcrypt from 'bcrypt';
import { openDB } from './db/db'; // adjust path

async function createUser() {
  const db = await openDB();

  const email = 'user@gmail.com';
  const plainPassword = '123456';
  const username = 'Rajat';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashedPassword, email]
  );

  console.log('✅ User created with hashed password');
}

createUser();

