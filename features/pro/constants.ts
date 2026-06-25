import type { ProDayTypeOverride } from './types';

export const DAY_TYPE_OVERRIDE_LABELS: Record<ProDayTypeOverride, string> = {
  auto: 'Auto',
  training: 'Training',
  competition: 'Competition',
  rest: 'Rest',
};

/** Short labels for watch-style 2×2 tile picker. */
export const DAY_TYPE_PICKER_SHORT_LABELS: Record<ProDayTypeOverride, string> = {
  auto: 'Auto',
  training: 'Train',
  competition: 'Comp',
  rest: 'Rest',
};

/**
 * Watch SF Symbol ↔ phone Lucide mapping for DayTypeTileGrid:
 * auto → sparkles/Sparkles, training → figure.run/PersonStanding,
 * competition → trophy.fill/Trophy, rest → moon.zzz.fill/Moon
 */
export const DAY_TYPE_PICKER_TILE_ORDER: ProDayTypeOverride[] = [
  'auto',
  'training',
  'competition',
  'rest',
];

/** @deprecated Use DAY_TYPE_PICKER_TILE_ORDER */
export const DAY_TYPE_OVERRIDE_OPTIONS = DAY_TYPE_PICKER_TILE_ORDER;
