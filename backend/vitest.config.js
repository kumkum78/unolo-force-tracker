import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'server.js', // Entry point
        'scripts/**', // Utility scripts
        'config/database-sqlite.js', // Thin wrapper
        '.eslintrc.cjs'
      ],
      all: true
    }
  }
});
