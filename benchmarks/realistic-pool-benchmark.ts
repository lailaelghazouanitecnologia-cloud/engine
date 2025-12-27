/**
 * Realistic Benchmark: Unique Operations (No Duplicates)
 *
 * Simulates real-world scenarios where most operations are unique.
 *
 * Run with: npx tsx benchmarks/realistic-pool-benchmark.ts
 */

import { OperationPool } from '../src/wasm/OperationPool';

// Suppress WASM warnings for cleaner output
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('WASM')) return;
    originalWarn.apply(console, args);
};

// Create unique matrices
function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 100 - 50);
}

function randomQuat(): Float32Array {
    const q = new Float32Array(4).map(() => Math.random() * 2 - 1);
    const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return new Float32Array([q[0]/len, q[1]/len, q[2]/len, q[3]/len]);
}

// Direct JS implementation for comparison
function mat4MultiplyDirect(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            out[i * 4 + j] =
                a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return out;
}

function quatSlerpDirect(a: Float32Array, b: Float32Array, t: number): Float32Array {
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let cosom = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (cosom < 0) { cosom = -cosom; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    let scale0: number, scale1: number;
    if (1 - cosom > 0.000001) {
        const omega = Math.acos(cosom);
        const sinom = Math.sin(omega);
        scale0 = Math.sin((1 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1 - t;
        scale1 = t;
    }
    return new Float32Array([
        scale0 * a[0] + scale1 * bx,
        scale0 * a[1] + scale1 * by,
        scale0 * a[2] + scale1 * bz,
        scale0 * a[3] + scale1 * bw,
    ]);
}

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           REALISTIC BENCHMARK: Unique Operations (No Duplicates)             ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

const pool = OperationPool.instance;

// Disable dedup/cache for unique operations benchmark
pool.setDeduplication(false);
pool.setCaching(false);
console.log('⚙️  Deduplication: OFF | Caching: OFF (for unique operations)\n');

interface BenchResult {
    name: string;
    ops: number;
    directTime: number;
    poolTime: number;
    directPerOp: number;
    poolPerOp: number;
    overhead: number;
}

const results: BenchResult[] = [];

// ============ Test 1: Matrix Multiply (Unique) ============
{
    const OPS = 1000;
    const matrices: [Float32Array, Float32Array][] = [];
    for (let i = 0; i < OPS; i++) {
        matrices.push([randomMatrix(), randomMatrix()]);
    }

    // Warmup
    for (let i = 0; i < 100; i++) {
        mat4MultiplyDirect(matrices[i % OPS][0], matrices[i % OPS][1]);
    }

    // Direct JS
    const directStart = performance.now();
    for (const [a, b] of matrices) {
        mat4MultiplyDirect(a, b);
    }
    const directTime = performance.now() - directStart;

    // Pool
    pool.resetStats();
    pool.clearCache();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b] of matrices) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    results.push({
        name: 'Matrix Multiply (unique)',
        ops: OPS,
        directTime,
        poolTime,
        directPerOp: (directTime / OPS) * 1000,
        poolPerOp: (poolTime / OPS) * 1000,
        overhead: ((poolTime / directTime) - 1) * 100,
    });
}

// ============ Test 2: Quaternion SLERP (Unique) ============
{
    const OPS = 1000;
    const quats: [Float32Array, Float32Array, number][] = [];
    for (let i = 0; i < OPS; i++) {
        quats.push([randomQuat(), randomQuat(), Math.random()]);
    }

    // Warmup
    for (let i = 0; i < 100; i++) {
        const [a, b, t] = quats[i % OPS];
        quatSlerpDirect(a, b, t);
    }

    // Direct JS
    const directStart = performance.now();
    for (const [a, b, t] of quats) {
        quatSlerpDirect(a, b, t);
    }
    const directTime = performance.now() - directStart;

    // Pool
    pool.resetStats();
    pool.clearCache();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b, t] of quats) {
        pool.queueQuatSlerp(a, b, t, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    results.push({
        name: 'Quat SLERP (unique)',
        ops: OPS,
        directTime,
        poolTime,
        directPerOp: (directTime / OPS) * 1000,
        poolPerOp: (poolTime / OPS) * 1000,
        overhead: ((poolTime / directTime) - 1) * 100,
    });
}

// ============ Test 3: Mixed Scenario (Game Frame Simulation) ============
{
    const OPS = 500;
    const matrices: [Float32Array, Float32Array][] = [];
    const quats: [Float32Array, Float32Array, number][] = [];

    for (let i = 0; i < OPS; i++) {
        matrices.push([randomMatrix(), randomMatrix()]);
        quats.push([randomQuat(), randomQuat(), Math.random()]);
    }

    // Direct JS
    const directStart = performance.now();
    for (let i = 0; i < OPS; i++) {
        mat4MultiplyDirect(matrices[i][0], matrices[i][1]);
        quatSlerpDirect(quats[i][0], quats[i][1], quats[i][2]);
    }
    const directTime = performance.now() - directStart;

    // Pool
    pool.resetStats();
    pool.clearCache();
    pool.newFrame();

    const poolStart = performance.now();
    for (let i = 0; i < OPS; i++) {
        pool.queueMatrixMultiply(matrices[i][0], matrices[i][1], () => {});
        pool.queueQuatSlerp(quats[i][0], quats[i][1], quats[i][2], () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    results.push({
        name: 'Mixed (500 mat + 500 quat)',
        ops: OPS * 2,
        directTime,
        poolTime,
        directPerOp: (directTime / (OPS * 2)) * 1000,
        poolPerOp: (poolTime / (OPS * 2)) * 1000,
        overhead: ((poolTime / directTime) - 1) * 100,
    });
}

// ============ Test 4: Large Batch (Stress Test) ============
{
    const OPS = 5000;
    const matrices: [Float32Array, Float32Array][] = [];
    for (let i = 0; i < OPS; i++) {
        matrices.push([randomMatrix(), randomMatrix()]);
    }

    // Direct JS
    const directStart = performance.now();
    for (const [a, b] of matrices) {
        mat4MultiplyDirect(a, b);
    }
    const directTime = performance.now() - directStart;

    // Pool
    pool.resetStats();
    pool.clearCache();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b] of matrices) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    results.push({
        name: 'Large Batch (5000 mat)',
        ops: OPS,
        directTime,
        poolTime,
        directPerOp: (directTime / OPS) * 1000,
        poolPerOp: (poolTime / OPS) * 1000,
        overhead: ((poolTime / directTime) - 1) * 100,
    });
}

// ============ Test 5: With 20% Duplicates (Realistic) ============
{
    // Re-enable dedup for this test
    pool.setDeduplication(true);
    pool.setCaching(false);

    const UNIQUE = 800;
    const DUPS = 200;
    const matrices: [Float32Array, Float32Array][] = [];

    // Create unique matrices
    for (let i = 0; i < UNIQUE; i++) {
        matrices.push([randomMatrix(), randomMatrix()]);
    }
    // Add duplicates (reuse first 200)
    for (let i = 0; i < DUPS; i++) {
        matrices.push(matrices[i]);
    }
    // Shuffle
    for (let i = matrices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matrices[i], matrices[j]] = [matrices[j], matrices[i]];
    }

    // Direct JS (no dedup)
    const directStart = performance.now();
    for (const [a, b] of matrices) {
        mat4MultiplyDirect(a, b);
    }
    const directTime = performance.now() - directStart;

    // Pool (with dedup enabled)
    pool.resetStats();
    pool.clearCache();
    pool.newFrame();

    const poolStart = performance.now();
    for (const [a, b] of matrices) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
    pool.flush();
    const poolTime = performance.now() - poolStart;

    const stats = pool.stats;

    results.push({
        name: `20% Duplicates (${stats.operationsDeduplicated} deduped)`,
        ops: UNIQUE + DUPS,
        directTime,
        poolTime,
        directPerOp: (directTime / (UNIQUE + DUPS)) * 1000,
        poolPerOp: (poolTime / (UNIQUE + DUPS)) * 1000,
        overhead: ((poolTime / directTime) - 1) * 100,
    });
}

// ============ Print Results Table ============
console.log('┌─────────────────────────────────────┬────────┬────────────┬────────────┬──────────┬──────────┬───────────┐');
console.log('│ Test                                │   Ops  │ Direct(ms) │  Pool(ms)  │ Direct/op│ Pool/op  │ Overhead  │');
console.log('├─────────────────────────────────────┼────────┼────────────┼────────────┼──────────┼──────────┼───────────┤');

for (const r of results) {
    const name = r.name.padEnd(35);
    const ops = r.ops.toString().padStart(6);
    const direct = r.directTime.toFixed(2).padStart(10);
    const poolT = r.poolTime.toFixed(2).padStart(10);
    const directOp = r.directPerOp.toFixed(2).padStart(6) + ' µs';
    const poolOp = r.poolPerOp.toFixed(2).padStart(6) + ' µs';
    const overhead = (r.overhead >= 0 ? '+' : '') + r.overhead.toFixed(1) + '%';
    const overheadPad = overhead.padStart(9);

    console.log(`│ ${name} │ ${ops} │ ${direct} │ ${poolT} │ ${directOp} │ ${poolOp} │ ${overheadPad} │`);
}

console.log('└─────────────────────────────────────┴────────┴────────────┴────────────┴──────────┴──────────┴───────────┘');

// ============ Summary ============
console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              ANALYSIS                                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

const avgOverhead = results.reduce((sum, r) => sum + r.overhead, 0) / results.length;
const avgPoolPerOp = results.reduce((sum, r) => sum + r.poolPerOp, 0) / results.length;

console.log(`  Average overhead:     ${avgOverhead >= 0 ? '+' : ''}${avgOverhead.toFixed(1)}%`);
console.log(`  Average time per op:  ${avgPoolPerOp.toFixed(2)} µs`);
console.log('');

if (avgOverhead < 10) {
    console.log('  ✅ Pool overhead is MINIMAL (<10%)');
} else if (avgOverhead < 30) {
    console.log('  ⚠️  Pool overhead is ACCEPTABLE (10-30%)');
} else {
    console.log('  ❌ Pool overhead is HIGH (>30%) - needs optimization');
}

console.log('');
console.log('  Notes:');
console.log('  • Pool includes: hashing, hashmap lookup, callback management');
console.log('  • Direct JS has no overhead, pure computation');
console.log('  • With WASM enabled, Pool would be faster for large batches');
console.log('  • Deduplication saves work when operations repeat');

// Restore console.warn
console.warn = originalWarn;
