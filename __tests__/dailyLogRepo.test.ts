jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

jest.mock('../src/data/db', () => ({
  openDb: jest.fn(),
}));

jest.mock('../src/data/foodsRepo', () => ({
  upsertFood: jest.fn(),
  getFoodById: jest.fn(),
  searchFoods: jest.fn(),
}));

const memoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
  },
}));

import {
  BACKUP_KEY,
  createDailyLogStore,
  DailyLogStore,
  LogBackend,
  LogRow,
} from '../storage/dailyLogRepo';
import { StoredLogs } from '../storage/dailyLogMigration';
import { STORAGE_KEYS } from '../services/storage';
import { FoodEntry } from '../types';

function makeEntry(id: string, overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id,
    name: `Food ${id}`,
    calories: 100,
    protein_g: 10,
    carbs_g: 5,
    fat_g: 2,
    timestamp: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

/** In-memory LogBackend mirroring the SQLite semantics (upsert by id, ordered reads). */
function createMemoryBackend(opts: { failInit?: boolean } = {}) {
  const rows = new Map<string, LogRow>();
  const meta = new Map<string, string>();
  const backend: LogBackend = {
    async init() {
      if (opts.failInit) throw new Error('sqlite unavailable');
    },
    async getMeta(key) {
      return meta.get(key) ?? null;
    },
    async setMeta(key, value) {
      meta.set(key, value);
    },
    async insertRows(newRows) {
      for (const row of newRows) rows.set(row.id, row);
    },
    async updateRow(row) {
      if (rows.has(row.id)) rows.set(row.id, row);
    },
    async deleteRow(id) {
      rows.delete(id);
    },
    async deleteByDate(dateKey) {
      for (const [id, row] of rows) {
        if (row.dateKey === dateKey) rows.delete(id);
      }
    },
    async clear() {
      rows.clear();
    },
    async getAllRows() {
      return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
  };
  return { backend, rows, meta };
}

function seedBlob(key: string, logs: StoredLogs): void {
  memoryStore.set(key, JSON.stringify(logs));
}

describe('dailyLogRepo (SQLite mode)', () => {
  let store: DailyLogStore;
  let rows: Map<string, LogRow>;
  let meta: Map<string, string>;

  beforeEach(() => {
    memoryStore.clear();
    const backendBundle = createMemoryBackend();
    rows = backendBundle.rows;
    meta = backendBundle.meta;
    store = createDailyLogStore(backendBundle.backend);
  });

  it('starts empty and marks migration done when no legacy blob exists', async () => {
    expect(await store.loadAllLogs()).toEqual({});
    expect(meta.get('migrated_v1')).toBe('1');
  });

  it('migrates the legacy blob once, keeps a backup, and removes originals', async () => {
    seedBlob(STORAGE_KEYS.DAILY_LOGS, {
      '2026-07-01': [makeEntry('a', { measureMode: 'units' })],
    });

    const logs = await store.loadAllLogs();
    expect(logs['2026-07-01']).toHaveLength(1);
    expect(logs['2026-07-01'][0].measureMode).toBe('qty'); // normalized during migration

    expect(memoryStore.has(BACKUP_KEY)).toBe(true);
    expect(memoryStore.has(STORAGE_KEYS.DAILY_LOGS)).toBe(false);

    // A blob appearing later must NOT be re-migrated
    seedBlob(STORAGE_KEYS.DAILY_LOGS, { '2026-07-02': [makeEntry('z')] });
    const again = await store.loadAllLogs();
    expect(again['2026-07-02']).toBeUndefined();
  });

  it('inserts, updates, deletes, and clears entries', async () => {
    await store.loadAllLogs();
    await store.insertEntries('2026-07-01', [makeEntry('a'), makeEntry('b')]);
    await store.insertEntries('2026-07-02', [makeEntry('c')]);

    let logs = await store.loadAllLogs();
    expect(logs['2026-07-01'].map((e) => e.id)).toEqual(['a', 'b']);
    expect(logs['2026-07-02'].map((e) => e.id)).toEqual(['c']);

    await store.updateEntry('2026-07-01', makeEntry('a', { calories: 500 }));
    logs = await store.loadAllLogs();
    expect(logs['2026-07-01'][0].calories).toBe(500);

    await store.deleteEntry('b');
    logs = await store.loadAllLogs();
    expect(logs['2026-07-01'].map((e) => e.id)).toEqual(['a']);

    await store.deleteDay('2026-07-01');
    logs = await store.loadAllLogs();
    expect(logs['2026-07-01']).toBeUndefined();

    await store.clearAll();
    expect(await store.loadAllLogs()).toEqual({});
  });

  it('is idempotent when the same entry id is inserted twice', async () => {
    const entry = makeEntry('a');
    await Promise.all([
      store.insertEntries('2026-07-01', [entry]),
      store.insertEntries('2026-07-01', [entry]),
    ]);
    const logs = await store.loadAllLogs();
    expect(logs['2026-07-01']).toHaveLength(1);
  });

  it('preserves insertion order across rapid successive writes', async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`e${i}`, { timestamp: `2026-07-01T12:0${i}:00.000Z` })
    );
    await Promise.all(entries.map((e) => store.insertEntries('2026-07-01', [e])));
    const logs = await store.loadAllLogs();
    expect(logs['2026-07-01'].map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
    expect(rows.size).toBe(5);
  });

  it('tolerates a corrupt legacy blob without throwing', async () => {
    memoryStore.set(STORAGE_KEYS.DAILY_LOGS, '{not json');
    expect(await store.loadAllLogs()).toEqual({});
  });
});

describe('dailyLogRepo (blob fallback mode)', () => {
  let store: DailyLogStore;

  beforeEach(() => {
    memoryStore.clear();
    store = createDailyLogStore(createMemoryBackend({ failInit: true }).backend);
  });

  it('falls back to the AsyncStorage blob when SQLite init fails', async () => {
    seedBlob(STORAGE_KEYS.DAILY_LOGS, { '2026-07-01': [makeEntry('a')] });
    const logs = await store.loadAllLogs();
    expect(logs['2026-07-01']).toHaveLength(1);
  });

  it('persists mutations to the blob in fallback mode', async () => {
    await store.insertEntries('2026-07-01', [makeEntry('a')]);
    await store.insertEntries('2026-07-01', [makeEntry('b')]);
    await store.deleteEntry('a');

    const logs = await store.loadAllLogs();
    expect(logs['2026-07-01'].map((e) => e.id)).toEqual(['b']);
  });
});
