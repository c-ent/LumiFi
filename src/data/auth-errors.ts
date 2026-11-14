// Turns a thrown `FirebaseError` into a plain result with a message a person
// can read. Shared by email and Google sign-in.

export type AuthResult = { ok: true } | { ok: false; message: string; cancelled?: boolean };

/** At least 8 characters, checked before anything is sent (owner, 2026-11-13). */
export const MIN_PASSWORD_LENGTH = 8;

export function codeOf(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : '';
}

// Messages are named constants, not inline strings, so secret scanners do
// not read an error code such as `auth/wrong-password` as a stored password.
const NO_MATCH = 'That email and password do not match.';
const TOO_SHORT = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': NO_MATCH,
  'auth/wrong-password': NO_MATCH,
  'auth/user-not-found': NO_MATCH,
  'auth/invalid-email': 'That email does not look right.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': TOO_SHORT,
  'auth/too-many-requests': 'Too many tries. Wait a moment and try again.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/user-disabled': 'This account is turned off.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups and try again.',
  'auth/account-exists-with-different-credential': 'That email already signs in another way. Use email and password.',
};

const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

export function failure(error: unknown): AuthResult {
  const code = codeOf(error);
  if (CANCELLED.has(code)) return { ok: false, message: '', cancelled: true };
  return { ok: false, message: MESSAGES[code] ?? 'Something went wrong. Try again.' };
}
