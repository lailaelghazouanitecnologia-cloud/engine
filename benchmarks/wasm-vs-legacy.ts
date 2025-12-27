/**
 * WASM vs Legacy JavaScript Comparison
 *
 * Compares actual WASM execution vs pure JavaScript fallback
 *
 * Run: npx tsx benchmarks/wasm-vs-legacy.ts
 */

import { WasmBridge } from '../src/wasm/WasmBridge';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║          WASM vs LEGACY JAVASCRIPT COMPARISON                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Initialize WASM
console.log('Initializing WASM...');
await WasmBridge.init('/home/user/engine/dist/wasm/engine_core_bg.wasm');
const bridge = WasmBridge.instance;

if (bridge.usingFallback) {
    console.error('❌ WASM failed to load - cannot compare');
    process.exit(1);
}

console.log('✅ WASM Active\n');

// Get WASM module
const wasm = bridge.module;

// Pure JavaScript implementations for comparison
const legacyMath = {
    mat4_multiply: (a: Float32Array, b: Float32Array): Float32Array => {
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
    },

    batch_multiply_matrices: (a: Float32Array, b: Float32Array): Float32Array => {
        const count = a.length / 16;
        const out = new Float32Array(count * 16);
        for (let n = 0; n < count; n++) {
            const offset = n * 16;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    out[offset + i * 4 + j] =
                        a[offset + i * 4 + 0] * b[offset + 0 * 4 + j] +
                        a[offset + i * 4 + 1] * b[offset + 1 * 4 + j] +
                        a[offset + i * 4 + 2] * b[offset + 2 * 4 + j] +
                        a[offset + i * 4 + 3] * b[offset + 3 * 4 + j];
                }
            }
        }
        return out;
    },

    vec3_normalize: (x: number, y: number, z: number): Float32Array => {
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len === 0) return new Float32Array([0, 0, 0]);
        return new Float32Array([x / len, y / len, z / len]);
    },

    quat_slerp: (ax: number, ay: number, az: number, aw: number,
                 bx: number, by: number, bz: number, bw: number, t: number): Float32Array => {
        let cosom = ax * bx + ay * by + az * bz + aw * bw;
        if (cosom < 0) {
            cosom = -cosom;
            bx = -bx; by = -by; bz = -bz; bw = -bw;
        }
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
            scale0 * ax + scale1 * bx,
            scale0 * ay + scale1 * by,
            scale0 * az + scale1 * bz,
            scale0 * aw + scale1 * bw
        ]);
    }
};

function randomMatrix(): Float32Array {
    return new Float32Array(16).map(() => Math.random() * 2 - 1);
}

function randomQuat(): Float32Array {
    const q = new Float32Array(4).map(() => Math.random() * 2 - 1);
    const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return new Float32Array([q[0]/len, q[1]/len, q[2]/len, q[3]/len]);
}

let dce = 0; // Prevent dead code elimination

interface BenchResult {
    name: string;
    wasmTime: number;
    legacyTime: number;
    speedup: number;
}

const results: BenchResult[] = [];

// ========== Test 1: Single Matrix Multiply ==========
{
    const ITERATIONS = 10000;
    const matrices = Array.from({ length: ITERATIONS }, () => [randomMatrix(), randomMatrix()]);

    // Warmup
    for (let i = 0; i < 1000; i++) {
        const r = wasm.math.mat4_multiply(matrices[i % ITERATIONS][0], matrices[i % ITERATIONS][1]);
        dce += r[0];
    }

    // WASM
    const t1 = performance.now();
    for (const [a, b] of matrices) {
        const r = wasm.math.mat4_multiply(a, b);
        dce += r[0];
    }
    const wasmTime = performance.now() - t1;

    // Legacy
    const t2 = performance.now();
    for (const [a, b] of matrices) {
        const r = legacyMath.mat4_multiply(a, b);
        dce += r[0];
    }
    const legacyTime = performance.now() - t2;

    results.push({
        name: 'Matrix Multiply (single)',
        wasmTime,
        legacyTime,
        speedup: legacyTime / wasmTime
    });
}

// ========== Test 2: Batch Matrix Multiply ==========
{
    const BATCH_SIZE = 1000;
    const ITERATIONS = 100;

    // Pre-allocate batch buffers
    const batchA = new Float32Array(BATCH_SIZE * 16);
    const batchB = new Float32Array(BATCH_SIZE * 16);

    for (let i = 0; i < BATCH_SIZE; i++) {
        batchA.set(randomMatrix(), i * 16);
        batchB.set(randomMatrix(), i * 16);
    }

    // Warmup
    for (let i = 0; i < 10; i++) {
        const r = wasm.math.batch_multiply_matrices(batchA, batchB);
        dce += r[0];
    }

    // WASM Batch
    const t1 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const r = wasm.math.batch_multiply_matrices(batchA, batchB);
        dce += r[0];
    }
    const wasmTime = performance.now() - t1;

    // Legacy Batch
    const t2 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const r = legacyMath.batch_multiply_matrices(batchA, batchB);
        dce += r[0];
    }
    const legacyTime = performance.now() - t2;

    results.push({
        name: `Batch Matrix (${BATCH_SIZE}×${ITERATIONS})`,
        wasmTime,
        legacyTime,
        speedup: legacyTime / wasmTime
    });
}

// ========== Test 3: Vec3 Normalize ==========
{
    const ITERATIONS = 50000;
    const vectors = Array.from({ length: ITERATIONS }, () => [
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        Math.random() * 100 - 50
    ]);

    // Warmup
    for (let i = 0; i < 1000; i++) {
        const [x, y, z] = vectors[i % ITERATIONS];
        const r = wasm.math.vec3_normalize(x, y, z);
        dce += r[0];
    }

    // WASM
    const t1 = performance.now();
    for (const [x, y, z] of vectors) {
        const r = wasm.math.vec3_normalize(x, y, z);
        dce += r[0];
    }
    const wasmTime = performance.now() - t1;

    // Legacy
    const t2 = performance.now();
    for (const [x, y, z] of vectors) {
        const r = legacyMath.vec3_normalize(x, y, z);
        dce += r[0];
    }
    const legacyTime = performance.now() - t2;

    results.push({
        name: 'Vec3 Normalize',
        wasmTime,
        legacyTime,
        speedup: legacyTime / wasmTime
    });
}

// ========== Test 4: Quaternion SLERP ==========
{
    const ITERATIONS = 10000;
    const quats = Array.from({ length: ITERATIONS }, () => [randomQuat(), randomQuat(), Math.random()]);

    // Warmup
    for (let i = 0; i < 1000; i++) {
        const [a, b, t] = quats[i % ITERATIONS];
        const r = wasm.math.quat_slerp(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], t as number);
        dce += r[0];
    }

    // WASM
    const t1 = performance.now();
    for (const [a, b, t] of quats) {
        const q1 = a as Float32Array;
        const q2 = b as Float32Array;
        const r = wasm.math.quat_slerp(q1[0], q1[1], q1[2], q1[3], q2[0], q2[1], q2[2], q2[3], t as number);
        dce += r[0];
    }
    const wasmTime = performance.now() - t1;

    // Legacy
    const t2 = performance.now();
    for (const [a, b, t] of quats) {
        const q1 = a as Float32Array;
        const q2 = b as Float32Array;
        const r = legacyMath.quat_slerp(q1[0], q1[1], q1[2], q1[3], q2[0], q2[1], q2[2], q2[3], t as number);
        dce += r[0];
    }
    const legacyTime = performance.now() - t2;

    results.push({
        name: 'Quaternion SLERP',
        wasmTime,
        legacyTime,
        speedup: legacyTime / wasmTime
    });
}

// ========== Test 5: Batch SLERP ==========
{
    const BATCH_SIZE = 500;
    const ITERATIONS = 100;

    const quatsA = new Float32Array(BATCH_SIZE * 4);
    const quatsB = new Float32Array(BATCH_SIZE * 4);

    for (let i = 0; i < BATCH_SIZE; i++) {
        quatsA.set(randomQuat(), i * 4);
        quatsB.set(randomQuat(), i * 4);
    }

    // Warmup
    for (let i = 0; i < 10; i++) {
        const r = wasm.math.batch_slerp_quats(quatsA, quatsB, 0.5);
        dce += r[0];
    }

    // WASM Batch
    const t1 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const r = wasm.math.batch_slerp_quats(quatsA, quatsB, 0.5);
        dce += r[0];
    }
    const wasmTime = performance.now() - t1;

    // Legacy Batch (simulated)
    const t2 = performance.now();
    for (let iter = 0; iter < ITERATIONS; iter++) {
        const out = new Float32Array(BATCH_SIZE * 4);
        for (let i = 0; i < BATCH_SIZE; i++) {
            const idx = i * 4;
            const r = legacyMath.quat_slerp(
                quatsA[idx], quatsA[idx+1], quatsA[idx+2], quatsA[idx+3],
                quatsB[idx], quatsB[idx+1], quatsB[idx+2], quatsB[idx+3],
                0.5
            );
            out.set(r, idx);
        }
        dce += out[0];
    }
    const legacyTime = performance.now() - t2;

    results.push({
        name: `Batch SLERP (${BATCH_SIZE}×${ITERATIONS})`,
        wasmTime,
        legacyTime,
        speedup: legacyTime / wasmTime
    });
}

// ========== Print Results ==========
console.log('┌────────────────────────────────┬────────────┬────────────┬──────────────┐');
console.log('│ Operación                      │    WASM    │   Legacy   │   Speedup    │');
console.log('├────────────────────────────────┼────────────┼────────────┼──────────────┤');

for (const r of results) {
    const name = r.name.padEnd(30);
    const wasmStr = (r.wasmTime.toFixed(2) + 'ms').padStart(10);
    const legacyStr = (r.legacyTime.toFixed(2) + 'ms').padStart(10);
    const speedupStr = (r.speedup.toFixed(2) + 'x').padStart(12);
    const emoji = r.speedup > 1 ? '🚀' : r.speedup < 1 ? '🐢' : '➡️';
    console.log(`│ ${name} │ ${wasmStr} │ ${legacyStr} │ ${speedupStr} ${emoji}│`);
}

console.log('└────────────────────────────────┴────────────┴────────────┴──────────────┘');

// Summary
const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
const wasmWins = results.filter(r => r.speedup > 1).length;
const legacyWins = results.filter(r => r.speedup < 1).length;

console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│                              RESUMEN                                   │');
console.log('├─────────────────────────────────────────────────────────────────────────┤');
console.log(`│  WASM gana: ${wasmWins}/${results.length} tests                                                  │`);
console.log(`│  Legacy gana: ${legacyWins}/${results.length} tests                                                │`);
console.log(`│  Speedup promedio: ${avgSpeedup.toFixed(2)}x                                             │`);
console.log('├─────────────────────────────────────────────────────────────────────────┤');
if (avgSpeedup > 1.5) {
    console.log('│  ✅ WASM proporciona mejora significativa de rendimiento               │');
} else if (avgSpeedup > 1) {
    console.log('│  ⚡ WASM proporciona mejora moderada de rendimiento                    │');
} else {
    console.log('│  ⚠️  WASM no proporciona ventaja - overhead de crossing boundary       │');
}
console.log('└─────────────────────────────────────────────────────────────────────────┘');

if (dce === 0.123456789) console.log('dce'); // Prevent DCE
