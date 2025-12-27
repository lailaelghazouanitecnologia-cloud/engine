/**
 * Honest Comparison: When to use Pool vs Direct
 *
 * Run with: npx tsx benchmarks/honest-comparison.ts
 */

import { OperationPool } from '../src/wasm/OperationPool';

// Suppress WASM warnings
console.warn = () => {};

function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 2 - 1);
}

// Inline matrix multiply (what Legacy does)
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

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    HONEST COMPARISON: Pool vs Direct                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

const pool = OperationPool.instance;
const OPS = 5000;
let preventDCE = 0;

// Prepare data
const matrices: Float32Array[] = [];
for (let i = 0; i < OPS; i++) {
    matrices.push(randomMatrix());
}
const outMatrix = new Float32Array(16);

interface Result {
    scenario: string;
    direct: number;
    pool: number;
    winner: string;
    note: string;
}

const results: Result[] = [];

// ============ Scenario 1: All unique operations ============
{
    // Warmup both equally
    for (let w = 0; w < 3; w++) {
        for (let i = 0; i < 1000; i++) {
            mat4Multiply(outMatrix, matrices[i], matrices[(i+1) % 1000]);
            preventDCE += outMatrix[0];
        }
        pool.setDeduplication(false);
        pool.setCaching(false);
        pool.newFrame();
        for (let i = 0; i < 1000; i++) {
            pool.queueMatrixMultiply(matrices[i], matrices[(i+1) % 1000], () => {});
        }
        pool.flush();
    }

    // Direct
    const directStart = performance.now();
    for (let i = 0; i < OPS - 1; i++) {
        mat4Multiply(outMatrix, matrices[i], matrices[i+1]);
        preventDCE += outMatrix[0];
    }
    const directTime = performance.now() - directStart;

    // Pool (dedup off)
    pool.setDeduplication(false);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    const poolStart = performance.now();
    for (let i = 0; i < OPS - 1; i++) {
        pool.queueMatrixMultiply(matrices[i], matrices[i+1], () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    results.push({
        scenario: '100% unique ops',
        direct: directTime,
        pool: poolTime,
        winner: directTime < poolTime ? 'DIRECT' : 'POOL',
        note: 'No dedup benefit',
    });
}

// ============ Scenario 2: 50% duplicates ============
{
    const halfOps = OPS / 2;
    const mixedMats: [Float32Array, Float32Array][] = [];

    // First half: unique
    for (let i = 0; i < halfOps; i++) {
        mixedMats.push([matrices[i], matrices[(i+1) % OPS]]);
    }
    // Second half: duplicates of first 500
    for (let i = 0; i < halfOps; i++) {
        mixedMats.push([matrices[i % 500], matrices[(i+1) % 500]]);
    }

    // Direct (no dedup)
    const directStart = performance.now();
    for (const [a, b] of mixedMats) {
        mat4Multiply(outMatrix, a, b);
        preventDCE += outMatrix[0];
    }
    const directTime = performance.now() - directStart;

    // Pool with dedup
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b] of mixedMats) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    const stats = pool.stats;
    results.push({
        scenario: '50% duplicates',
        direct: directTime,
        pool: poolTime,
        winner: directTime < poolTime ? 'DIRECT' : 'POOL',
        note: `${stats.operationsDeduplicated} deduped`,
    });
}

// ============ Scenario 3: 90% duplicates ============
{
    const uniqueOps = OPS / 10;
    const mixedMats: [Float32Array, Float32Array][] = [];

    // 10% unique
    for (let i = 0; i < uniqueOps; i++) {
        mixedMats.push([matrices[i], matrices[(i+1) % OPS]]);
    }
    // 90% duplicates
    for (let i = 0; i < OPS - uniqueOps; i++) {
        mixedMats.push([matrices[i % 50], matrices[(i+1) % 50]]);
    }

    // Direct
    const directStart = performance.now();
    for (const [a, b] of mixedMats) {
        mat4Multiply(outMatrix, a, b);
        preventDCE += outMatrix[0];
    }
    const directTime = performance.now() - directStart;

    // Pool with dedup
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b] of mixedMats) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    const stats = pool.stats;
    results.push({
        scenario: '90% duplicates',
        direct: directTime,
        pool: poolTime,
        winner: directTime < poolTime ? 'DIRECT' : 'POOL',
        note: `${stats.operationsDeduplicated} deduped`,
    });
}

// ============ Scenario 4: Same data across 10 frames (caching) ============
{
    const OPS_FRAME = 500;
    const FRAMES = 10;

    // Direct: recompute every frame
    let directTotal = 0;
    for (let f = 0; f < FRAMES; f++) {
        const start = performance.now();
        for (let i = 0; i < OPS_FRAME; i++) {
            mat4Multiply(outMatrix, matrices[i], matrices[(i+1) % OPS_FRAME]);
            preventDCE += outMatrix[0];
        }
        directTotal += performance.now() - start;
    }

    // Pool with caching
    pool.setDeduplication(false);
    pool.setCaching(true);
    pool.clearCache();

    let poolTotal = 0;
    let cacheHits = 0;
    for (let f = 0; f < FRAMES; f++) {
        pool.resetStats();
        pool.newFrame();
        const start = performance.now();
        for (let i = 0; i < OPS_FRAME; i++) {
            pool.queueMatrixMultiply(matrices[i], matrices[(i+1) % OPS_FRAME], () => {});
        }
        pool.flush();
        poolTotal += performance.now() - start;
        cacheHits += pool.stats.cacheHits;
    }

    results.push({
        scenario: `${FRAMES} frames, same data`,
        direct: directTotal,
        pool: poolTotal,
        winner: directTotal < poolTotal ? 'DIRECT' : 'POOL',
        note: `${cacheHits} cache hits`,
    });
}

// ============ Print Results ============
console.log('┌─────────────────────────────┬───────────┬───────────┬─────────┬────────────────────────┐');
console.log('│ Scenario                    │ Direct(ms)│ Pool(ms)  │ Winner  │ Note                   │');
console.log('├─────────────────────────────┼───────────┼───────────┼─────────┼────────────────────────┤');

for (const r of results) {
    const scen = r.scenario.padEnd(27);
    const direct = r.direct.toFixed(2).padStart(9);
    const poolT = r.pool.toFixed(2).padStart(9);
    const winner = r.winner.padStart(7);
    const note = r.note.padEnd(22);

    console.log(`│ ${scen} │ ${direct} │ ${poolT} │ ${winner} │ ${note} │`);
}

console.log('└─────────────────────────────┴───────────┴───────────┴─────────┴────────────────────────┘');

// ============ Analysis ============
console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           CONCLUSIONES                                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('  ┌──────────────────────────────────────────────────────────────────────────┐');
console.log('  │ CUÁNDO USAR CADA APPROACH                                               │');
console.log('  ├──────────────────────────────────────────────────────────────────────────┤');
console.log('  │                                                                          │');
console.log('  │  ✅ DIRECT (Legacy-style):                                               │');
console.log('  │     • Operaciones 100% únicas                                            │');
console.log('  │     • Cálculos simples (matrix multiply ~1µs)                            │');
console.log('  │     • Datos que cambian cada frame                                       │');
console.log('  │                                                                          │');
console.log('  │  ✅ POOL con dedup:                                                      │');
console.log('  │     • >50% operaciones duplicadas                                        │');
console.log('  │     • Múltiples sistemas piden el mismo cálculo                          │');
console.log('  │     • Cuando WASM acelere el cálculo (futuro)                            │');
console.log('  │                                                                          │');
console.log('  │  ✅ POOL con cache:                                                      │');
console.log('  │     • Datos estáticos entre frames                                       │');
console.log('  │     • Matrices de transformación de objetos estáticos                    │');
console.log('  │     • Skeletal animation con poses cacheadas                             │');
console.log('  │                                                                          │');
console.log('  └──────────────────────────────────────────────────────────────────────────┘');

console.log('\n  Overhead del Pool sin beneficios: ~' +
    ((results[0].pool / results[0].direct - 1) * 100).toFixed(0) + '%');
console.log('  Ahorro con 90% dups: ~' +
    ((1 - results[2].pool / results[2].direct) * 100).toFixed(0) + '% más rápido');

if (preventDCE === 0.123456789) console.log('DCE');
