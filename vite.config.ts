/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  publicDir: 'public',
  server: {
    host: "::",
    port: 8080,
  },
  base: '/notesage',
  test: {
    globals: true, // Use Vitest global APIs like describe, it, expect
    environment: 'jsdom', // Simulate DOM environment for testing React components
    setupFiles: './src/setupTests.ts', // Run this file before tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Look for tests in src/test and any __tests__ directory under src/
    include: [
      'src/test/**/*.{test,spec}.{js,jsx,ts,tsx}', 
      'src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    typecheck: {
      tsconfig: './tsconfig.json', // Enable type checking during tests
    },
  },
  plugins: [
    react(),
    // Only use componentTagger in development mode
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist/legacy/build/pdf']
        }
      }
    }
  }
}));
