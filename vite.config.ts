import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'bin',
    rollupOptions: {
      external: [
        // External all dependencies (not bundled)
        '@jcubic/lily',
        'puppeteer',
        'puppeteer-screen-recorder',
        'fluent-ffmpeg',
        'handlebars',
        '@xmldom/xmldom',
        'fs',
        'fs/promises',
        'path',
        'os',
        'url',
        'util',
        'child_process',
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    target: 'node22',
    minify: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
