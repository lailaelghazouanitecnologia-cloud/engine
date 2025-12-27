/**
 * Final Comparison: Pool vs Pool+Cache vs Direct
 *
 * Run: npx tsx benchmarks/pool-comparison.ts
 */

import { OperationPool } from '../src/wasm/OperationPool';

console.warn = () => {};

function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 2 - 1);
}

function mat4Multiply(out: Float32Array, a: Float32Array, b: Float32Array): void {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a00*b0 + a10*b1 + a20*b2 + a30*b3;
    out[1] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
    out[2] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
    out[3] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = a00*b0 + a10*b1 + a20*b2 + a30*b3;
    out[5] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
    out[6] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
    out[7] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = a00*b0 + a10*b1 + a20*b2 + a30*b3;
    out[9] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
    out[10] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
    out[11] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = a00*b0 + a10*b1 + a20*b2 + a30*b3;
    out[13] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
    out[14] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
    out[15] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
}

const pool = OperationPool.instance;
let dce = 0;

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║            COMPARACIÓN: Direct vs Pool vs Pool+Cache              ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

interface Result {
    scenario: string;
    direct: number;
    pool: number;
    poolCache: number;
    winner: string;
}

const results: Result[] = [];

// ========== Scenario 1: Unique ops (no duplicates) ==========
{
    const N = 2000;
    const mats = Array.from({ length: N }, () => [randomMatrix(), randomMatrix()] as const);
    const out = new Float32Array(16);

    // Warmup
    for (let i = 0; i < 500; i++) {
        mat4Multiply(out, mats[i % N][0], mats[i % N][1]);
        dce += out[0];
    }

    // Direct
    const t1 = performance.now();
    for (const [a, b] of mats) {
        mat4Multiply(out, a, b);
        dce += out[0];
    }
    const direct = performance.now() - t1;

    // Pool (dedup on, cache off)
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();
    const t2 = performance.now();
    for (const [a, b] of mats) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - t2;

    // Pool+Cache
    pool.setDeduplication(true);
    pool.setCaching(true);
    pool.clearCache();
    pool.resetStats();
    pool.newFrame();
    const t3 = performance.now();
    for (const [a, b] of mats) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolCache = performance.now() - t3;

    const times = { Direct: direct, Pool: poolTime, 'Pool+Cache': poolCache };
    const winner = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    results.push({ scenario: '100% único', direct, pool: poolTime, poolCache, winner });
}

// ========== Scenario 2: 3 systems share same data ==========
{
    const N = 1000;
    const mats = Array.from({ length: N }, () => [randomMatrix(), randomMatrix()] as const);
    const out = new Float32Array(16);

    // Direct: 3 systems compute separately
    const t1 = performance.now();
    for (let sys = 0; sys < 3; sys++) {
        for (const [a, b] of mats) {
            mat4Multiply(out, a, b);
            dce += out[0];
        }
    }
    const direct = performance.now() - t1;

    // Pool: dedup across systems
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();
    const t2 = performance.now();
    for (let sys = 0; sys < 3; sys++) {
        for (const [a, b] of mats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
    }
    pool.flush();
    const poolTime = performance.now() - t2;

    // Pool+Cache
    pool.setDeduplication(true);
    pool.setCaching(true);
    pool.clearCache();
    pool.resetStats();
    pool.newFrame();
    const t3 = performance.now();
    for (let sys = 0; sys < 3; sys++) {
        for (const [a, b] of mats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
    }
    pool.flush();
    const poolCache = performance.now() - t3;

    const times = { Direct: direct, Pool: poolTime, 'Pool+Cache': poolCache };
    const winner = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    results.push({ scenario: '3 sistemas (×3 ops)', direct, pool: poolTime, poolCache, winner });
}

// ========== Scenario 3: Static scene over 10 frames ==========
{
    const N = 500;
    const FRAMES = 10;
    const mats = Array.from({ length: N }, () => [randomMatrix(), randomMatrix()] as const);
    const out = new Float32Array(16);

    // Direct: recompute every frame
    const t1 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        for (const [a, b] of mats) {
            mat4Multiply(out, a, b);
            dce += out[0];
        }
    }
    const direct = performance.now() - t1;

    // Pool (no cache)
    pool.setDeduplication(true);
    pool.setCaching(false);
    const t2 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        pool.resetStats();
        pool.newFrame();
        for (const [a, b] of mats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        pool.flush();
    }
    const poolTime = performance.now() - t2;

    // Pool+Cache
    pool.setDeduplication(true);
    pool.setCaching(true);
    pool.clearCache();
    const t3 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        pool.resetStats();
        pool.newFrame();
        for (const [a, b] of mats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        pool.flush();
    }
    const poolCache = performance.now() - t3;

    const times = { Direct: direct, Pool: poolTime, 'Pool+Cache': poolCache };
    const winner = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    results.push({ scenario: '10 frames estáticos', direct, pool: poolTime, poolCache, winner });
}

// ========== Scenario 4: Mixed - 50% static, 50% dynamic ==========
{
    const STATIC = 500;
    const DYNAMIC = 500;
    const FRAMES = 5;

    const staticMats = Array.from({ length: STATIC }, () => [randomMatrix(), randomMatrix()] as const);
    const out = new Float32Array(16);

    // Direct
    const t1 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        const dynamicMats = Array.from({ length: DYNAMIC }, () => [randomMatrix(), randomMatrix()] as const);
        for (const [a, b] of staticMats) {
            mat4Multiply(out, a, b);
            dce += out[0];
        }
        for (const [a, b] of dynamicMats) {
            mat4Multiply(out, a, b);
            dce += out[0];
        }
    }
    const direct = performance.now() - t1;

    // Pool
    pool.setDeduplication(true);
    pool.setCaching(false);
    const t2 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        const dynamicMats = Array.from({ length: DYNAMIC }, () => [randomMatrix(), randomMatrix()] as const);
        pool.resetStats();
        pool.newFrame();
        for (const [a, b] of staticMats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        for (const [a, b] of dynamicMats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        pool.flush();
    }
    const poolTime = performance.now() - t2;

    // Pool+Cache
    pool.setDeduplication(true);
    pool.setCaching(true);
    pool.clearCache();
    const t3 = performance.now();
    for (let f = 0; f < FRAMES; f++) {
        const dynamicMats = Array.from({ length: DYNAMIC }, () => [randomMatrix(), randomMatrix()] as const);
        pool.resetStats();
        pool.newFrame();
        for (const [a, b] of staticMats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        for (const [a, b] of dynamicMats) {
            pool.queueMatrixMultiply(a, b, () => {});
        }
        pool.flush();
    }
    const poolCache = performance.now() - t3;

    const times = { Direct: direct, Pool: poolTime, 'Pool+Cache': poolCache };
    const winner = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    results.push({ scenario: '50% estático 50% dinámico', direct, pool: poolTime, poolCache, winner });
}

// ========== Print Results ==========
console.log('┌───────────────────────────┬──────────┬──────────┬────────────┬─────────────┐');
console.log('│ Escenario                 │  Direct  │   Pool   │ Pool+Cache │   Ganador   │');
console.log('├───────────────────────────┼──────────┼──────────┼────────────┼─────────────┤');

for (const r of results) {
    const scen = r.scenario.padEnd(25);
    const d = (r.direct.toFixed(2) + 'ms').padStart(8);
    const p = (r.pool.toFixed(2) + 'ms').padStart(8);
    const pc = (r.poolCache.toFixed(2) + 'ms').padStart(10);
    const w = r.winner.padStart(11);
    console.log(`│ ${scen} │ ${d} │ ${p} │ ${pc} │ ${w} │`);
}

console.log('└───────────────────────────┴──────────┴──────────┴────────────┴─────────────┘');

// Summary
const wins = { Direct: 0, Pool: 0, 'Pool+Cache': 0 };
for (const r of results) {
    wins[r.winner as keyof typeof wins]++;
}

console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
console.log('│                          CONCLUSIÓN                                │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│  Direct: ${wins.Direct} wins | Pool: ${wins.Pool} wins | Pool+Cache: ${wins['Pool+Cache']} wins              │`);
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│  • Direct     → ops únicas, 1 sistema                              │');
console.log('│  • Pool       → múltiples sistemas comparten datos                 │');
console.log('│  • Pool+Cache → escenas estáticas entre frames                     │');
console.log('└─────────────────────────────────────────────────────────────────────┘');

if (dce === 0.123) console.log('dce');
