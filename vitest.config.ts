import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist', 'legacy'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
        },
        typecheck: {
            tsconfig: './tsconfig.json',
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@core': resolve(__dirname, 'src/core'),
            '@math': resolve(__dirname, 'src/math'),
            '@wasm': resolve(__dirname, 'src/wasm'),
        },
    },
});
