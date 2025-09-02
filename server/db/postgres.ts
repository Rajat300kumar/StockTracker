// src/db/postgres.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'stock_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stock_data',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432')
});
console.log("Postgres pool created with config:", {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;   