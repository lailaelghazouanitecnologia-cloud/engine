/**
 * Diagnostic V2: Test order independence
 *
 * Run with: npx tsx benchmarks/diagnose-v2.ts
 */

// Minimal class
class MinimalVec3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    add2(lhs: MinimalVec3, rhs: MinimalVec3): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

// With getters
class VecWithGetters {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    get magnitude(): number { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    get sqrMagnitude(): number { return this.x * this.x + this.y * this.y + this.z * this.z; }
    add2(lhs: VecWithGetters, rhs: VecWithGetters): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

function benchmark(name: string, fn: () => void, iterations: number = 1000000): number {
    // Heavy warmup
    for (let i = 0; i < 50000; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();
    return ((end - start) / iterations) * 1_000_000;
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║           DIAGNOSTIC V2: Order Independence Test                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const ITERATIONS = 1_000_000;

// Create instances BEFORE any benchmarks
const minA = new MinimalVec3(1, 2, 3);
const minB = new MinimalVec3(4, 5, 6);
const minOut = new MinimalVec3();

const getA = new VecWithGetters(1, 2, 3);
const getB = new VecWithGetters(4, 5, 6);
const getOut = new VecWithGetters();

console.log('Round 1: Minimal first, then Getters');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
{
    const t1 = benchmark('Minimal', () => minOut.add2(minA, minB), ITERATIONS);
    const t2 = benchmark('Getters', () => getOut.add2(getA, getB), ITERATIONS);
    console.log(`  Minimal: ${t1.toFixed(2)} ns`);
    console.log(`  Getters: ${t2.toFixed(2)} ns (${(t2/t1).toFixed(2)}x)`);
}

console.log('\nRound 2: Getters first, then Minimal');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
{
    const t2 = benchmark('Getters', () => getOut.add2(getA, getB), ITERATIONS);
    const t1 = benchmark('Minimal', () => minOut.add2(minA, minB), ITERATIONS);
    console.log(`  Getters: ${t2.toFixed(2)} ns`);
    console.log(`  Minimal: ${t1.toFixed(2)} ns (${(t1/t2).toFixed(2)}x)`);
}

console.log('\nRound 3: Interleaved (warm JIT)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
{
    // Extra warmup for both
    for (let i = 0; i < 100000; i++) {
        minOut.add2(minA, minB);
        getOut.add2(getA, getB);
    }

    const t1 = benchmark('Minimal', () => minOut.add2(minA, minB), ITERATIONS);
    const t2 = benchmark('Getters', () => getOut.add2(getA, getB), ITERATIONS);
    console.log(`  Minimal: ${t1.toFixed(2)} ns`);
    console.log(`  Getters: ${t2.toFixed(2)} ns (${(t2/t1).toFixed(2)}x)`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ANALYSIS:');
console.log('If Getters is always slower, the issue is real.');
console.log('If results vary by order, JIT behavior differs.');
