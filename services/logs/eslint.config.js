module.exports = {
    ignores: [
        'node_modules/**',
        'dist/**',
    ],
    rules: {
        camelcase: 'error',
        'sort-keys': ['error', 'asc', { natural: true }],
    },
};