import {
  defaultHydrationUnit,
  EIGHT_OZ_ML,
  formatHydrationProgress,
  hydrationActionGrid,
  hydrationQuickActions,
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
    expect(EIGHT_OZ_ML).toBe(237);
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

  it('provides remove preset matching smallest add increment', () => {
    expect(hydrationQuickActions('oz').remove).toEqual({ label: '−8 oz', ml: 237 });
    expect(hydrationQuickActions('cup').remove).toEqual({ label: '−1 cup', ml: 237 });
    expect(hydrationQuickActions('ml').remove).toEqual({ label: '−250 mL', ml: 250 });
  });

  it('watch footer matches smallest remove + add preset per unit', () => {
    const watchFooter = (unit: 'oz' | 'cup' | 'ml') => {
      const { remove, adds } = hydrationQuickActions(unit);
      return [
        { label: remove.label, ml: -remove.ml },
        { label: adds[0].label, ml: adds[0].ml },
      ];
    };

    expect(watchFooter('oz')).toEqual([
      { label: '−8 oz', ml: -237 },
      { label: '+8 oz', ml: 237 },
    ]);
    expect(watchFooter('cup')).toEqual([
      { label: '−1 cup', ml: -237 },
      { label: '+1 cup', ml: 237 },
    ]);
    expect(watchFooter('ml')).toEqual([
      { label: '−250 mL', ml: -250 },
      { label: '+250 mL', ml: 250 },
    ]);
  });

  it('orders 2x2 grid TL remove, TR small add, BL medium, BR large', () => {
    const grid = hydrationActionGrid('oz');
    expect(grid.map((a) => a.label)).toEqual(['−8 oz', '+8 oz', '+16 oz', '+24 oz']);
    expect(grid.map((a) => a.direction)).toEqual(['remove', 'add', 'add', 'add']);
    expect(grid.map((a) => a.ml)).toEqual([237, 237, 473, 710]);

    const cups = hydrationActionGrid('cup');
    expect(cups.map((a) => a.label)).toEqual(['−1 cup', '+1 cup', '+2 cups', '+3 cups']);

    const ml = hydrationActionGrid('ml');
    expect(ml.map((a) => a.label)).toEqual(['−250 mL', '+250 mL', '+500 mL', '+750 mL']);
  });
});
