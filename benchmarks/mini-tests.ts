/**
 * Mini-Tests: Mutation vs Object Creation Performance
 *
 * Run with: npx tsx benchmarks/mini-tests.ts
 */

// Simple test vectors
class Vec3Mutable {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // IN-PLACE mutation (Legacy style)
    add(rhs: Vec3Mutable): this {
        this.x += rhs.x;
        this.y += rhs.y;
        this.z += rhs.z;
        return this;
    }

    normalize(): this {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0) {
            const inv = 1 / len;
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
        }
        return this;
    }

    cross(lhs: Vec3Mutable, rhs: Vec3Mutable): this {
        const lx = lhs.x, ly = lhs.y, lz = lhs.z;
        const rx = rhs.x, ry = rhs.y, rz = rhs.z;
        this.x = ly * rz - ry * lz;
        this.y = lz * rx - rz * lx;
        this.z = lx * ry - rx * ly;
        return this;
    }
}

class Vec3Immutable {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // NEW OBJECT creation (our current style)
    add(rhs: Vec3Immutable): Vec3Immutable {
        return new Vec3Immutable(
            this.x + rhs.x,
            this.y + rhs.y,
            this.z + rhs.z
        );
    }

    get normalized(): Vec3Immutable {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0) {
            const inv = 1 / len;
            return new Vec3Immutable(this.x * inv, this.y * inv, this.z * inv);
        }
        return new Vec3Immutable(0, 0, 0);
    }

    static cross(a: Vec3Immutable, b: Vec3Immutable): Vec3Immutable {
        return new Vec3Immutable(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }
}

// Float32Array based (zero allocation after setup)
class Vec3Buffer {
    private static readonly POOL_SIZE = 1000;
    private static pool = new Float32Array(Vec3Buffer.POOL_SIZE * 3);
    private static nextIndex = 0;

    static add(out: Float32Array, outOffset: number, a: Float32Array, aOffset: number, b: Float32Array, bOffset: number): void {
        out[outOffset] = a[aOffset] + b[bOffset];
        out[outOffset + 1] = a[aOffset + 1] + b[bOffset + 1];
        out[outOffset + 2] = a[aOffset + 2] + b[bOffset + 2];
    }

    static normalize(out: Float32Array, offset: number): void {
        const x = out[offset], y = out[offset + 1], z = out[offset + 2];
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0) {
            const inv = 1 / len;
            out[offset] *= inv;
            out[offset + 1] *= inv;
            out[offset + 2] *= inv;
        }
    }

    static cross(out: Float32Array, outOffset: number, a: Float32Array, aOffset: number, b: Float32Array, bOffset: number): void {
        const ax = a[aOffset], ay = a[aOffset + 1], az = a[aOffset + 2];
        const bx = b[bOffset], by = b[bOffset + 1], bz = b[bOffset + 2];
        out[outOffset] = ay * bz - az * by;
        out[outOffset + 1] = az * bx - ax * bz;
        out[outOffset + 2] = ax * by - ay * bx;
    }
}

// Benchmark utilities
function benchmark(name: string, fn: () => void, iterations: number = 100000): number {
    // Warmup
    for (let i = 0; i < 1000; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();

    const totalMs = end - start;
    const avgNs = (totalMs / iterations) * 1_000_000;
    return avgNs;
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     MINI-TEST: Mutation vs Object Creation Performance       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const ITERATIONS = 1_000_000;

// ==================== TEST 1: Vector Addition ====================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Vector Addition (1M iterations)\n');

// Mutable (in-place)
const mutA = new Vec3Mutable(1, 2, 3);
const mutB = new Vec3Mutable(4, 5, 6);
const mutableAddTime = benchmark('Mutable Add', () => {
    mutA.add(mutB);
    // Reset to prevent drift
    mutA.x = 1; mutA.y = 2; mutA.z = 3;
}, ITERATIONS);

// Immutable (new object)
const immA = new Vec3Immutable(1, 2, 3);
const immB = new Vec3Immutable(4, 5, 6);
let immResult: Vec3Immutable;
const immutableAddTime = benchmark('Immutable Add', () => {
    immResult = immA.add(immB);
}, ITERATIONS);

// Buffer based (zero allocation)
const bufferA = new Float32Array([1, 2, 3]);
const bufferB = new Float32Array([4, 5, 6]);
const bufferOut = new Float32Array(3);
const bufferAddTime = benchmark('Buffer Add', () => {
    Vec3Buffer.add(bufferOut, 0, bufferA, 0, bufferB, 0);
}, ITERATIONS);

console.log(`  Mutable (in-place):  ${mutableAddTime.toFixed(2)} ns`);
console.log(`  Immutable (new obj): ${immutableAddTime.toFixed(2)} ns`);
console.log(`  Buffer (Float32):    ${bufferAddTime.toFixed(2)} ns`);
console.log(`\n  → Immutable is ${(immutableAddTime / mutableAddTime).toFixed(2)}x SLOWER than Mutable`);
console.log(`  → Buffer is ${(mutableAddTime / bufferAddTime).toFixed(2)}x faster than Mutable`);

// ==================== TEST 2: Normalize ====================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Vector Normalize (1M iterations)\n');

const mutN = new Vec3Mutable(3, 4, 5);
const mutableNormTime = benchmark('Mutable Normalize', () => {
    mutN.normalize();
    mutN.x = 3; mutN.y = 4; mutN.z = 5;
}, ITERATIONS);

const immN = new Vec3Immutable(3, 4, 5);
let normResult: Vec3Immutable;
const immutableNormTime = benchmark('Immutable Normalize', () => {
    normResult = immN.normalized;
}, ITERATIONS);

const bufN = new Float32Array([3, 4, 5]);
const bufferNormTime = benchmark('Buffer Normalize', () => {
    Vec3Buffer.normalize(bufN, 0);
    bufN[0] = 3; bufN[1] = 4; bufN[2] = 5;
}, ITERATIONS);

console.log(`  Mutable (in-place):  ${mutableNormTime.toFixed(2)} ns`);
console.log(`  Immutable (new obj): ${immutableNormTime.toFixed(2)} ns`);
console.log(`  Buffer (Float32):    ${bufferNormTime.toFixed(2)} ns`);
console.log(`\n  → Immutable is ${(immutableNormTime / mutableNormTime).toFixed(2)}x SLOWER than Mutable`);

// ==================== TEST 3: Cross Product ====================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: Cross Product (1M iterations)\n');

const mutC1 = new Vec3Mutable(1, 0, 0);
const mutC2 = new Vec3Mutable(0, 1, 0);
const mutCOut = new Vec3Mutable();
const mutableCrossTime = benchmark('Mutable Cross', () => {
    mutCOut.cross(mutC1, mutC2);
}, ITERATIONS);

const immC1 = new Vec3Immutable(1, 0, 0);
const immC2 = new Vec3Immutable(0, 1, 0);
let crossResult: Vec3Immutable;
const immutableCrossTime = benchmark('Immutable Cross', () => {
    crossResult = Vec3Immutable.cross(immC1, immC2);
}, ITERATIONS);

const bufC1 = new Float32Array([1, 0, 0]);
const bufC2 = new Float32Array([0, 1, 0]);
const bufCOut = new Float32Array(3);
const bufferCrossTime = benchmark('Buffer Cross', () => {
    Vec3Buffer.cross(bufCOut, 0, bufC1, 0, bufC2, 0);
}, ITERATIONS);

console.log(`  Mutable (in-place):  ${mutableCrossTime.toFixed(2)} ns`);
console.log(`  Immutable (new obj): ${immutableCrossTime.toFixed(2)} ns`);
console.log(`  Buffer (Float32):    ${bufferCrossTime.toFixed(2)} ns`);
console.log(`\n  → Immutable is ${(immutableCrossTime / mutableCrossTime).toFixed(2)}x SLOWER than Mutable`);

// ==================== TEST 4: Chain Operations ====================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: Chained Operations (add + normalize + add) - 100K iterations\n');

const CHAIN_ITERATIONS = 100_000;

// Mutable chain
const chainMutA = new Vec3Mutable(1, 2, 3);
const chainMutB = new Vec3Mutable(4, 5, 6);
const chainMutC = new Vec3Mutable(7, 8, 9);
const mutableChainTime = benchmark('Mutable Chain', () => {
    chainMutA.add(chainMutB).normalize().add(chainMutC);
    chainMutA.x = 1; chainMutA.y = 2; chainMutA.z = 3;
}, CHAIN_ITERATIONS);

// Immutable chain (creates 3 objects per iteration!)
const chainImmA = new Vec3Immutable(1, 2, 3);
const chainImmB = new Vec3Immutable(4, 5, 6);
const chainImmC = new Vec3Immutable(7, 8, 9);
let chainResult: Vec3Immutable;
const immutableChainTime = benchmark('Immutable Chain', () => {
    chainResult = chainImmA.add(chainImmB).normalized.add(chainImmC);
}, CHAIN_ITERATIONS);

console.log(`  Mutable (in-place):  ${mutableChainTime.toFixed(2)} ns`);
console.log(`  Immutable (new obj): ${immutableChainTime.toFixed(2)} ns`);
console.log(`\n  → Immutable is ${(immutableChainTime / mutableChainTime).toFixed(2)}x SLOWER for chains`);
console.log(`  → 3 objects created per iteration = 300K allocations!`);

// ==================== CONCLUSION ====================
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                       CONCLUSIONS                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const avgSlowdown = (
    (immutableAddTime / mutableAddTime) +
    (immutableNormTime / mutableNormTime) +
    (immutableCrossTime / mutableCrossTime)
) / 3;

console.log(`Average slowdown from object creation: ${avgSlowdown.toFixed(2)}x\n`);

console.log('RECOMMENDATIONS:');
console.log('1. Add in-place methods to Vector3: add(), sub(), mul(), normalize()');
console.log('2. Keep static methods that return new objects for convenience');
console.log('3. Use in-place for hot paths (game loop, physics, animation)');
console.log('4. Use Float32Array buffers for batch operations');
console.log('5. Consider object pooling for temporary vectors');

console.log('\nAPI DESIGN:');
console.log('  v.add(other)          → mutates v, returns v (for chaining)');
console.log('  Vector3.Add(a, b)     → returns new Vector3 (convenience)');
console.log('  v.addToRef(other, out) → writes to out, returns out (zero alloc)');
