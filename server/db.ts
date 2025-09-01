import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
// Function to open the database
export async function openDB() {
    return open({
        filename: './users.db',  // adjust path accordingly
        driver: sqlite3.Database
    });
}
