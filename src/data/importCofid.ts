/**
 * UK CoFID (Composition of Foods Integrated Dataset) importer.
 *
 * Reads the compact JSON and batch-inserts records into the unified food catalog.
 * The import is idempotent: a version key in catalog_meta prevents repeated work.
 */

import {
  getCatalogMeta,
  setCatalogMeta,
  importCatalogFoods,
  type CatalogImportRecord,
} from './foodsRepo';

const COFID_VERSION_KEY = 'cofid_uk_version';
const COFID_IMPORT_VERSION = '2021-compact-v1';

interface CofidRawRecord {
  id: string;
  source: string;
  foodCode: string;
  name: string;
  searchName: string;
  description: string;
  groupCode: string;
  servingBasis: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  vitaminCMg: number | null;
}

function toCatalogRecord(r: CofidRawRecord): CatalogImportRecord {
  return {
    id: r.id,
    name: r.name,
    searchName: r.searchName,
    brand: null,
    source: 'cofid_uk',
    calories: r.calories ?? 0,
    protein: r.protein ?? 0,
    carbs: r.carbs ?? 0,
    fat: r.fat ?? 0,
  };
}

export async function importCofidIfNeeded(): Promise<{
  imported: boolean;
  count: number;
}> {
  const currentVersion = await getCatalogMeta(COFID_VERSION_KEY);
  if (currentVersion === COFID_IMPORT_VERSION) {
    return { imported: false, count: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw: CofidRawRecord[] = require('./imports/uk_cofid/cofid_uk_2021_compact.json');
  const records = raw.map(toCatalogRecord);
  const count = await importCatalogFoods(records);
  await setCatalogMeta(COFID_VERSION_KEY, COFID_IMPORT_VERSION);

  console.log(`[importCofid] Imported ${count} UK CoFID foods`);
  return { imported: true, count };
}
