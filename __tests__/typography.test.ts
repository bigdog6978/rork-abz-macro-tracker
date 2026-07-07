import { Fonts, Type } from '../theme/typography';

describe('typography ramp', () => {
  const textTokens = ['title', 'heading', 'body', 'bodySm', 'label', 'caption'] as const;
  const numericSizedTokens = ['display', 'stat', 'statSm'] as const;

  it('every sized token declares fontSize and lineHeight with sane leading', () => {
    for (const name of [...textTokens, ...numericSizedTokens]) {
      const token = Type[name];
      expect(token.fontSize).toBeGreaterThan(0);
      expect(token.lineHeight).toBeGreaterThanOrEqual(token.fontSize!);
      expect(token.lineHeight).toBeLessThanOrEqual(token.fontSize! * 1.6);
    }
  });

  it('numeric tokens use Rajdhani with tabular figures', () => {
    for (const name of numericSizedTokens) {
      const token = Type[name];
      expect(String(token.fontFamily)).toContain('Rajdhani');
      expect(token.fontVariant).toContain('tabular-nums');
    }
    expect(String(Type.numeric.fontFamily)).toContain('Rajdhani');
    expect(Type.numeric.fontVariant).toContain('tabular-nums');
  });

  it('text tokens stay on the system font', () => {
    for (const name of textTokens) {
      expect(Type[name].fontFamily).toBeUndefined();
    }
  });

  it('ramp sizes are strictly ordered where hierarchy matters', () => {
    expect(Type.display.fontSize!).toBeGreaterThan(Type.stat.fontSize!);
    expect(Type.stat.fontSize!).toBeGreaterThan(Type.statSm.fontSize!);
    expect(Type.title.fontSize!).toBeGreaterThan(Type.heading.fontSize!);
    expect(Type.heading.fontSize!).toBeGreaterThan(Type.body.fontSize!);
    expect(Type.body.fontSize!).toBeGreaterThan(Type.bodySm.fontSize!);
    expect(Type.bodySm.fontSize!).toBeGreaterThan(Type.label.fontSize!);
    expect(Type.label.fontSize!).toBeGreaterThan(Type.caption.fontSize!);
  });

  it('font family names match the embedded asset PostScript names', () => {
    expect(Fonts).toEqual({
      numericMedium: 'Rajdhani-Medium',
      numericSemiBold: 'Rajdhani-SemiBold',
      numericBold: 'Rajdhani-Bold',
    });
  });
});
