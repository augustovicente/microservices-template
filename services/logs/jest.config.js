module.exports = {
    coveragePathIgnorePatterns: ['<rootDir>/node_modules/'],
    preset: 'ts-jest',
    rootDir: '.',
    setupFiles: ['<rootDir>/setEnvVars.js'],
    testPathIgnorePatterns: ['<rootDir>/.yarncache/', '<rootDir>/node_modules/'],
};
