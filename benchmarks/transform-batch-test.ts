/**
 * TransformBatchUpdater Test
 *
 * Run: npx tsx benchmarks/transform-batch-test.ts
 */

import { WasmBridge } from '../src/wasm/WasmBridge';
import { WasmBatchProcessor } from '../src/wasm/WasmBatchProcessor';
import { TransformBatchUpdater } from '../src/core/TransformBatchUpdater';
import { Transform } from '../src/core/Transform';
import { Vector3 } from '../src/math/Vector3';
import { Quaternion } from '../src/math/Quaternion';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║        TRANSFORM BATCH UPDATER TEST                          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Initialize WASM
console.log('Initializing WASM...');
await WasmBridge.init('/home/user/engine/dist/wasm/engine_core_bg.wasm');
const bridge = WasmBridge.instance;
console.log('WASM Status:', bridge.usingFallback ? '⚠️ JS Fallback' : '✅ WASM Active');

// Initialize batch processor and transform batch updater
await WasmBatchProcessor.instance.init();
await TransformBatchUpdater.instance.init();
console.log('');

// Create test hierarchy
function createTransformHierarchy(depth: number, childrenPerLevel: number): Transform[] {
    const transforms: Transform[] = [];

    function createLevel(parent: Transform | null, currentDepth: number) {
        if (currentDepth >= depth) return;

        for (let i = 0; i < childrenPerLevel; i++) {
            const t = new Transform();
            t.localPosition = new Vector3(
                Math.random() * 10,
                Math.random() * 10,
                Math.random() * 10
            );
            t.localRotation = Quaternion.euler(
                Math.random() * 360,
                Math.random() * 360,
                Math.random() * 360
            );
            t.localScale = new Vector3(1, 1, 1);

            if (parent) {
                t.parent = parent;
            }

            transforms.push(t);
            createLevel(t, currentDepth + 1);
        }
    }

    createLevel(null, 0);
    return transforms;
}

// ========== Test 1: Small hierarchy (should use JS) ==========
console.log('Test 1: Small Hierarchy (< 4 transforms)');
console.log('───────────────────────────────────────');
{
    const transforms = createTransformHierarchy(1, 3); // 3 transforms
    console.log(`  Created ${transforms.length} transforms`);

    const updater = TransformBatchUpdater.instance;
    updater.resetStats();

    const collected = updater.collectDirty(transforms);
    console.log(`  Collected ${collected} dirty transforms`);

    updater.updateAll();

    const stats = updater.stats;
    console.log(`  WASM used: ${stats.wasmUsed ? 'Yes' : 'No (JS faster for small counts)'}`);
    console.log(`  Time: ${stats.lastUpdateTimeMs.toFixed(3)}ms`);
}
console.log('');

// ========== Test 2: Medium hierarchy (should use WASM) ==========
console.log('Test 2: Medium Hierarchy (100 transforms)');
console.log('────────────────────────────────────────');
{
    const transforms = createTransformHierarchy(3, 4); // ~21 transforms
    console.log(`  Created ${transforms.length} transforms`);

    const updater = TransformBatchUpdater.instance;
    updater.resetStats();

    // Mark all dirty by modifying position
    for (const t of transforms) {
        t.localPosition = new Vector3(
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10
        );
    }

    const collected = updater.collectDirty(transforms);
    console.log(`  Collected ${collected} dirty transforms`);

    updater.updateAll();

    const stats = updater.stats;
    console.log(`  WASM used: ${stats.wasmUsed ? 'Yes' : 'No'}`);
    console.log(`  Batches executed: ${stats.batchesExecuted}`);
    console.log(`  Time: ${stats.lastUpdateTimeMs.toFixed(3)}ms`);

    // Verify matrices are computed
    const sample = transforms[0];
    const worldPos = sample.position;
    console.log(`  Sample world pos: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
}
console.log('');

// ========== Test 3: Large hierarchy performance ==========
console.log('Test 3: Large Hierarchy Performance');
console.log('────────────────────────────────────');
{
    const transforms = createTransformHierarchy(5, 3); // ~364 transforms
    console.log(`  Created ${transforms.length} transforms`);

    const updater = TransformBatchUpdater.instance;

    // Benchmark individual updates
    for (const t of transforms) {
        t.localPosition = new Vector3(Math.random(), Math.random(), Math.random());
    }

    const t1 = performance.now();
    for (const t of transforms) {
        // Force individual update via property access
        const _ = t.localToWorldMatrix;
    }
    const individualTime = performance.now() - t1;

    // Reset and benchmark batch updates
    for (const t of transforms) {
        t.localPosition = new Vector3(Math.random(), Math.random(), Math.random());
    }

    updater.resetStats();
    const t2 = performance.now();
    updater.collectDirty(transforms);
    updater.updateAll();
    const batchTime = performance.now() - t2;

    const stats = updater.stats;
    console.log(`  Individual update: ${individualTime.toFixed(2)}ms`);
    console.log(`  Batch update: ${batchTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${(individualTime / batchTime).toFixed(2)}x`);
    console.log(`  WASM used: ${stats.wasmUsed ? 'Yes' : 'No'}`);
}
console.log('');

// ========== Test 4: Animation simulation (multiple frames) ==========
console.log('Test 4: Animation Simulation (10 frames)');
console.log('─────────────────────────────────────────');
{
    const transforms = createTransformHierarchy(4, 4); // ~340 transforms
    console.log(`  Created ${transforms.length} transforms`);

    const FRAMES = 10;
    const updater = TransformBatchUpdater.instance;
    let totalTime = 0;

    for (let frame = 0; frame < FRAMES; frame++) {
        // Simulate animation: rotate all transforms slightly
        for (const t of transforms) {
            const current = t.localRotation;
            t.localRotation = current.multiply(Quaternion.euler(1, 0, 0));
        }

        updater.resetStats();
        const frameStart = performance.now();
        updater.collectDirty(transforms);
        updater.updateAll();
        totalTime += performance.now() - frameStart;
    }

    console.log(`  Frames: ${FRAMES}`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Per frame: ${(totalTime / FRAMES).toFixed(2)}ms`);
    console.log(`  Per transform per frame: ${((totalTime / FRAMES) / transforms.length * 1000).toFixed(2)}µs`);
}

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                         COMPLETE                              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
