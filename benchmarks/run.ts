/**
 * Benchmark Runner
 *
 * Run with: npx tsx benchmarks/run.ts
 */

import { BenchmarkSuite } from './BenchmarkSuite';

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          ENGINE BENCHMARK: LEGACY vs NEW vs WASM              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const suite = new BenchmarkSuite();
    await suite.runAll();
    suite.printResults();

    // Save results
    const results = suite.getResults();
    console.log('\n\n📈 ANALYSIS:\n');

    // Calculate overall performance
    let legacyTotal = 0;
    let tsTotal = 0;
    let wasmBatchTotal = 0;
    let legacyCount = 0;
    let tsCount = 0;
    let wasmBatchCount = 0;

    for (const result of results.results) {
        if (result.implementation === 'legacy') {
            legacyTotal += result.avgTimeNs;
            legacyCount++;
        } else if (result.implementation === 'typescript') {
            tsTotal += result.avgTimeNs;
            tsCount++;
        } else if (result.implementation === 'wasm-batch') {
            wasmBatchTotal += result.avgTimeNs;
            wasmBatchCount++;
        }
    }

    const legacyAvg = legacyTotal / legacyCount;
    const tsAvg = tsTotal / tsCount;
    const wasmBatchAvg = wasmBatchCount > 0 ? wasmBatchTotal / wasmBatchCount : 0;

    console.log('Average time per operation:');
    console.log(`  Legacy:     ${legacyAvg.toFixed(2)} ns`);
    console.log(`  TypeScript: ${tsAvg.toFixed(2)} ns`);
    if (wasmBatchCount > 0) {
        console.log(`  WASM Batch: ${wasmBatchAvg.toFixed(2)} ns`);
    }

    console.log('\nRelative performance (vs Legacy):');
    console.log(`  TypeScript: ${(legacyAvg / tsAvg).toFixed(2)}x`);
    if (wasmBatchCount > 0) {
        console.log(`  WASM Batch: ${(legacyAvg / wasmBatchAvg).toFixed(2)}x`);
    }

    // Conclusion
    console.log('\n\n📋 CONCLUSIONS:\n');

    const tsDiff = Math.abs((tsAvg - legacyAvg) / legacyAvg * 100);

    if (tsDiff < 5) {
        console.log('✅ TypeScript and Legacy have SIMILAR performance (<5% difference)');
        console.log('   → We can create a common abstraction layer');
        console.log('   → Math operations are equally fast in both');
    } else if (tsAvg < legacyAvg) {
        console.log(`✅ TypeScript is ${(legacyAvg / tsAvg).toFixed(2)}x FASTER than Legacy`);
    } else {
        console.log(`⚠️  Legacy is ${(tsAvg / legacyAvg).toFixed(2)}x faster than TypeScript`);
    }

    if (wasmBatchCount > 0) {
        console.log('\n🔧 WASM Batch Analysis:');
        console.log('   Batch processing shows benefit when:');
        console.log('   - Operations > 8 (overhead vs single call)');
        console.log('   - CPU-bound operations (matrix chains, skinning)');
        console.log('   - Memory access patterns are sequential');
    }

    console.log('\n✨ RECOMMENDATIONS:\n');
    console.log('1. Use TypeScript for standard math operations (no WASM overhead)');
    console.log('2. Use WASM batch for 10+ similar operations');
    console.log('3. Critical paths: Matrix chains, animation blending, particle updates');
    console.log('4. Create abstraction with automatic backend selection');
}

main().catch(console.error);
