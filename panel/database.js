import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Hex Database Configuration
// The default database is SQLite as per Hex specifications.
// If you want to use MongoDB, MySQL, or Postgres, you can change the adapter here.
// The rest of the Next.js Panel application interacts with this unified interface.

let db = null;

export async function getDb() {
  if (db) return db;

  // By default, store the sqlite database in /var/lib/Hex/panel.db on VPS
  // or a local file for development.
  const dbPath = process.env.NODE_ENV === 'production' 
    ? '/var/lib/Hex/panel.db' 
    : path.resolve(process.cwd(), 'hex-local.db');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );
  `);

  return db;
}
