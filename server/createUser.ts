// scripts/createUser.ts
import bcrypt from 'bcrypt';
import { openDB } from './db'; // adjust path

async function createUser() {
  const db = await openDB();

  const email = 'user@gmail.com';
  const plainPassword = '12345678';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [email, hashedPassword]
  );

  console.log('✅ User created with hashed password');
}

createUser();
