/**
 * DirtyTracker - Efficient tracking of changed entities/components
 *
 * Uses bitsets for O(1) dirty checking and efficient iteration.
 * Supports multiple "dirty channels" for different types of changes.
 *
 * WASM OPTIMIZATION:
 * Heavy operations (popcount, getSetIndices, or, and, propagation) use
 * WasmBitset which automatically switches to WASM for large datasets.
 * See WasmBitset for threshold rules (RULE 1-4).
 *
 * Architecture:
 * ┌────────────────────────────────────────────────────────────────┐
 * │                       DirtyTracker                              │
 * ├────────────────────────────────────────────────────────────────┤
 * │ Channel: TRANSFORM                                              │
 * │ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐             │
 * │ │  1  │  0  │  1  │  0  │  0  │  1  │  0  │  0  │ ... (bits)  │
 * │ └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘             │
 * │   ↑           ↑                 ↑                              │
 * │   Entity 0    Entity 2          Entity 5 (dirty)               │
 * ├────────────────────────────────────────────────────────────────┤
 * │ Channel: PHYSICS                                                │
 * │ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐             │
 * │ │  0  │  1  │  0  │  1  │  0  │  0  │  0  │  1  │ ... (bits)  │
 * │ └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘             │
 * ├────────────────────────────────────────────────────────────────┤
 * │ Dirty List (cached indices for fast iteration):                │
 * │ TRANSFORM: [0, 2, 5, 12, 45, ...]                              │
 * │ PHYSICS: [1, 3, 7, 23, ...]                                    │
 * └────────────────────────────────────────────────────────────────┘
 */

import { WasmBitset } from '../wasm/WasmBitset';

/** Dirty channels for different types of changes */
export enum DirtyChannel {
    /** Transform (position, rotation, scale) changed */
    TRANSFORM = 0,
    /** World matrix needs recalculation */
    WORLD_MATRIX = 1,
    /** Physics properties changed */
    PHYSICS = 2,
    /** Bounds changed */
    BOUNDS = 3,
    /** Visibility changed */
    VISIBILITY = 4,
    /** Material/rendering properties changed */
    RENDER = 5,
    /** Animation state changed */
    ANIMATION = 6,
    /** Custom user channel 1 */
    USER_1 = 7,
    /** Custom user channel 2 */
    USER_2 = 8,
}

const BITS_PER_WORD = 32;

/**
 * Bitset for efficient dirty tracking
 */
class Bitset {
    private _words: Uint32Array;
    private _capacity: number;
    private _popCount: number = 0;

    constructor(capacity: number) {
        this._capacity = capacity;
        const wordCount = Math.ceil(capacity / BITS_PER_WORD);
        this._words = new Uint32Array(wordCount);
    }

    get capacity(): number {
        return this._capacity;
    }

    get count(): number {
        return this._popCount;
    }

    /** Direct access to words for WASM operations */
    get words(): Uint32Array {
        return this._words;
    }

    /** Set bit at index */
    set(index: number): boolean {
        const wordIndex = Math.floor(index / BITS_PER_WORD);
        const bitIndex = index % BITS_PER_WORD;
        const mask = 1 << bitIndex;

        if (!(this._words[wordIndex] & mask)) {
            this._words[wordIndex] |= mask;
            this._popCount++;
            return true; // Was not set before
        }
        return false;
    }

    /** Clear bit at index */
    clear(index: number): boolean {
        const wordIndex = Math.floor(index / BITS_PER_WORD);
        const bitIndex = index % BITS_PER_WORD;
        const mask = 1 << bitIndex;

        if (this._words[wordIndex] & mask) {
            this._words[wordIndex] &= ~mask;
            this._popCount--;
            return true; // Was set before
        }
        return false;
    }

    /** Check if bit is set */
    test(index: number): boolean {
        const wordIndex = Math.floor(index / BITS_PER_WORD);
        const bitIndex = index % BITS_PER_WORD;
        return (this._words[wordIndex] & (1 << bitIndex)) !== 0;
    }

    /** Clear all bits */
    clearAll(): void {
        this._words.fill(0);
        this._popCount = 0;
    }

    /** Get all set indices - uses WASM for large bitsets */
    getSetIndices(): number[] {
        // Delegate to WasmBitset which handles threshold switching
        return WasmBitset.getSetIndices(this._words);
    }

    /** Iterate over set indices (generator for memory efficiency) */
    *iterateSet(): Generator<number> {
        for (let w = 0; w < this._words.length; w++) {
            let word = this._words[w];
            if (word === 0) continue;

            const baseIndex = w * BITS_PER_WORD;
            while (word !== 0) {
                const bit = word & -word;
                const bitIndex = Math.log2(bit) | 0;
                yield baseIndex + bitIndex;
                word &= word - 1;
            }
        }
    }

    /** Resize to new capacity */
    resize(newCapacity: number): void {
        if (newCapacity <= this._capacity) return;

        const newWordCount = Math.ceil(newCapacity / BITS_PER_WORD);
        const newWords = new Uint32Array(newWordCount);
        newWords.set(this._words);
        this._words = newWords;
        this._capacity = newCapacity;
    }

    /** OR with another bitset - uses WASM for large bitsets */
    or(other: Bitset): void {
        WasmBitset.or(this._words, other._words);
        this._recountBits();
    }

    /** AND with another bitset - uses WASM for large bitsets */
    and(other: Bitset): void {
        WasmBitset.and(this._words, other._words);
        this._recountBits();
    }

    /** Recount population - uses WASM for large bitsets */
    private _recountBits(): void {
        this._popCount = WasmBitset.popcount(this._words);
    }

    /** Clone the bitset */
    clone(): Bitset {
        const copy = new Bitset(this._capacity);
        copy._words.set(this._words);
        copy._popCount = this._popCount;
        return copy;
    }
}

/**
 * Channel tracker - tracks dirty state for a single channel
 */
class ChannelTracker {
    readonly channel: DirtyChannel;
    private _current: Bitset;
    private _previous: Bitset;
    private _cachedDirtyList: number[] | null = null;
    private _version: number = 0;

    constructor(channel: DirtyChannel, capacity: number) {
        this.channel = channel;
        this._current = new Bitset(capacity);
        this._previous = new Bitset(capacity);
    }

    get version(): number {
        return this._version;
    }

    get dirtyCount(): number {
        return this._current.count;
    }

    /** Direct access to current bitset words for WASM operations */
    get currentWords(): Uint32Array {
        return this._current.words;
    }

    /** Mark entity as dirty */
    markDirty(index: number): void {
        if (this._current.set(index)) {
            this._cachedDirtyList = null;
            this._version++;
        }
    }

    /** Clear dirty flag for entity */
    clearDirty(index: number): void {
        if (this._current.clear(index)) {
            this._cachedDirtyList = null;
            this._version++;
        }
    }

    /** Check if entity is dirty */
    isDirty(index: number): boolean {
        return this._current.test(index);
    }

    /** Check if entity was dirty in previous frame */
    wasDirty(index: number): boolean {
        return this._previous.test(index);
    }

    /** Check if entity became dirty this frame (wasn't dirty before) */
    becameDirty(index: number): boolean {
        return this._current.test(index) && !this._previous.test(index);
    }

    /** Get list of all dirty indices */
    getDirtyList(): number[] {
        if (!this._cachedDirtyList) {
            this._cachedDirtyList = this._current.getSetIndices();
        }
        return this._cachedDirtyList;
    }

    /** Iterate dirty indices (memory efficient) */
    *iterateDirty(): Generator<number> {
        yield* this._current.iterateSet();
    }

    /** Swap current and previous, clear current (call at frame end) */
    swapAndClear(): void {
        const temp = this._previous;
        this._previous = this._current;
        this._current = temp;
        this._current.clearAll();
        this._cachedDirtyList = null;
        this._version++;
    }

    /** Clear all dirty flags */
    clearAll(): void {
        this._current.clearAll();
        this._cachedDirtyList = null;
        this._version++;
    }

    /** Resize capacity */
    resize(newCapacity: number): void {
        this._current.resize(newCapacity);
        this._previous.resize(newCapacity);
    }
}

/**
 * DirtyTracker - Main class for tracking dirty entities
 */
export class DirtyTracker {
    private _channels: Map<DirtyChannel, ChannelTracker> = new Map();
    private _capacity: number;
    private _propagationRules: Map<DirtyChannel, DirtyChannel[]> = new Map();

    constructor(capacity: number = 4096) {
        this._capacity = capacity;

        // Initialize all channels
        for (const channel of Object.values(DirtyChannel).filter(v => typeof v === 'number')) {
            this._channels.set(channel as DirtyChannel, new ChannelTracker(channel as DirtyChannel, capacity));
        }

        // Default propagation rules
        this._setupDefaultPropagation();
    }

    /** Get current capacity (max entity count) */
    get capacity(): number {
        return this._capacity;
    }

    /** Setup default dirty propagation rules */
    private _setupDefaultPropagation(): void {
        // Transform changes propagate to world matrix and bounds
        this.addPropagationRule(DirtyChannel.TRANSFORM, DirtyChannel.WORLD_MATRIX);
        this.addPropagationRule(DirtyChannel.TRANSFORM, DirtyChannel.BOUNDS);

        // Physics changes may affect transform
        this.addPropagationRule(DirtyChannel.PHYSICS, DirtyChannel.TRANSFORM);
    }

    /** Add a propagation rule: when 'from' is dirty, also mark 'to' as dirty */
    addPropagationRule(from: DirtyChannel, to: DirtyChannel): void {
        if (!this._propagationRules.has(from)) {
            this._propagationRules.set(from, []);
        }
        const rules = this._propagationRules.get(from)!;
        if (!rules.includes(to)) {
            rules.push(to);
        }
    }

    /** Mark entity as dirty in a channel */
    markDirty(index: number, channel: DirtyChannel): void {
        const tracker = this._channels.get(channel);
        if (tracker) {
            tracker.markDirty(index);

            // Apply propagation rules
            const propagateTo = this._propagationRules.get(channel);
            if (propagateTo) {
                for (const targetChannel of propagateTo) {
                    this._channels.get(targetChannel)?.markDirty(index);
                }
            }
        }
    }

    /** Mark multiple entities as dirty */
    markDirtyBatch(indices: number[], channel: DirtyChannel): void {
        for (const index of indices) {
            this.markDirty(index, channel);
        }
    }

    /** Clear dirty flag */
    clearDirty(index: number, channel: DirtyChannel): void {
        this._channels.get(channel)?.clearDirty(index);
    }

    /** Check if entity is dirty */
    isDirty(index: number, channel: DirtyChannel): boolean {
        return this._channels.get(channel)?.isDirty(index) ?? false;
    }

    /** Check if entity is dirty in any of the specified channels */
    isDirtyAny(index: number, channels: DirtyChannel[]): boolean {
        for (const channel of channels) {
            if (this.isDirty(index, channel)) return true;
        }
        return false;
    }

    /** Get dirty list for a channel */
    getDirtyList(channel: DirtyChannel): number[] {
        return this._channels.get(channel)?.getDirtyList() ?? [];
    }

    /** Get dirty count for a channel */
    getDirtyCount(channel: DirtyChannel): number {
        return this._channels.get(channel)?.dirtyCount ?? 0;
    }

    /** Get raw bitset words for a channel (for WASM operations) */
    getChannelWords(channel: DirtyChannel): Uint32Array | null {
        return this._channels.get(channel)?.currentWords ?? null;
    }

    /** Iterate dirty entities in a channel */
    *iterateDirty(channel: DirtyChannel): Generator<number> {
        const tracker = this._channels.get(channel);
        if (tracker) {
            yield* tracker.iterateDirty();
        }
    }

    /** End frame - swap current/previous and clear */
    endFrame(): void {
        for (const tracker of this._channels.values()) {
            tracker.swapAndClear();
        }
    }

    /** Clear all dirty flags in a channel */
    clearChannel(channel: DirtyChannel): void {
        this._channels.get(channel)?.clearAll();
    }

    /** Clear all dirty flags in all channels */
    clearAll(): void {
        for (const tracker of this._channels.values()) {
            tracker.clearAll();
        }
    }

    /** Resize all channels */
    resize(newCapacity: number): void {
        for (const tracker of this._channels.values()) {
            tracker.resize(newCapacity);
        }
        this._capacity = newCapacity;
    }

    /** Get statistics */
    getStats(): Record<string, { dirty: number; version: number }> {
        const stats: Record<string, { dirty: number; version: number }> = {};
        for (const [channel, tracker] of this._channels) {
            stats[DirtyChannel[channel]] = {
                dirty: tracker.dirtyCount,
                version: tracker.version,
            };
        }
        return stats;
    }
}

/**
 * HierarchyDirtyPropagator - Propagates dirty flags through transform hierarchy
 *
 * WASM OPTIMIZATION:
 * For large hierarchies (1000+ entities), uses WasmBitset.propagateDirtyToChildren
 * which processes parent-child relationships in a tight loop without GC pressure.
 */
export class HierarchyDirtyPropagator {
    private _tracker: DirtyTracker;
    private _parentIndices: Int32Array;

    constructor(tracker: DirtyTracker, parentIndices: Int32Array) {
        this._tracker = tracker;
        this._parentIndices = parentIndices;
    }

    /** Update parent indices reference */
    setParentIndices(parentIndices: Int32Array): void {
        this._parentIndices = parentIndices;
    }

    /**
     * Propagate dirty flags from parents to children
     * When a parent's transform changes, all children need to recalculate world matrix
     *
     * Uses WASM for large hierarchies (see WasmBitset RULE 3/4)
     */
    propagateToChildren(): void {
        const dirtyParentsWords = this._tracker.getChannelWords(DirtyChannel.TRANSFORM);
        const worldMatrixWords = this._tracker.getChannelWords(DirtyChannel.WORLD_MATRIX);

        if (!dirtyParentsWords || !worldMatrixWords) {
            return;
        }

        // Use WasmBitset for WASM-optimized propagation
        // This operates directly on the bitset words without creating JS objects
        WasmBitset.propagateDirtyToChildren(
            this._parentIndices,
            dirtyParentsWords,
            worldMatrixWords
        );
    }

    /**
     * Propagate dirty flags up the hierarchy
     * Used for bounds recalculation when child bounds change
     *
     * Note: This operation is inherently serial (following parent chain)
     * so WASM optimization has limited benefit. Uses JS implementation.
     */
    propagateToParents(channel: DirtyChannel): void {
        const dirty = this._tracker.getDirtyList(channel);
        const visited = new Set<number>();

        for (const index of dirty) {
            let parentIdx = this._parentIndices[index];
            while (parentIdx >= 0 && !visited.has(parentIdx)) {
                visited.add(parentIdx);
                this._tracker.markDirty(parentIdx, channel);
                parentIdx = this._parentIndices[parentIdx];
            }
        }
    }
}
