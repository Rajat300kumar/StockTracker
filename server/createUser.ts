// scripts/createUser.ts
import bcrypt from 'bcrypt';
import { openDB } from './db'; // adjust path

async function createUser() {
  const db = await openDB();

  const email = 'rajatranjan300@gmail.com';
  const plainPassword = 'ohjnxxj8ce';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [email, hashedPassword]
  );

  console.log('✅ User created with hashed password');
}

createUser();
