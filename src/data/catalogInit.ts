/**
 * Ensures the unified food catalog is ready before search.
 *
 * Runs all pending catalog imports (currently UK CoFID).
 * Safe to call multiple times — each import is idempotent and version-gated.
 */

import { importCofidIfNeeded } from './importCofid';

let ready = false;
let initPromise: Promise<void> | null = null;

export async function ensureFoodCatalogReady(): Promise<void> {
  if (ready) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await importCofidIfNeeded();
      } catch (err) {
        console.warn('[catalogInit] Non-fatal import error:', err);
      }
      ready = true;
    })();
  }

  return initPromise;
}
