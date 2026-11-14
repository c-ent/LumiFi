import { z } from 'zod';

// Lenient reading with Zod, for data the app did not just write: the device
// save (an older version, or hand-edited) and records read from the account.
// Nothing here throws. A value that does not fit falls back, and a list or map
// keeps only the entries that fit, so one bad entry never loses the rest.

/** A number that is not below zero (Zod numbers are finite: no NaN or Infinity). */
export const count = z.number().min(0);

/** A `calendarKey` day (`2026-11-3`, no zero padding). */
export const DAY_KEY = /^\d{4}-\d{1,2}-\d{1,2}$/;
export const dayKey = z.string().regex(DAY_KEY);

/** The value if it fits `schema`, else `fallback`. */
export function readAs<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/** The items of a list that fit `schema`, in order. Not a list: none. */
export function validItems<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const result = schema.safeParse(item);
    if (result.success) out.push(result.data);
  }
  return out;
}

/** The entries of a plain object whose values fit `schema`. Not an object: none. */
export function validEntries<T>(schema: z.ZodType<T>, value: unknown): [string, T][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const out: [string, T][] = [];
  for (const [key, item] of Object.entries(value)) {
    const result = schema.safeParse(item);
    if (result.success) out.push([key, result.data]);
  }
  return out;
}
