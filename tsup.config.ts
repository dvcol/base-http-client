import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib', '!lib/**/*.test.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
});
