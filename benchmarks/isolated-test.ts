/**
 * Isolated Benchmark: Test ONLY our Vector3
 *
 * Run with: npx tsx benchmarks/isolated-test.ts
 */

import { Vector3 } from '../src/math/Vector3';

function benchmark(name: string, fn: () => void, iterations: number = 1000000): number {
    // Heavy warmup
    for (let i = 0; i < 100000; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();
    return ((end - start) / iterations) * 1_000_000;
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║              ISOLATED TEST: Only Vector3 (no pollution)           ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const ITERATIONS = 1_000_000;

// Create all instances first
const a = new Vector3(1, 2, 3);
const b = new Vector3(4, 5, 6);
const out = new Vector3();
const c = new Vector3(10, 20, 30);

console.log('Vector3 Performance (isolated, 1M iterations):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test each operation multiple times to ensure stable JIT
const results: { name: string; times: number[] }[] = [];

const tests = [
    { name: 'add2(a, b)', fn: () => out.add2(a, b) },
    { name: 'add(b) in-place', fn: () => { a.add(b); a.x = 1; a.y = 2; a.z = 3; } },
    { name: 'sub2(a, b)', fn: () => out.sub2(a, b) },
    { name: 'sub(b) in-place', fn: () => { a.sub(b); a.x = 1; a.y = 2; a.z = 3; } },
    { name: 'dot(b)', fn: () => a.dot(b) },
    { name: 'cross(a, b)', fn: () => out.cross(a, b) },
    { name: 'normalize()', fn: () => { c.normalize(); c.x = 10; c.y = 20; c.z = 30; } },
    { name: 'lerp(a, b, 0.5)', fn: () => out.lerp(a, b, 0.5) },
    { name: 'mulScalar(2)', fn: () => { a.mulScalar(2); a.x = 1; a.y = 2; a.z = 3; } },
    { name: 'AddToRef(a, b, out)', fn: () => Vector3.AddToRef(a, b, out) },
    { name: 'CrossToRef(a, b, out)', fn: () => Vector3.CrossToRef(a, b, out) },
];

// Run 3 rounds
for (let round = 1; round <= 3; round++) {
    console.log(`Round ${round}:`);
    for (const test of tests) {
        const time = benchmark(test.name, test.fn, ITERATIONS);
        let entry = results.find(r => r.name === test.name);
        if (!entry) {
            entry = { name: test.name, times: [] };
            results.push(entry);
        }
        entry.times.push(time);
        console.log(`  ${test.name.padEnd(25)} ${time.toFixed(2)} ns`);
    }
    console.log('');
}

// Print averages
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('AVERAGE (excluding round 1 for JIT warmup):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const r of results) {
    // Average of rounds 2 and 3
    const avg = (r.times[1] + r.times[2]) / 2;
    console.log(`${r.name.padEnd(25)} │ ${avg.toFixed(2)} ns`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('COMPARISON WITH LEGACY (expected ~6-7ns for basic ops):');
console.log('If results are ~6-7ns, performance is EQUAL to Legacy');
console.log('The 1.9ns result in fair-comparison is JIT pollution artifact');
