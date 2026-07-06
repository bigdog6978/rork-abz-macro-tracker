/**
 * Typography ramp — the single source of type styles (docs/DESIGN-SYSTEM.md).
 *
 * Numbers are this app's UI: numeric tokens (display/stat/statSm/numeric) use
 * Rajdhani — a squared, instrument-panel face matching the watch dial
 * language — with tabular figures so digits never jitter. Text tokens stay on
 * the system font (SF) for body legibility.
 *
 * Usage inside existing createStyles: spread the token, then override only
 * what the layout truly needs (color, alignment):
 *
 *   dialNumber: { ...Type.stat, color: colors.text },
 *   sectionTitle: { ...Type.heading, color: colors.text },
 *
 * Dynamic Type policy: never cap maxFontSizeMultiplier below 1.3 — protect
 * layouts with adjustsFontSizeToFit/minimumFontScale instead.
 */

import type { TextStyle } from 'react-native';

/** Embedded via app.config.ts expo-font plugin (assets/fonts/). Family names
 * match the files' PostScript names so iOS and Android resolve identically. */
export const Fonts = {
  numericMedium: 'Rajdhani-Medium',
  numericSemiBold: 'Rajdhani-SemiBold',
  numericBold: 'Rajdhani-Bold',
} as const;

const tabular: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const Type = {
  /** Hero numerals: share cards, oversized stats. */
  display: {
    fontFamily: Fonts.numericBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: 0.5,
    ...tabular,
  } as TextStyle,

  /** Primary stat numerals: dial centers, Target/Consumed values. */
  stat: {
    fontFamily: Fonts.numericBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0.5,
    ...tabular,
  } as TextStyle,

  /** Secondary stat numerals: calorie previews, totals, ring percentages. */
  statSm: {
    fontFamily: Fonts.numericSemiBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.4,
    ...tabular,
  } as TextStyle,

  /** Inline numbers at body sizes (hydration row, macro counts). */
  numeric: {
    fontFamily: Fonts.numericSemiBold,
    letterSpacing: 0.3,
    ...tabular,
  } as TextStyle,

  /** Screen and sheet titles. */
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  } as TextStyle,

  /** Section headings, card titles. */
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  } as TextStyle,

  /** Primary content: rows, choices, inputs. */
  body: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  } as TextStyle,

  /** Secondary rows, macro summary lines. */
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  } as TextStyle,

  /** Input labels and uppercase section markers (pair with textTransform). */
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  } as TextStyle,

  /** Badges, hints, timestamps. */
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  } as TextStyle,
} as const;

export type TypeToken = keyof typeof Type;
