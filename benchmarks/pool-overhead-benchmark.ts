/**
 * Pool Overhead Benchmark: Measures actual overhead of pooling system
 *
 * Run with: npx tsx benchmarks/pool-overhead-benchmark.ts
 */

import { OperationPool } from '../src/wasm/OperationPool';

// Suppress WASM warnings
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('WASM')) return;
    originalWarn.apply(console, args);
};

function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 100 - 50);
}

function randomQuat(): Float32Array {
    const q = new Float32Array(4).map(() => Math.random() * 2 - 1);
    const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return new Float32Array([q[0]/len, q[1]/len, q[2]/len, q[3]/len]);
}

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    POOL OVERHEAD BENCHMARK                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

const pool = OperationPool.instance;

interface Result {
    name: string;
    ops: number;
    timeMs: number;
    perOpUs: number;
}

const results: Result[] = [];

// Prepare data
const OPERATIONS = 10000;
const matrices: [Float32Array, Float32Array][] = [];
const quats: [Float32Array, Float32Array, number][] = [];

for (let i = 0; i < OPERATIONS; i++) {
    matrices.push([randomMatrix(), randomMatrix()]);
    quats.push([randomQuat(), randomQuat(), Math.random()]);
}

// ============ Test 1: Matrix with dedup OFF ============
{
    pool.setDeduplication(false);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    // Warmup
    for (let i = 0; i < 1000; i++) {
        pool.queueMatrixMultiply(matrices[i % OPERATIONS][0], matrices[i % OPERATIONS][1], () => {});
    }
    pool.flush();
    pool.resetStats();
    pool.newFrame();

    const start = performance.now();
    for (let i = 0; i < OPERATIONS; i++) {
        pool.queueMatrixMultiply(matrices[i][0], matrices[i][1], () => {});
    }
    pool.flush();
    const time = performance.now() - start;

    results.push({
        name: 'Matrix (dedup OFF)',
        ops: OPERATIONS,
        timeMs: time,
        perOpUs: (time / OPERATIONS) * 1000,
    });
}

// ============ Test 2: Matrix with dedup ON (unique ops) ============
{
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    // Warmup
    for (let i = 0; i < 1000; i++) {
        pool.queueMatrixMultiply(matrices[i % OPERATIONS][0], matrices[i % OPERATIONS][1], () => {});
    }
    pool.flush();
    pool.resetStats();
    pool.newFrame();

    const start = performance.now();
    for (let i = 0; i < OPERATIONS; i++) {
        pool.queueMatrixMultiply(matrices[i][0], matrices[i][1], () => {});
    }
    pool.flush();
    const time = performance.now() - start;

    results.push({
        name: 'Matrix (dedup ON, unique)',
        ops: OPERATIONS,
        timeMs: time,
        perOpUs: (time / OPERATIONS) * 1000,
    });
}

// ============ Test 3: Matrix with dedup ON (50% dups) ============
{
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    // Create array with 50% duplicates
    const mixedMatrices: [Float32Array, Float32Array][] = [];
    for (let i = 0; i < OPERATIONS / 2; i++) {
        mixedMatrices.push(matrices[i]);
    }
    // Add duplicates
    for (let i = 0; i < OPERATIONS / 2; i++) {
        mixedMatrices.push(matrices[i % (OPERATIONS / 2)]);
    }

    const start = performance.now();
    for (let i = 0; i < OPERATIONS; i++) {
        pool.queueMatrixMultiply(mixedMatrices[i][0], mixedMatrices[i][1], () => {});
    }
    pool.flush();
    const time = performance.now() - start;

    const stats = pool.stats;
    results.push({
        name: `Matrix (dedup ON, ${stats.operationsDeduplicated} deduped)`,
        ops: OPERATIONS,
        timeMs: time,
        perOpUs: (time / OPERATIONS) * 1000,
    });
}

// ============ Test 4: Quat SLERP with dedup OFF ============
{
    pool.setDeduplication(false);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    const start = performance.now();
    for (let i = 0; i < OPERATIONS; i++) {
        pool.queueQuatSlerp(quats[i][0], quats[i][1], quats[i][2], () => {});
    }
    pool.flush();
    const time = performance.now() - start;

    results.push({
        name: 'Quat SLERP (dedup OFF)',
        ops: OPERATIONS,
        timeMs: time,
        perOpUs: (time / OPERATIONS) * 1000,
    });
}

// ============ Test 5: Quat SLERP with dedup ON ============
{
    pool.setDeduplication(true);
    pool.setCaching(false);
    pool.resetStats();
    pool.newFrame();

    const start = performance.now();
    for (let i = 0; i < OPERATIONS; i++) {
        pool.queueQuatSlerp(quats[i][0], quats[i][1], quats[i][2], () => {});
    }
    pool.flush();
    const time = performance.now() - start;

    results.push({
        name: 'Quat SLERP (dedup ON)',
        ops: OPERATIONS,
        timeMs: time,
        perOpUs: (time / OPERATIONS) * 1000,
    });
}

// ============ Test 6: Cross-frame caching ============
{
    pool.setDeduplication(false);
    pool.setCaching(true);
    pool.clearCache();

    let totalTime = 0;
    let totalCacheHits = 0;

    // Run 5 frames with same data
    for (let frame = 0; frame < 5; frame++) {
        pool.resetStats();
        pool.newFrame();

        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            pool.queueMatrixMultiply(matrices[i][0], matrices[i][1], () => {});
        }
        pool.flush();
        totalTime += performance.now() - start;
        totalCacheHits += pool.stats.cacheHits;
    }

    results.push({
        name: `Cross-frame cache (${totalCacheHits} hits/5000)`,
        ops: 5000,
        timeMs: totalTime,
        perOpUs: (totalTime / 5000) * 1000,
    });
}

// ============ Print Results ============
console.log('┌────────────────────────────────────────┬────────┬────────────┬────────────┐');
console.log('│ Configuration                          │   Ops  │  Time(ms)  │  Per Op    │');
console.log('├────────────────────────────────────────┼────────┼────────────┼────────────┤');

for (const r of results) {
    const name = r.name.padEnd(38);
    const ops = r.ops.toString().padStart(6);
    const time = r.timeMs.toFixed(2).padStart(10);
    const perOp = r.perOpUs.toFixed(2).padStart(8) + ' µs';

    console.log(`│ ${name} │ ${ops} │ ${time} │ ${perOp} │`);
}

console.log('└────────────────────────────────────────┴────────┴────────────┴────────────┘');

// ============ Summary ============
const dedupOff = results.find(r => r.name.includes('dedup OFF') && r.name.includes('Matrix'));
const dedupOn = results.find(r => r.name.includes('dedup ON, unique'));
const withDups = results.find(r => r.name.includes('deduped'));

console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              ANALYSIS                                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

if (dedupOff && dedupOn) {
    const overhead = ((dedupOn.perOpUs / dedupOff.perOpUs) - 1) * 100;
    console.log(`  Dedup overhead (unique ops): ${overhead >= 0 ? '+' : ''}${overhead.toFixed(1)}%`);
}

if (dedupOff && withDups) {
    const savings = ((dedupOff.perOpUs / withDups.perOpUs) - 1) * 100;
    console.log(`  Dedup savings (50% dups):    ${savings >= 0 ? '+' : ''}${savings.toFixed(1)}% faster`);
}

console.log('\n  Recommendations:');
console.log('  • Use dedup OFF for mostly unique operations');
console.log('  • Use dedup ON when >30% operations repeat');
console.log('  • Use caching for static/unchanging data');

console.warn = originalWarn;
