import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/tests/**/*.test.{js,jsx}'],
    exclude: ['**/e2e/**', '**/*.spec.js', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'e2e/',
        '*.config.js',
        'src/main.jsx', // Entry point
        'src/App.jsx', // Routing config
        '.eslintrc.cjs',
        'src/components/ActivityList.jsx', // Not used in core flow
        'src/components/Counter.jsx', // Not used in core flow
        'src/components/StatsCard.jsx', // Not used in core flow
        'src/components/Layout.jsx', // Already tested via pages
        'src/utils/api.js' // Axios wrapper, tested via integration
      ],
      all: true
    }
  }
});
