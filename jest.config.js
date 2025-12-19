export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@db/(.*)$': '<rootDir>/db/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/chitty.*/',
    '<rootDir>/e2e/'
  ],
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    'server/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  roots: ['<rootDir>/__tests__', '<rootDir>/client', '<rootDir>/server']
};