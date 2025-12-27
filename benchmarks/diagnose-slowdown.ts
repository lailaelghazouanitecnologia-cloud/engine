/**
 * Diagnostic Benchmark: Why is Vector3.add2 slower?
 *
 * Tests different class configurations to identify the performance issue.
 *
 * Run with: npx tsx benchmarks/diagnose-slowdown.ts
 */

// ==================== Test Classes ====================

// 1. Minimal class (like Legacy)
class MinimalVec3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add2(lhs: MinimalVec3, rhs: MinimalVec3): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

// 2. Class with getters (potential deopt)
class VecWithGetters {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    get sqrMagnitude(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    add2(lhs: VecWithGetters, rhs: VecWithGetters): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

// 3. Class with static frozen properties
class VecWithStatics {
    x: number;
    y: number;
    z: number;

    static readonly zero = Object.freeze(new VecWithStatics(0, 0, 0));
    static readonly one = Object.freeze(new VecWithStatics(1, 1, 1));

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add2(lhs: VecWithStatics, rhs: VecWithStatics): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }
}

// 4. Class with many methods (hidden class size)
class VecManyMethods {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add2(lhs: VecManyMethods, rhs: VecManyMethods): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }

    // Add many dummy methods
    method1(): this { return this; }
    method2(): this { return this; }
    method3(): this { return this; }
    method4(): this { return this; }
    method5(): this { return this; }
    method6(): this { return this; }
    method7(): this { return this; }
    method8(): this { return this; }
    method9(): this { return this; }
    method10(): this { return this; }
    method11(): this { return this; }
    method12(): this { return this; }
    method13(): this { return this; }
    method14(): this { return this; }
    method15(): this { return this; }
    method16(): this { return this; }
    method17(): this { return this; }
    method18(): this { return this; }
    method19(): this { return this; }
    method20(): this { return this; }
    method21(): this { return this; }
    method22(): this { return this; }
    method23(): this { return this; }
    method24(): this { return this; }
    method25(): this { return this; }
    method26(): this { return this; }
    method27(): this { return this; }
    method28(): this { return this; }
    method29(): this { return this; }
    method30(): this { return this; }
}

// 5. Full Vector3 (all features)
class VecFull {
    x: number;
    y: number;
    z: number;

    static readonly zero = Object.freeze(new VecFull(0, 0, 0));
    static readonly one = Object.freeze(new VecFull(1, 1, 1));

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    get sqrMagnitude(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    add2(lhs: VecFull, rhs: VecFull): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }

    // Add many methods like real Vector3
    add(rhs: VecFull): this { this.x += rhs.x; this.y += rhs.y; this.z += rhs.z; return this; }
    sub(rhs: VecFull): this { this.x -= rhs.x; this.y -= rhs.y; this.z -= rhs.z; return this; }
    mul(rhs: VecFull): this { this.x *= rhs.x; this.y *= rhs.y; this.z *= rhs.z; return this; }
    mulScalar(s: number): this { this.x *= s; this.y *= s; this.z *= s; return this; }
    normalize(): this {
        const len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
        if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
        return this;
    }
    dot(rhs: VecFull): number { return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z; }
    cross(lhs: VecFull, rhs: VecFull): this {
        const lx = lhs.x, ly = lhs.y, lz = lhs.z;
        const rx = rhs.x, ry = rhs.y, rz = rhs.z;
        this.x = ly * rz - ry * lz;
        this.y = lz * rx - rz * lx;
        this.z = lx * ry - rx * ly;
        return this;
    }
}

// 6. Plain object (no class)
function createPlainVec(x = 0, y = 0, z = 0) {
    return { x, y, z };
}

function plainAdd2(out: {x: number, y: number, z: number},
                   lhs: {x: number, y: number, z: number},
                   rhs: {x: number, y: number, z: number}) {
    out.x = lhs.x + rhs.x;
    out.y = lhs.y + rhs.y;
    out.z = lhs.z + rhs.z;
    return out;
}

// ==================== Benchmark ====================

function benchmark(name: string, fn: () => void, iterations: number = 1000000): number {
    // Warmup
    for (let i = 0; i < 10000; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();

    return ((end - start) / iterations) * 1_000_000;
}

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    DIAGNOSTIC: Why is add2 slower?                            ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

const ITERATIONS = 1_000_000;

// Test each configuration
const results: { name: string; time: number }[] = [];

// 1. Minimal
{
    const a = new MinimalVec3(1, 2, 3);
    const b = new MinimalVec3(4, 5, 6);
    const out = new MinimalVec3();
    const time = benchmark('Minimal', () => out.add2(a, b), ITERATIONS);
    results.push({ name: 'Minimal (like Legacy)', time });
}

// 2. With Getters
{
    const a = new VecWithGetters(1, 2, 3);
    const b = new VecWithGetters(4, 5, 6);
    const out = new VecWithGetters();
    const time = benchmark('With Getters', () => out.add2(a, b), ITERATIONS);
    results.push({ name: 'With Getters', time });
}

// 3. With Static Frozen
{
    const a = new VecWithStatics(1, 2, 3);
    const b = new VecWithStatics(4, 5, 6);
    const out = new VecWithStatics();
    const time = benchmark('With Statics', () => out.add2(a, b), ITERATIONS);
    results.push({ name: 'With Static Frozen', time });
}

// 4. Many Methods
{
    const a = new VecManyMethods(1, 2, 3);
    const b = new VecManyMethods(4, 5, 6);
    const out = new VecManyMethods();
    const time = benchmark('Many Methods', () => out.add2(a, b), ITERATIONS);
    results.push({ name: 'Many Methods (30+)', time });
}

// 5. Full (all features)
{
    const a = new VecFull(1, 2, 3);
    const b = new VecFull(4, 5, 6);
    const out = new VecFull();
    const time = benchmark('Full', () => out.add2(a, b), ITERATIONS);
    results.push({ name: 'Full (getters+statics+methods)', time });
}

// 6. Plain object
{
    const a = createPlainVec(1, 2, 3);
    const b = createPlainVec(4, 5, 6);
    const out = createPlainVec();
    const time = benchmark('Plain Object', () => plainAdd2(out, a, b), ITERATIONS);
    results.push({ name: 'Plain Object (no class)', time });
}

// Print results
console.log('Results (add2 operation, 1M iterations):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const baseline = results[0].time;
for (const r of results) {
    const ratio = r.time / baseline;
    const status = ratio > 1.5 ? '❌ SLOW' : ratio > 1.1 ? '⚠️  SLOWER' : '✅ OK';
    console.log(`${r.name.padEnd(35)} │ ${r.time.toFixed(2).padStart(8)} ns │ ${ratio.toFixed(2)}x │ ${status}`);
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ANALYSIS:\n');

const getterOverhead = results[1].time - baseline;
const staticOverhead = results[2].time - baseline;
const methodsOverhead = results[3].time - baseline;
const fullOverhead = results[4].time - baseline;

console.log(`Getters overhead:        ${getterOverhead > 0.5 ? '❌' : '✅'} ${getterOverhead.toFixed(2)} ns`);
console.log(`Static frozen overhead:  ${staticOverhead > 0.5 ? '❌' : '✅'} ${staticOverhead.toFixed(2)} ns`);
console.log(`Many methods overhead:   ${methodsOverhead > 0.5 ? '❌' : '✅'} ${methodsOverhead.toFixed(2)} ns`);
console.log(`Full class overhead:     ${fullOverhead > 0.5 ? '❌' : '✅'} ${fullOverhead.toFixed(2)} ns`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RECOMMENDATIONS:\n');

if (getterOverhead > 0.5) {
    console.log('⚠️  GETTERS cause slowdown - consider removing or lazy-loading');
}
if (staticOverhead > 0.5) {
    console.log('⚠️  STATIC FROZEN properties cause slowdown - consider lazy initialization');
}
if (methodsOverhead > 0.5) {
    console.log('⚠️  TOO MANY METHODS affect hidden class size - consider splitting');
}
if (fullOverhead < 1) {
    console.log('✅ Class complexity is NOT the issue - look elsewhere');
}
