import { breakWax, colors, fade, fonts, moods, radius, streamMark } from './tokens';

describe('theme tokens', () => {
  it('uses the Amber mood as the default page, flame and accent colors', () => {
    expect(moods.amber).toEqual({
      bgBase: colors.bgBase,
      bgMid: colors.bgMid,
      bgGlow: colors.bgGlow,
      flame1: colors.flame1,
      flame2: colors.flame2,
      flame3: colors.flame3,
      accent: colors.accent,
    });
  });

  it('keeps the shared chrome colors from the UI spec', () => {
    expect(colors.bgSurface).toBe('rgba(24, 14, 20, 0.93)');
    expect(colors.bgCard).toBe('rgba(255, 255, 255, 0.06)');
    expect(colors.bgControl).toBe('rgba(255, 255, 255, 0.2)');
    expect(colors.bgInset).toBe('rgba(0, 0, 0, 0.28)');
    expect(colors.textPrimary).toBe('#F8F1E8');
    expect(colors.textMuted).toBe('rgba(248, 241, 232, 0.62)');
    expect(colors.textInverse).toBe('#1D1205');
    expect(colors.border).toBe('rgba(255, 255, 255, 0.13)');
    expect(colors.success).toBe('#62D0C0');
    expect(colors.error).toBe('#FF8F8F');
  });

  it('keeps Moonlit and Spirit as background, flame and accent swaps', () => {
    expect(moods.moon).toEqual({
      bgBase: '#070A1A',
      bgMid: '#121A40',
      bgGlow: '#1F2C5E',
      flame1: '#F1F6FF',
      flame2: '#A6C6FF',
      flame3: '#6F9CFF',
      accent: '#A6C6FF',
    });
    expect(moods.spirit).toEqual({
      bgBase: '#06130E',
      bgMid: '#0E2A1F',
      bgGlow: '#173D2D',
      flame1: '#EAFFF3',
      flame2: '#8DFFC4',
      flame3: '#3DDC97',
      accent: '#7BE8B0',
    });
  });

  it('keeps the radii and the loaded font families', () => {
    expect(radius).toEqual({ sm: 12, md: 16, lg: 18, sheet: 28, pill: 999 });
    expect(fonts).toEqual({
      body: 'Figtree_400Regular',
      bodyMedium: 'Figtree_500Medium',
      bodySemibold: 'Figtree_600SemiBold',
      time: 'Outfit_200ExtraLight',
      timeLight: 'Outfit_300Light',
      timeRegular: 'Outfit_400Regular',
      timeMedium: 'Outfit_500Medium',
    });
  });

  it('washes a hex accent and keeps a mark for each streaming service', () => {
    expect(fade('#FFB454', 0.14)).toBe('rgba(255, 180, 84, 0.14)');
    expect(fade('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(streamMark.spotify).toBe('#7BE8B0');
    expect(streamMark.youtube).toBe(streamMark['youtube-music']);
    expect(streamMark['apple-music']).toBe('#F5A3C7');
  });

  it('uses one cooler wax for break candles', () => {
    expect(breakWax).toEqual({ body: '#D8EEE9', shadow: '#A8C9C2', melt: '#BFE3DA' });
  });
});
