/**
 * Daily food-log store backed by SQLite (physiq_logs.db).
 *
 * Replaces the single AsyncStorage JSON blob (STORAGE_KEYS.DAILY_LOGS) that
 * was rewritten in full on every add/edit/delete. Rows are one-per-entry so
 * writes are O(1) and history growth no longer slows logging or launch.
 *
 * - Entries are stored as JSON per row (FoodEntry has many optional fields);
 *   date_key gives per-day querying for history/trends.
 * - One-time migration: the legacy blob is normalized once
 *   (see dailyLogMigration.ts), inserted in a single transaction, and the
 *   original blob is kept at BACKUP_KEY as a rollback path — never deleted.
 * - Safety net: if SQLite is unavailable or migration fails, the repo falls
 *   back to the legacy AsyncStorage blob path (same behavior as before this
 *   refactor), so a bad device state can never blank the log.
 * - All writes flow through a single promise queue so rapid successive
 *   operations apply in call order on both backends.
 */

import { STORAGE_KEYS, loadData, removeData, saveData } from '../services/storage';
import { FoodEntry } from '../types';
import { normalizeStoredLogs, StoredLogs } from './dailyLogMigration';

const DB_NAME = 'physiq_logs.db';
const LEGACY_BLOB_KEY = 'abz_food_logs';
export const BACKUP_KEY = 'physiq_daily_logs_backup_v1';
const META_MIGRATED = 'migrated_v1';

export interface LogRow {
  id: string;
  dateKey: string;
  createdAt: number;
  entryJson: string;
}

/**
 * Row-level backend so repo logic (migration, grouping, ordering, fallback)
 * is unit-testable in Node with an in-memory implementation; the SQLite
 * implementation stays a thin SQL wrapper.
 */
export interface LogBackend {
  init(): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  /** Upsert by id. */
  insertRows(rows: LogRow[]): Promise<void>;
  updateRow(row: LogRow): Promise<void>;
  deleteRow(id: string): Promise<void>;
  deleteByDate(dateKey: string): Promise<void>;
  clear(): Promise<void>;
  /** All rows ordered by createdAt, then insertion order. */
  getAllRows(): Promise<LogRow[]>;
}

// ─── SQLite backend (thin; not exercised by unit tests) ─────────────────────

type SqliteDb = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

function createSqliteBackend(): LogBackend {
  let db: SqliteDb | null = null;

  async function getDb(): Promise<SqliteDb> {
    if (db) return db;
    // Dynamic import keeps this module loadable in Node (jest) without the
    // native module; only the SQLite backend touches expo-sqlite.
    const SQLite = await import('expo-sqlite');
    db = (await SQLite.openDatabaseAsync(DB_NAME)) as unknown as SqliteDb;
    return db;
  }

  return {
    async init() {
      const d = await getDb();
      await d.execAsync(`
        CREATE TABLE IF NOT EXISTS log_entries (
          id TEXT PRIMARY KEY,
          date_key TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT 0,
          entry_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(date_key);
        CREATE TABLE IF NOT EXISTS log_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
    async getMeta(key) {
      const d = await getDb();
      const row = await d.getFirstAsync<{ value: string }>(
        'SELECT value FROM log_meta WHERE key = ?',
        key
      );
      return row?.value ?? null;
    },
    async setMeta(key, value) {
      const d = await getDb();
      await d.runAsync('INSERT OR REPLACE INTO log_meta (key, value) VALUES (?, ?)', key, value);
    },
    async insertRows(rows) {
      if (rows.length === 0) return;
      const d = await getDb();
      await d.withTransactionAsync(async () => {
        for (const row of rows) {
          await d.runAsync(
            'INSERT OR REPLACE INTO log_entries (id, date_key, created_at, entry_json) VALUES (?, ?, ?, ?)',
            row.id,
            row.dateKey,
            row.createdAt,
            row.entryJson
          );
        }
      });
    },
    async updateRow(row) {
      const d = await getDb();
      await d.runAsync(
        'UPDATE log_entries SET date_key = ?, entry_json = ? WHERE id = ?',
        row.dateKey,
        row.entryJson,
        row.id
      );
    },
    async deleteRow(id) {
      const d = await getDb();
      await d.runAsync('DELETE FROM log_entries WHERE id = ?', id);
    },
    async deleteByDate(dateKey) {
      const d = await getDb();
      await d.runAsync('DELETE FROM log_entries WHERE date_key = ?', dateKey);
    },
    async clear() {
      const d = await getDb();
      await d.runAsync('DELETE FROM log_entries');
    },
    async getAllRows() {
      const d = await getDb();
      const rows = await d.getAllAsync<{
        id: string;
        date_key: string;
        created_at: number;
        entry_json: string;
      }>('SELECT id, date_key, created_at, entry_json FROM log_entries ORDER BY created_at, rowid');
      return rows.map((r) => ({
        id: r.id,
        dateKey: r.date_key,
        createdAt: r.created_at,
        entryJson: r.entry_json,
      }));
    },
  };
}

// ─── Store (backend-agnostic logic) ──────────────────────────────────────────

export interface BlobIO {
  load(key: string): Promise<StoredLogs | null>;
  save(key: string, value: StoredLogs): Promise<void>;
  remove(key: string): Promise<void>;
}

const defaultBlobIO: BlobIO = {
  load: (key) => loadData<StoredLogs>(key),
  save: (key, value) => saveData(key, value),
  remove: (key) => removeData(key),
};

export function entryToRow(dateKey: string, entry: FoodEntry): LogRow {
  const parsed = Date.parse(entry.timestamp ?? '');
  return {
    id: entry.id,
    dateKey,
    createdAt: Number.isFinite(parsed) ? parsed : Date.now(),
    entryJson: JSON.stringify(entry),
  };
}

export function groupRows(rows: LogRow[]): StoredLogs {
  const out: StoredLogs = {};
  for (const row of rows) {
    let entry: FoodEntry;
    try {
      entry = JSON.parse(row.entryJson) as FoodEntry;
    } catch {
      continue; // skip corrupt rows rather than failing the whole load
    }
    (out[row.dateKey] ??= []).push(entry);
  }
  return out;
}

export interface DailyLogStore {
  loadAllLogs(): Promise<StoredLogs>;
  insertEntries(dateKey: string, entries: FoodEntry[]): Promise<void>;
  updateEntry(dateKey: string, entry: FoodEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  deleteDay(dateKey: string): Promise<void>;
  clearAll(): Promise<void>;
}

export function createDailyLogStore(
  backend: LogBackend,
  blobIO: BlobIO = defaultBlobIO
): DailyLogStore {
  /** 'sqlite' once ready; 'blob' if the backend failed (legacy behavior). */
  let mode: 'sqlite' | 'blob' | null = null;
  let readyPromise: Promise<'sqlite' | 'blob'> | null = null;
  /** Serializes all writes so rapid successive operations apply in order. */
  let writeQueue: Promise<void> = Promise.resolve();

  async function loadLegacyLogs(): Promise<StoredLogs> {
    const stored =
      (await blobIO.load(STORAGE_KEYS.DAILY_LOGS)) ??
      (await blobIO.load(LEGACY_BLOB_KEY)) ??
      (await blobIO.load(BACKUP_KEY));
    return normalizeStoredLogs(stored ?? {});
  }

  async function migrateBlobIfNeeded(): Promise<void> {
    if ((await backend.getMeta(META_MIGRATED)) === '1') return;
    const blob =
      (await blobIO.load(STORAGE_KEYS.DAILY_LOGS)) ?? (await blobIO.load(LEGACY_BLOB_KEY));
    if (blob) {
      const normalized = normalizeStoredLogs(blob);
      const rows: LogRow[] = [];
      for (const [dateKey, entries] of Object.entries(normalized)) {
        for (const entry of entries) {
          rows.push(entryToRow(dateKey, entry));
        }
      }
      await backend.insertRows(rows);
      // Keep the original blob as a rollback path; never delete it.
      await blobIO.save(BACKUP_KEY, blob);
      await blobIO.remove(STORAGE_KEYS.DAILY_LOGS);
      await blobIO.remove(LEGACY_BLOB_KEY);
    }
    await backend.setMeta(META_MIGRATED, '1');
  }

  function ensureReady(): Promise<'sqlite' | 'blob'> {
    if (!readyPromise) {
      readyPromise = (async () => {
        try {
          await backend.init();
          await migrateBlobIfNeeded();
          mode = 'sqlite';
        } catch (error) {
          console.warn('[DailyLogRepo] SQLite unavailable, using AsyncStorage blob', error);
          mode = 'blob';
        }
        return mode;
      })();
    }
    return readyPromise;
  }

  /** Blob-mode read-modify-write (runs inside the write queue). */
  async function mutateBlob(mutate: (logs: StoredLogs) => StoredLogs): Promise<void> {
    const current = (await blobIO.load(STORAGE_KEYS.DAILY_LOGS)) ?? {};
    await blobIO.save(STORAGE_KEYS.DAILY_LOGS, mutate(current));
  }

  function enqueue(op: () => Promise<void>): Promise<void> {
    const next = writeQueue.then(op, op);
    writeQueue = next.catch((error) => {
      console.warn('[DailyLogRepo] write failed', error);
    });
    return writeQueue;
  }

  return {
    async loadAllLogs() {
      const activeMode = await ensureReady();
      if (activeMode === 'blob') return loadLegacyLogs();
      try {
        return groupRows(await backend.getAllRows());
      } catch (error) {
        console.warn('[DailyLogRepo] read failed, falling back to blob', error);
        return loadLegacyLogs();
      }
    },
    insertEntries(dateKey, entries) {
      if (entries.length === 0) return Promise.resolve();
      return enqueue(async () => {
        const activeMode = await ensureReady();
        if (activeMode === 'sqlite') {
          await backend.insertRows(entries.map((entry) => entryToRow(dateKey, entry)));
        } else {
          await mutateBlob((logs) => ({
            ...logs,
            [dateKey]: [...(logs[dateKey] ?? []), ...entries],
          }));
        }
      });
    },
    updateEntry(dateKey, entry) {
      return enqueue(async () => {
        const activeMode = await ensureReady();
        if (activeMode === 'sqlite') {
          await backend.updateRow(entryToRow(dateKey, entry));
        } else {
          await mutateBlob((logs) => ({
            ...logs,
            [dateKey]: (logs[dateKey] ?? []).map((e) => (e.id === entry.id ? entry : e)),
          }));
        }
      });
    },
    deleteEntry(id) {
      return enqueue(async () => {
        const activeMode = await ensureReady();
        if (activeMode === 'sqlite') {
          await backend.deleteRow(id);
        } else {
          await mutateBlob((logs) => {
            const out: StoredLogs = {};
            for (const [date, entries] of Object.entries(logs)) {
              out[date] = entries.filter((e) => e.id !== id);
            }
            return out;
          });
        }
      });
    },
    deleteDay(dateKey) {
      return enqueue(async () => {
        const activeMode = await ensureReady();
        if (activeMode === 'sqlite') {
          await backend.deleteByDate(dateKey);
        } else {
          await mutateBlob((logs) => {
            const { [dateKey]: _removed, ...rest } = logs;
            return rest;
          });
        }
      });
    },
    clearAll() {
      return enqueue(async () => {
        const activeMode = await ensureReady();
        if (activeMode === 'sqlite') {
          await backend.clear();
        } else {
          await blobIO.remove(STORAGE_KEYS.DAILY_LOGS);
        }
      });
    },
  };
}

// ─── App singleton ───────────────────────────────────────────────────────────

let defaultStore: DailyLogStore | null = null;

function getStore(): DailyLogStore {
  if (!defaultStore) {
    defaultStore = createDailyLogStore(createSqliteBackend());
  }
  return defaultStore;
}

export const loadAllLogs = (): Promise<StoredLogs> => getStore().loadAllLogs();
export const insertEntries = (dateKey: string, entries: FoodEntry[]): Promise<void> =>
  getStore().insertEntries(dateKey, entries);
export const updateEntry = (dateKey: string, entry: FoodEntry): Promise<void> =>
  getStore().updateEntry(dateKey, entry);
export const deleteEntry = (id: string): Promise<void> => getStore().deleteEntry(id);
export const deleteDay = (dateKey: string): Promise<void> => getStore().deleteDay(dateKey);
export const clearAll = (): Promise<void> => getStore().clearAll();
