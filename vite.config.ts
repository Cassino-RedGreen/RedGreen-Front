import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@domain': path.resolve(import.meta.dirname, './src/domain'),
      '@application': path.resolve(import.meta.dirname, './src/application'),
      '@infrastructure': path.resolve(
        import.meta.dirname,
        './src/infrastructure'
      ),
      '@presentation': path.resolve(import.meta.dirname, './src/presentation'),
      '@ui': path.resolve(import.meta.dirname, './src/presentation/ui'),
      '@games': path.resolve(import.meta.dirname, './src/presentation/games'),
      '@assets': path.resolve(import.meta.dirname, './public/assets'),
    },
  },
});
