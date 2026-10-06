/** Integration tests: real Nest app + real PostgreSQL (a disposable `*_test` database, never the dev one). */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: require('path').join(__dirname, '..', '..', 'tsconfig.json'), diagnostics: false }] },
  testEnvironment: 'node',
  globalSetup: './global-setup.ts',
  setupFiles: ['./env.ts'],
  maxWorkers: 1, // specs share one database
  testTimeout: 60000,
};
