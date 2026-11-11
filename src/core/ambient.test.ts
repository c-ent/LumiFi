import { AMBIENT_KEYS, AMBIENT_SOUNDS, ambientOn, firstAudible, silentAmbient } from './ambient';

describe('ambient catalogue', () => {
  it('lists each sound once, with a label', () => {
    expect(new Set(AMBIENT_KEYS).size).toBe(AMBIENT_SOUNDS.length);
    for (const sound of AMBIENT_SOUNDS) expect(sound.label.length).toBeGreaterThan(0);
  });

  it('builds a silent mix with every sound and nothing else', () => {
    const mix = silentAmbient();
    expect(Object.keys(mix).sort()).toEqual([...AMBIENT_KEYS].sort());
    expect(Object.values(mix).every((level) => level === 0)).toBe(true);
    expect(ambientOn(mix)).toBe(false);
    expect(firstAudible(mix)).toBeNull();
  });

  it('finds the first sound turned up, in mixer order', () => {
    const mix = { ...silentAmbient(), waves: 10, cafe: 40 };
    expect(ambientOn(mix)).toBe(true);
    expect(firstAudible(mix)).toBe('cafe');
  });
});
