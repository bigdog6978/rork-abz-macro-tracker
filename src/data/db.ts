/**
 * SQLite database for local foods (barcode-scanned, saved).
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'abz_foods.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      barcode TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL DEFAULT 'openfoodfacts',
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      serving_size TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_stats (
      food_id TEXT PRIMARY KEY,
      selection_count INTEGER NOT NULL DEFAULT 0,
      last_selected_at INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (food_id) REFERENCES foods(id)
    );

    CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);
    CREATE INDEX IF NOT EXISTS idx_foods_source ON foods(source);
  `);
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
