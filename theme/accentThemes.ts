import Colors from '../constants/colors';

export type AccentThemeId =
  | 'orange'
  | 'red'
  | 'chartreuse'
  | 'blue'
  | 'violet'
  | 'pink';

export const ACCENT_THEMES: Record<AccentThemeId, { label: string; primary: string }> = {
  orange: { label: 'Orange', primary: '#FF5F1F' },
  red: { label: 'Red', primary: '#EF4444' },
  chartreuse: { label: 'Chartreuse', primary: '#DEFF00' },
  blue: { label: 'Neon Blue', primary: '#38BDF8' },
  violet: { label: 'Neon Violet', primary: '#8B5CF6' },
  pink: { label: 'Neon Pink', primary: '#FF4FD8' },
};

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return Colors.primaryMuted;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getAccessibleOnColor(backgroundHex: string): string {
  const whiteContrast = contrastRatio(backgroundHex, '#FFFFFF');
  const blackContrast = contrastRatio(backgroundHex, '#000000');

  if (whiteContrast >= 4.5 && whiteContrast >= blackContrast) {
    return '#FFFFFF';
  }

  if (blackContrast >= 4.5) {
    return '#000000';
  }

  return whiteContrast >= blackContrast ? '#FFFFFF' : '#000000';
}
