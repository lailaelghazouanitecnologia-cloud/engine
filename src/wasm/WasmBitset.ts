/**
 * WASM Bitset Operations
 *
 * High-performance bitset operations optimized for WASM.
 * Used by DirtyTracker for efficient dirty flag management.
 *
 * PERFORMANCE RULES (following MathBackend rules):
 * - RULE 1: Single operations (1 word) → Always JavaScript
 * - RULE 2: Small bitsets (<10 words, <320 entities) → Always JavaScript
 * - RULE 3: Medium bitsets (10-999 words) → Use WASM if available
 * - RULE 4: Large bitsets (1000+ words) → WASM mandatory
 *
 * Why WASM for Bitset Operations:
 * 1. Population count (popcnt) - native CPU instruction in WASM
 * 2. Bulk bitwise operations - SIMD-friendly
 * 3. Index extraction - no JS object allocation overhead
 * 4. Parent propagation - tight loop with no GC pressure
 */

import { WasmBridge } from './WasmBridge';

/** Threshold for switching to WASM (in words, not bits) */
const WASM_THRESHOLD_WORDS = 10; // 320 bits / entities

/**
 * Population count lookup table for fallback (Brian Kernighan optimization)
 */
function popcount32(n: number): number {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    return ((n + (n >>> 4) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * WasmBitset - Static utility class for high-performance bitset operations
 */
export class WasmBitset {
    /**
     * Count total set bits in a Uint32Array (population count)
     * Uses native popcnt instruction via WASM when available
     */
    static popcount(words: Uint32Array): number {
        // RULE 2: Small arrays → JavaScript
        if (words.length < WASM_THRESHOLD_WORDS) {
            return this._popcountJS(words);
        }

        // RULE 3/4: Medium/Large → Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.popcount) {
            return bridge.module.bitset.popcount(words);
        }

        return this._popcountJS(words);
    }

    /**
     * JavaScript fallback for popcount
     */
    private static _popcountJS(words: Uint32Array): number {
        let count = 0;
        for (let i = 0; i < words.length; i++) {
            count += popcount32(words[i]);
        }
        return count;
    }

    /**
     * Get indices of all set bits
     * Returns array of indices where bits are 1
     */
    static getSetIndices(words: Uint32Array): number[] {
        // RULE 2: Small arrays → JavaScript
        if (words.length < WASM_THRESHOLD_WORDS) {
            return this._getSetIndicesJS(words);
        }

        // RULE 3/4: Medium/Large → Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.getSetIndices) {
            const result = bridge.module.bitset.getSetIndices(words);
            return Array.from(result);
        }

        return this._getSetIndicesJS(words);
    }

    /**
     * JavaScript fallback for getSetIndices
     * Uses bit manipulation tricks for efficiency
     */
    private static _getSetIndicesJS(words: Uint32Array): number[] {
        const indices: number[] = [];
        const BITS_PER_WORD = 32;

        for (let w = 0; w < words.length; w++) {
            let word = words[w];
            if (word === 0) continue;

            const baseIndex = w * BITS_PER_WORD;

            // Extract set bits using Brian Kernighan's algorithm
            while (word !== 0) {
                // Isolate lowest set bit
                const bit = word & -word;
                // Count trailing zeros to get bit index
                const bitIndex = 31 - Math.clz32(bit);
                indices.push(baseIndex + bitIndex);
                // Clear lowest set bit
                word &= word - 1;
            }
        }
        return indices;
    }

    /**
     * Bitwise OR of two bitsets, result written to first array
     * a[i] = a[i] | b[i]
     */
    static or(a: Uint32Array, b: Uint32Array): void {
        const len = Math.min(a.length, b.length);

        // RULE 2: Small arrays → JavaScript
        if (len < WASM_THRESHOLD_WORDS) {
            for (let i = 0; i < len; i++) {
                a[i] |= b[i];
            }
            return;
        }

        // RULE 3/4: Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.or) {
            bridge.module.bitset.or(a, b);
            return;
        }

        // Fallback
        for (let i = 0; i < len; i++) {
            a[i] |= b[i];
        }
    }

    /**
     * Bitwise AND of two bitsets, result written to first array
     * a[i] = a[i] & b[i]
     */
    static and(a: Uint32Array, b: Uint32Array): void {
        const len = Math.min(a.length, b.length);

        // RULE 2: Small arrays → JavaScript
        if (len < WASM_THRESHOLD_WORDS) {
            for (let i = 0; i < len; i++) {
                a[i] &= b[i];
            }
            // Clear extra words in 'a' beyond 'b' length
            for (let i = len; i < a.length; i++) {
                a[i] = 0;
            }
            return;
        }

        // RULE 3/4: Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.and) {
            bridge.module.bitset.and(a, b);
            return;
        }

        // Fallback
        for (let i = 0; i < len; i++) {
            a[i] &= b[i];
        }
        for (let i = len; i < a.length; i++) {
            a[i] = 0;
        }
    }

    /**
     * Bitwise AND-NOT (difference): a[i] = a[i] & ~b[i]
     * Used for clearing bits that are set in another bitset
     */
    static andNot(a: Uint32Array, b: Uint32Array): void {
        const len = Math.min(a.length, b.length);

        // RULE 2: Small arrays → JavaScript
        if (len < WASM_THRESHOLD_WORDS) {
            for (let i = 0; i < len; i++) {
                a[i] &= ~b[i];
            }
            return;
        }

        // RULE 3/4: Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.andNot) {
            bridge.module.bitset.andNot(a, b);
            return;
        }

        // Fallback
        for (let i = 0; i < len; i++) {
            a[i] &= ~b[i];
        }
    }

    /**
     * Check if any bit is set in the bitset
     */
    static any(words: Uint32Array): boolean {
        // Always use JS - this is O(n) worst case but early-exits
        for (let i = 0; i < words.length; i++) {
            if (words[i] !== 0) return true;
        }
        return false;
    }

    /**
     * Propagate dirty flags from parents to children
     *
     * For each entity i, if parentIndices[i] is dirty (bit set in dirtyParents),
     * set the corresponding bit in dirtyChildren.
     *
     * This is a hot path operation that benefits from WASM for large hierarchies.
     *
     * @param parentIndices Array where parentIndices[i] = parent of entity i (-1 if root)
     * @param dirtyParents Bitset of dirty parent entities
     * @param dirtyChildren Output bitset - bits will be SET for children of dirty parents
     */
    static propagateDirtyToChildren(
        parentIndices: Int32Array,
        dirtyParents: Uint32Array,
        dirtyChildren: Uint32Array
    ): void {
        const entityCount = parentIndices.length;
        const BITS_PER_WORD = 32;

        // RULE 2: Small entity counts → JavaScript
        if (entityCount < WASM_THRESHOLD_WORDS * BITS_PER_WORD) {
            this._propagateDirtyToChildrenJS(parentIndices, dirtyParents, dirtyChildren);
            return;
        }

        // RULE 3/4: Try WASM
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && bridge.module.bitset?.propagateDirtyToChildren) {
            bridge.module.bitset.propagateDirtyToChildren(parentIndices, dirtyParents, dirtyChildren);
            return;
        }

        this._propagateDirtyToChildrenJS(parentIndices, dirtyParents, dirtyChildren);
    }

    /**
     * JavaScript fallback for propagateDirtyToChildren
     */
    private static _propagateDirtyToChildrenJS(
        parentIndices: Int32Array,
        dirtyParents: Uint32Array,
        dirtyChildren: Uint32Array
    ): void {
        const BITS_PER_WORD = 32;

        for (let i = 0; i < parentIndices.length; i++) {
            const parentIdx = parentIndices[i];

            // Skip if no parent (root entity)
            if (parentIdx < 0) continue;

            // Check if parent is dirty
            const parentWord = Math.floor(parentIdx / BITS_PER_WORD);
            const parentBit = parentIdx % BITS_PER_WORD;

            if (parentWord < dirtyParents.length && (dirtyParents[parentWord] & (1 << parentBit)) !== 0) {
                // Mark child as dirty
                const childWord = Math.floor(i / BITS_PER_WORD);
                const childBit = i % BITS_PER_WORD;
                dirtyChildren[childWord] |= (1 << childBit);
            }
        }
    }

    /**
     * Batch set multiple bits at once
     */
    static setBits(words: Uint32Array, indices: number[]): void {
        const BITS_PER_WORD = 32;

        // RULE 1/2: Always use JS for single/small operations
        for (const index of indices) {
            const wordIndex = Math.floor(index / BITS_PER_WORD);
            const bitIndex = index % BITS_PER_WORD;
            if (wordIndex < words.length) {
                words[wordIndex] |= (1 << bitIndex);
            }
        }
    }

    /**
     * Batch clear multiple bits at once
     */
    static clearBits(words: Uint32Array, indices: number[]): void {
        const BITS_PER_WORD = 32;

        for (const index of indices) {
            const wordIndex = Math.floor(index / BITS_PER_WORD);
            const bitIndex = index % BITS_PER_WORD;
            if (wordIndex < words.length) {
                words[wordIndex] &= ~(1 << bitIndex);
            }
        }
    }

    /**
     * Copy bitset: dst = src
     */
    static copy(dst: Uint32Array, src: Uint32Array): void {
        dst.set(src.subarray(0, Math.min(dst.length, src.length)));
    }

    /**
     * Clear all bits
     */
    static clear(words: Uint32Array): void {
        words.fill(0);
    }

    /**
     * Count set bits in a range [startBit, endBit)
     */
    static popcountRange(words: Uint32Array, startBit: number, endBit: number): number {
        const BITS_PER_WORD = 32;
        let count = 0;

        const startWord = Math.floor(startBit / BITS_PER_WORD);
        const endWord = Math.ceil(endBit / BITS_PER_WORD);

        for (let w = startWord; w < endWord && w < words.length; w++) {
            let word = words[w];

            // Mask off bits before startBit in first word
            if (w === startWord) {
                const startOffset = startBit % BITS_PER_WORD;
                word &= ~((1 << startOffset) - 1);
            }

            // Mask off bits at or after endBit in last word
            if (w === endWord - 1) {
                const endOffset = endBit % BITS_PER_WORD;
                if (endOffset > 0) {
                    word &= (1 << endOffset) - 1;
                }
            }

            count += popcount32(word);
        }

        return count;
    }
}

/**
 * Interface for WASM bitset exports
 * These will be implemented in Rust for maximum performance
 */
export interface WasmBitsetExports {
    /** Population count on Uint32Array */
    popcount(words: Uint32Array): number;

    /** Get indices of all set bits */
    getSetIndices(words: Uint32Array): Uint32Array;

    /** Bitwise OR: a = a | b */
    or(a: Uint32Array, b: Uint32Array): void;

    /** Bitwise AND: a = a & b */
    and(a: Uint32Array, b: Uint32Array): void;

    /** Bitwise AND-NOT: a = a & ~b */
    andNot(a: Uint32Array, b: Uint32Array): void;

    /** Propagate dirty flags from parents to children */
    propagateDirtyToChildren(
        parentIndices: Int32Array,
        dirtyParents: Uint32Array,
        dirtyChildren: Uint32Array
    ): void;
}
