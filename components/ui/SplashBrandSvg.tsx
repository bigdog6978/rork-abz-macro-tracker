import React, { useEffect, useMemo, useState } from 'react';
import { SvgXml } from 'react-native-svg';
import { applySplashBrandTint, loadSplashBrandSvgXml } from './splashBrandSvgLoader';

export type SplashBrandSvgProps = {
  width: number;
  height: number;
  color: string;
};

/**
 * Renders assets/splash_brand.svg at runtime (bundled via Expo Asset) with theme color.
 */
export default function SplashBrandSvg({ width, height, color }: SplashBrandSvgProps) {
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSplashBrandSvgXml()
      .then((raw) => {
        if (!cancelled) setXml(raw);
      })
      .catch((err) => {
        console.warn('[SplashBrandSvg] Failed to load assets/splash_brand.svg:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tinted = useMemo(() => (xml ? applySplashBrandTint(xml, color) : null), [xml, color]);

  if (!tinted) {
    return null;
  }

  return (
    <SvgXml xml={tinted} width={width} height={height} accessibilityLabel="Physiq Macro Tracker" />
  );
}
