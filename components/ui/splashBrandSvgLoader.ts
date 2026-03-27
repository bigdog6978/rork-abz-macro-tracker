import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Bundled asset — Metro serves splash_brand.svg from assets/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const splashBrandAsset = require('../../assets/splash_brand.svg');

let cachedRawXml: string | null = null;

/**
 * Loads XML from assets/splash_brand.svg (bundled). Cached after first read.
 */
export async function loadSplashBrandSvgXml(): Promise<string> {
  if (cachedRawXml) return cachedRawXml;

  const asset = Asset.fromModule(splashBrandAsset);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('[SplashBrand] No URI for splash_brand.svg');
  }

  let raw: string;
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    raw = await res.text();
  } else {
    raw = await readAsStringAsync(uri);
  }

  cachedRawXml = raw;
  return raw;
}

/**
 * Applies theme primary color: inlined cls-1 (stroke/fill), root fill, no external CSS.
 */
export function applySplashBrandTint(xml: string, color: string): string {
  let out = xml.trim();
  // Drop <style> — SvgXml/CSS support is inconsistent; inline PHYSIQ stroke/fill instead
  out = out.replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>\s*/i, '');
  out = out.replace(
    /<path class="cls-1"/g,
    `<path fill="${color}" stroke="${color}" stroke-width="4" stroke-miterlimit="10"`
  );
  if (!/<svg[^>]*\bfill=/.test(out)) {
    out = out.replace(/<svg\s/, `<svg fill="${color}" `);
  }
  return out;
}
