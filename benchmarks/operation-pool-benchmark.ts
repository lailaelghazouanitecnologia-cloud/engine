/**
 * Benchmark: OperationPool Deduplication & Caching
 *
 * Tests the effectiveness of:
 * 1. Hash-based operation deduplication
 * 2. Cross-frame result caching
 * 3. Batch execution
 *
 * Run with: npx tsx benchmarks/operation-pool-benchmark.ts
 */

import { OperationPool } from '../src/wasm/OperationPool';

// Create random matrices for testing
function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 2 - 1);
}

function randomQuat(): Float32Array {
    const q = new Float32Array(4).map(() => Math.random() * 2 - 1);
    const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return new Float32Array([q[0]/len, q[1]/len, q[2]/len, q[3]/len]);
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║         OPERATION POOL: Deduplication & Caching Benchmark         ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const pool = OperationPool.instance;

// ============ Test 1: Deduplication within same frame ============
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Deduplication (same matrix, 100 requests)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

pool.resetStats();
pool.newFrame();

const matA = randomMatrix();
const matB = randomMatrix();
let callbackCount1 = 0;

// Queue the SAME operation 100 times
for (let i = 0; i < 100; i++) {
    pool.queueMatrixMultiply(matA, matB, () => { callbackCount1++; });
}

pool.flush();
const stats1 = pool.stats;

console.log(`  Operations queued:      ${stats1.operationsQueued}`);
console.log(`  Operations deduplicated: ${stats1.operationsDeduplicated}`);
console.log(`  Operations processed:   ${stats1.operationsProcessed}`);
console.log(`  Callbacks invoked:      ${callbackCount1}`);
console.log(`  Flush time:             ${stats1.lastFlushTime.toFixed(3)} ms`);
console.log(`  Dedup efficiency:       ${((stats1.operationsDeduplicated / (stats1.operationsQueued + stats1.operationsDeduplicated)) * 100).toFixed(1)}%`);

if (stats1.operationsProcessed === 1 && callbackCount1 === 100) {
    console.log('\n  ✅ PASS: Single operation served 100 callbacks');
} else {
    console.log('\n  ❌ FAIL: Deduplication not working correctly');
}

// ============ Test 2: Cache hits across frames ============
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Cross-frame cache (same matrix, 5 frames)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

pool.resetStats();
pool.clearCache();

const matC = randomMatrix();
const matD = randomMatrix();

for (let frame = 1; frame <= 5; frame++) {
    pool.newFrame();
    let callbackCount = 0;

    pool.queueMatrixMultiply(matC, matD, () => { callbackCount++; });
    pool.flush();

    const s = pool.stats;
    console.log(`  Frame ${frame}: processed=${s.operationsProcessed}, cacheHits=${s.cacheHits}`);
}

const stats2 = pool.stats;
console.log(`\n  Total cache hits: ${stats2.cacheHits}`);
if (stats2.cacheHits === 4) {
    console.log('  ✅ PASS: 4 cache hits (first frame computed, 4 served from cache)');
} else {
    console.log('  ❌ FAIL: Expected 4 cache hits');
}

// ============ Test 3: Mixed unique + duplicate operations ============
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: Mixed operations (10 unique, each requested 5x)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

pool.resetStats();
pool.clearCache();
pool.newFrame();

const uniqueMatrices: [Float32Array, Float32Array][] = [];
for (let i = 0; i < 10; i++) {
    uniqueMatrices.push([randomMatrix(), randomMatrix()]);
}

let callbackCount3 = 0;

// Queue each unique matrix 5 times
for (let rep = 0; rep < 5; rep++) {
    for (const [a, b] of uniqueMatrices) {
        pool.queueMatrixMultiply(a, b, () => { callbackCount3++; });
    }
}

pool.flush();
const stats3 = pool.stats;

console.log(`  Total requests:         50 (10 unique × 5 reps)`);
console.log(`  Operations queued:      ${stats3.operationsQueued}`);
console.log(`  Operations deduplicated: ${stats3.operationsDeduplicated}`);
console.log(`  Operations processed:   ${stats3.operationsProcessed}`);
console.log(`  Callbacks invoked:      ${callbackCount3}`);

if (stats3.operationsProcessed === 10 && callbackCount3 === 50) {
    console.log('\n  ✅ PASS: 10 unique operations served 50 callbacks');
} else {
    console.log('\n  ❌ FAIL: Expected 10 processed, 50 callbacks');
}

// ============ Test 4: Quaternion SLERP deduplication ============
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: Quaternion SLERP deduplication');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

pool.resetStats();
pool.clearCache();
pool.newFrame();

const quatA = randomQuat();
const quatB = randomQuat();
let callbackCount4 = 0;

// Queue same SLERP 50 times with same t value
for (let i = 0; i < 50; i++) {
    pool.queueQuatSlerp(quatA, quatB, 0.5, () => { callbackCount4++; });
}

pool.flush();
const stats4 = pool.stats;

console.log(`  Operations queued:      ${stats4.operationsQueued}`);
console.log(`  Operations deduplicated: ${stats4.operationsDeduplicated}`);
console.log(`  Operations processed:   ${stats4.operationsProcessed}`);
console.log(`  Callbacks invoked:      ${callbackCount4}`);

if (stats4.operationsProcessed === 1 && callbackCount4 === 50) {
    console.log('\n  ✅ PASS: Single SLERP served 50 callbacks');
} else {
    console.log('\n  ❌ FAIL: SLERP deduplication not working');
}

// ============ Test 5: Performance comparison ============
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 5: Performance (1000 ops with 90% duplicates)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Create 100 unique matrices, queue each 10 times = 1000 ops
const testMatrices: [Float32Array, Float32Array][] = [];
for (let i = 0; i < 100; i++) {
    testMatrices.push([randomMatrix(), randomMatrix()]);
}

// Warm up
pool.resetStats();
pool.clearCache();
pool.newFrame();
for (const [a, b] of testMatrices) {
    pool.queueMatrixMultiply(a, b, () => {});
}
pool.flush();

// Timed test
pool.resetStats();
pool.clearCache();
pool.newFrame();

const startTime = performance.now();

for (let rep = 0; rep < 10; rep++) {
    for (const [a, b] of testMatrices) {
        pool.queueMatrixMultiply(a, b, () => {});
    }
}
pool.flush();

const endTime = performance.now();
const stats5 = pool.stats;

console.log(`  Total operations:       1000`);
console.log(`  Unique operations:      100`);
console.log(`  Operations processed:   ${stats5.operationsProcessed}`);
console.log(`  Operations deduplicated: ${stats5.operationsDeduplicated}`);
console.log(`  Total time:             ${(endTime - startTime).toFixed(3)} ms`);
console.log(`  Time per operation:     ${((endTime - startTime) / 1000 * 1000).toFixed(3)} µs`);
console.log(`  Dedup savings:          ${(stats5.operationsDeduplicated / 10).toFixed(0)}% of work avoided`);

// ============ Summary ============
console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                           SUMMARY                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const allPassed =
    stats1.operationsProcessed === 1 &&
    stats2.cacheHits === 4 &&
    stats3.operationsProcessed === 10 &&
    stats4.operationsProcessed === 1;

if (allPassed) {
    console.log('  ✅ ALL TESTS PASSED');
    console.log('\n  Deduplication and caching are working correctly!');
    console.log('  - Same operations within a frame: DEDUPLICATED');
    console.log('  - Same operations across frames: CACHED');
    console.log('  - Multiple callbacks per operation: SUPPORTED');
} else {
    console.log('  ❌ SOME TESTS FAILED - Check implementation');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
