// Firestore rules tests. They run in Node against the emulator, not under the
// jest-expo preset, so `npm test` leaves them out. Run with `npm run test:rules`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firestore-tests/**/*.test.js'],
  transform: {},
  testTimeout: 20000,
};
