/**
 * WasmBatchProcessor Test - Mixed operation types in single batch
 *
 * Run: npx tsx benchmarks/batch-processor-test.ts
 */

import { WasmBridge } from '../src/wasm/WasmBridge';
import { WasmBatchProcessor, WasmOpCode } from '../src/wasm/WasmBatchProcessor';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║        UNIFIED BATCH PROCESSOR TEST                          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Initialize WASM
console.log('Initializing WASM...');
await WasmBridge.init('/home/user/engine/dist/wasm/engine_core_bg.wasm');
const bridge = WasmBridge.instance;
console.log('WASM Status:', bridge.usingFallback ? '⚠️ JS Fallback' : '✅ WASM Active');

// Initialize batch processor
const batch = WasmBatchProcessor.instance;
await batch.init();
console.log('');

// Test data
function randomVec3(): Float32Array {
    return new Float32Array([Math.random(), Math.random(), Math.random()]);
}

function randomQuat(): Float32Array {
    const q = new Float32Array(4).map(() => Math.random() * 2 - 1);
    const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return new Float32Array([q[0]/len, q[1]/len, q[2]/len, q[3]/len]);
}

function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 2 - 1);
}

let dce = 0;

// ========== Test 1: Mixed Operations Batch ==========
console.log('Test 1: Mixed Operations Batch');
console.log('─────────────────────────────────');
{
    const VEC3_OPS = 100;
    const QUAT_OPS = 50;
    const MAT4_OPS = 50;

    const vec3Results: Float32Array[] = [];
    const quatResults: Float32Array[] = [];
    const mat4Results: Float32Array[] = [];

    // Prepare data
    const vec3Data = Array.from({ length: VEC3_OPS }, () => [randomVec3(), randomVec3()]);
    const quatData = Array.from({ length: QUAT_OPS }, () => [randomQuat(), randomQuat(), Math.random()]);
    const mat4Data = Array.from({ length: MAT4_OPS }, () => [randomMatrix(), randomMatrix()]);

    // Queue all operations
    batch.resetStats();
    const t1 = performance.now();

    for (const [a, b] of vec3Data) {
        batch.queueVec3Add(a, b, (r) => vec3Results.push(r));
    }
    for (const [a, b, t] of quatData) {
        batch.queueQuatSlerp(a as Float32Array, b as Float32Array, t as number, (r) => quatResults.push(r));
    }
    for (const [a, b] of mat4Data) {
        batch.queueMat4Multiply(a, b, (r) => mat4Results.push(r));
    }

    // Single flush
    batch.flush();
    const batchTime = performance.now() - t1;

    const stats = batch.stats;
    console.log(`  Operations queued: ${stats.operationsQueued}`);
    console.log(`  Batches executed: ${stats.batchesExecuted}`);
    console.log(`  WASM calls saved: ${stats.wasmCallsSaved}`);
    console.log(`  Execution time: ${batchTime.toFixed(2)}ms`);
    console.log(`  Results received: vec3=${vec3Results.length}, quat=${quatResults.length}, mat4=${mat4Results.length}`);

    // Verify results
    if (vec3Results.length === VEC3_OPS && quatResults.length === QUAT_OPS && mat4Results.length === MAT4_OPS) {
        console.log('  ✅ All callbacks received');
    } else {
        console.log('  ❌ Missing callbacks');
    }

    // Sample verification
    const sampleVec3 = vec3Data[0];
    const expectedAdd = new Float32Array([
        sampleVec3[0][0] + sampleVec3[1][0],
        sampleVec3[0][1] + sampleVec3[1][1],
        sampleVec3[0][2] + sampleVec3[1][2]
    ]);
    const actualAdd = vec3Results[0];
    const addError = Math.abs(expectedAdd[0] - actualAdd[0]) +
                     Math.abs(expectedAdd[1] - actualAdd[1]) +
                     Math.abs(expectedAdd[2] - actualAdd[2]);
    console.log(`  Vec3 add error: ${addError.toExponential(2)} ${addError < 0.0001 ? '✅' : '❌'}`);
}

console.log('');

// ========== Test 2: Batch vs Individual Performance ==========
console.log('Test 2: Batch vs Individual Performance');
console.log('─────────────────────────────────────────');
{
    const ITERATIONS = 1000;
    const mat4Data = Array.from({ length: ITERATIONS }, () => [randomMatrix(), randomMatrix()]);

    // Batched
    batch.resetStats();
    const results: Float32Array[] = [];
    const t1 = performance.now();
    for (const [a, b] of mat4Data) {
        batch.queueMat4Multiply(a, b, (r) => { results.push(r); dce += r[0]; });
    }
    batch.flush();
    const batchedTime = performance.now() - t1;

    // Individual (using executeImmediate)
    const t2 = performance.now();
    for (const [a, b] of mat4Data) {
        const data = new Array(32);
        for (let i = 0; i < 16; i++) {
            data[i] = a[i];
            data[i + 16] = b[i];
        }
        const r = batch.executeImmediate(WasmOpCode.MAT4_MULTIPLY, data);
        dce += r[0];
    }
    const individualTime = performance.now() - t2;

    console.log(`  Batched (${ITERATIONS} ops): ${batchedTime.toFixed(2)}ms`);
    console.log(`  Individual (${ITERATIONS} ops): ${individualTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${(individualTime / batchedTime).toFixed(2)}x`);
}

console.log('');

// ========== Test 3: Transform Hierarchy Simulation ==========
console.log('Test 3: Transform Hierarchy Simulation');
console.log('──────────────────────────────────────');
{
    // Simulate 100 transforms with TRS → local matrix → world matrix
    const COUNT = 100;

    const positions = Array.from({ length: COUNT }, () => randomVec3());
    const rotations = Array.from({ length: COUNT }, () => randomQuat());
    const scales = Array.from({ length: COUNT }, () => randomVec3());

    // Parents (simulate hierarchy - each transform has a parent matrix)
    const parentMatrices = Array.from({ length: COUNT }, () => randomMatrix());

    // Step 1: Compute TRS matrices
    // Step 2: Multiply with parent matrices
    batch.resetStats();
    const trsResults: Float32Array[] = [];
    const worldResults: Float32Array[] = [];

    const t1 = performance.now();

    // Queue TRS computations
    for (let i = 0; i < COUNT; i++) {
        batch.queueMat4TRS(positions[i], rotations[i], scales[i], (local) => {
            trsResults.push(local);
            // Chain: queue world matrix computation
            batch.queueMat4Multiply(parentMatrices[i], local, (world) => {
                worldResults.push(world);
            });
        });
    }

    // First flush (TRS)
    batch.flush();

    // Second flush (multiply with parent) - callbacks were queued
    batch.flush();

    const totalTime = performance.now() - t1;

    console.log(`  Transforms: ${COUNT}`);
    console.log(`  TRS results: ${trsResults.length}`);
    console.log(`  World matrices: ${worldResults.length}`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Per transform: ${(totalTime / COUNT).toFixed(3)}ms`);
}

console.log('');

// ========== Test 4: Animation Frame Simulation ==========
console.log('Test 4: Animation Frame Simulation');
console.log('──────────────────────────────────');
{
    const BONES = 50;
    const FRAMES = 10;

    const bonesA = Array.from({ length: BONES }, () => randomQuat());
    const bonesB = Array.from({ length: BONES }, () => randomQuat());

    batch.resetStats();
    const t1 = performance.now();

    for (let frame = 0; frame < FRAMES; frame++) {
        const t = frame / FRAMES;

        // Queue bone SLERPs
        for (let i = 0; i < BONES; i++) {
            batch.queueQuatSlerp(bonesA[i], bonesB[i], t, (r) => { dce += r[0]; });
        }

        batch.flush();
    }

    const totalTime = performance.now() - t1;
    const stats = batch.stats;

    console.log(`  Bones: ${BONES}, Frames: ${FRAMES}`);
    console.log(`  Total operations: ${stats.operationsExecuted}`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Per frame: ${(totalTime / FRAMES).toFixed(2)}ms`);
    console.log(`  Per bone SLERP: ${((totalTime / FRAMES) / BONES * 1000).toFixed(2)}µs`);
}

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                         SUMMARY                               ║');
console.log('╠═══════════════════════════════════════════════════════════════╣');
console.log('║  The WasmBatchProcessor allows:                               ║');
console.log('║  • Mixed operation types in single batch                      ║');
console.log('║  • Automatic grouping by operation type                       ║');
console.log('║  • Callback-based result distribution                         ║');
console.log('║  • Fallback to JS when WASM unavailable                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');

if (dce === 0.123456789) console.log('dce');
