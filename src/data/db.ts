/**
 * SQLite database for local foods (barcode-scanned, saved, imported catalogs).
 *
 * Schema versions:
 *   0 – original: foods + food_stats tables
 *   1 – unified catalog: search_name column, catalog_meta table, composite index
 *   2 – saved_at column: distinguishes explicitly user-saved foods from auto-cached entries
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'abz_foods.db';
const CURRENT_SCHEMA = 2;

let db: SQLite.SQLiteDatabase | null = null;

export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  return db;
}

async function getSchemaVersion(database: SQLite.SQLiteDatabase): Promise<number> {
  try {
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0)`
    );
    const row = await database.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version LIMIT 1'
    );
    if (!row) {
      await database.runAsync('INSERT INTO schema_version (version) VALUES (0)');
      return 0;
    }
    return row.version;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(
  database: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1'
  );
  if (row) {
    await database.runAsync('UPDATE schema_version SET version = ?', [version]);
  } else {
    await database.runAsync('INSERT INTO schema_version (version) VALUES (?)', [version]);
  }
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // V0: baseline tables
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

  const version = await getSchemaVersion(database);

  if (version < 1) {
    try {
      await database.execAsync(`ALTER TABLE foods ADD COLUMN search_name TEXT`);
    } catch {
      // Column may already exist from a partial migration
    }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS catalog_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_foods_search_name ON foods(search_name);
      CREATE INDEX IF NOT EXISTS idx_foods_source_search ON foods(source, search_name);
    `);

    // Backfill search_name for rows that predate the column
    await database.execAsync(`
      UPDATE foods SET search_name = LOWER(REPLACE(REPLACE(REPLACE(name, ',', ' '), '-', ' '), '  ', ' '))
      WHERE search_name IS NULL
    `);

    await setSchemaVersion(database, 1);
  }

  if (version < 2) {
    try {
      await database.execAsync(`ALTER TABLE foods ADD COLUMN saved_at INTEGER`);
    } catch {
      // Column may already exist
    }
    await database.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_foods_saved_at ON foods(saved_at)`
    );
    await setSchemaVersion(database, 2);
  }
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
