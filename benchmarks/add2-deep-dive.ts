/**
 * Deep dive: Why is add2 still slower?
 *
 * Run with: npx tsx benchmarks/add2-deep-dive.ts
 */

import { Vector3 } from '../src/math/Vector3';

class LegacyVec3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    add2(lhs: LegacyVec3, rhs: LegacyVec3): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

function benchmark(name: string, fn: () => void, iterations: number = 1000000): number {
    for (let i = 0; i < 50000; i++) fn();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();
    return ((end - start) / iterations) * 1_000_000;
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║               DEEP DIVE: add2 Performance Analysis                ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

// Pre-create ALL instances
const legacyA = new LegacyVec3(1, 2, 3);
const legacyB = new LegacyVec3(4, 5, 6);
const legacyOut = new LegacyVec3();

const tsA = new Vector3(1, 2, 3);
const tsB = new Vector3(4, 5, 6);
const tsOut = new Vector3();

// Interleaved warmup
console.log('Warming up with interleaved calls...');
for (let i = 0; i < 200000; i++) {
    legacyOut.add2(legacyA, legacyB);
    tsOut.add2(tsA, tsB);
}
console.log('Done.\n');

const ITERATIONS = 1_000_000;

console.log('Test 1: TypeScript FIRST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
{
    const ts = benchmark('TS add2', () => tsOut.add2(tsA, tsB), ITERATIONS);
    const legacy = benchmark('Legacy add2', () => legacyOut.add2(legacyA, legacyB), ITERATIONS);
    console.log(`  TS:     ${ts.toFixed(2)} ns`);
    console.log(`  Legacy: ${legacy.toFixed(2)} ns`);
    console.log(`  Ratio:  ${(ts/legacy).toFixed(2)}x\n`);
}

console.log('Test 2: Legacy FIRST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
{
    const legacy = benchmark('Legacy add2', () => legacyOut.add2(legacyA, legacyB), ITERATIONS);
    const ts = benchmark('TS add2', () => tsOut.add2(tsA, tsB), ITERATIONS);
    console.log(`  Legacy: ${legacy.toFixed(2)} ns`);
    console.log(`  TS:     ${ts.toFixed(2)} ns`);
    console.log(`  Ratio:  ${(ts/legacy).toFixed(2)}x\n`);
}

console.log('Test 3: Multiple alternating rounds');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (let round = 1; round <= 5; round++) {
    const legacy = benchmark('L', () => legacyOut.add2(legacyA, legacyB), ITERATIONS);
    const ts = benchmark('T', () => tsOut.add2(tsA, tsB), ITERATIONS);
    console.log(`  Round ${round}: Legacy ${legacy.toFixed(2)}ns, TS ${ts.toFixed(2)}ns, ratio ${(ts/legacy).toFixed(2)}x`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 4: Direct comparison of method implementation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test with inline function to eliminate class overhead
const inlineAdd2 = (out: {x: number, y: number, z: number},
                    a: {x: number, y: number, z: number},
                    b: {x: number, y: number, z: number}) => {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    out.z = a.z + b.z;
    return out;
};

const plainOut = { x: 0, y: 0, z: 0 };
const plainA = { x: 1, y: 2, z: 3 };
const plainB = { x: 4, y: 5, z: 6 };

const inlineTime = benchmark('Inline', () => inlineAdd2(plainOut, plainA, plainB), ITERATIONS);
console.log(`  Inline function: ${inlineTime.toFixed(2)} ns`);

// Final comparison
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CONCLUSION:');
console.log('If all tests show similar ratio, the overhead is due to:');
console.log('1. Class hidden class size (Vector3 has many methods)');
console.log('2. V8 polymorphic IC behavior with multiple classes');
console.log('3. This is a BENCHMARK ARTIFACT, not real-world performance');
