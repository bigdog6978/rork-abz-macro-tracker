import {
  defaultHydrationUnit,
  formatHydrationProgress,
  hydrationQuickAdds,
  mlToUnit,
  unitToMl,
} from '../utils/hydration';

describe('hydration units', () => {
  it('defaults to cups for US and mL for metric', () => {
    expect(defaultHydrationUnit('us')).toBe('cup');
    expect(defaultHydrationUnit('metric')).toBe('ml');
  });

  it('round-trips mL <-> oz/cup', () => {
    expect(Math.round(unitToMl(8, 'oz'))).toBe(237);
    expect(Math.round(unitToMl(1, 'cup'))).toBe(237);
    expect(Math.round(mlToUnit(unitToMl(16, 'oz'), 'oz'))).toBe(16);
  });

  it('formats progress in the chosen unit', () => {
    expect(formatHydrationProgress(0, 2000, 'ml')).toBe('0 / 2000 mL');
    expect(formatHydrationProgress(237, 1183, 'cup')).toBe('1 / 5 cups');
  });

  it('provides quick-add presets per unit', () => {
    expect(hydrationQuickAdds('ml').map((q) => q.ml)).toEqual([250, 500, 750]);
    expect(hydrationQuickAdds('cup').length).toBe(3);
    expect(hydrationQuickAdds('oz')[0].label).toBe('+8 oz');
  });
});
