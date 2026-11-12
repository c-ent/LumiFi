// Suites that need a DOM. The default `jest-expo` preset has none, so these
// skip themselves there and run here under the web preset. `npm test` runs both.
module.exports = {
  preset: 'jest-expo/web',
  testMatch: ['<rootDir>/components/wickglow/features/background/crossfade.test.tsx'],
};
