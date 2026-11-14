import { z } from 'zod';
import { count, dayKey, readAs, validEntries, validItems } from './lenient';

describe('lenient reading', () => {
  it('falls back when a value does not fit, and never throws', () => {
    expect(readAs(count, 3, 0)).toBe(3);
    expect(readAs(count, -1, 0)).toBe(0);
    expect(readAs(count, Number.NaN, 0)).toBe(0);
    expect(readAs(count, Infinity, 0)).toBe(0);
    expect(readAs(dayKey, '2026-11-3', null)).toBe('2026-11-3');
    expect(readAs(dayKey, '2026-11-03x', null)).toBeNull();
  });

  it('keeps only the list items that fit, in order', () => {
    expect(validItems(z.string(), ['a', 4, 'b', null])).toEqual(['a', 'b']);
    expect(validItems(z.string(), 'not a list')).toEqual([]);
  });

  it('keeps only the object entries that fit, and ignores lists', () => {
    expect(validEntries(z.number(), { a: 1, b: 'x', c: 2 })).toEqual([['a', 1], ['c', 2]]);
    expect(validEntries(z.number(), [1, 2])).toEqual([]);
    expect(validEntries(z.number(), null)).toEqual([]);
  });

  it('lets a field with catch fill in a missing key', () => {
    const schema = z.object({ n: z.number(), label: z.string().catch('none') });
    expect(readAs(schema, { n: 1 }, null)).toEqual({ n: 1, label: 'none' });
    expect(readAs(schema, { label: 'x' }, null)).toBeNull();
  });
});
