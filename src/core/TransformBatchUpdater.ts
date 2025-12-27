/**
 * TransformBatchUpdater - Batch updates transforms using WASM
 *
 * When many transforms are dirty, batching TRS matrix computation
 * and parent multiplication is significantly faster than individual updates.
 *
 * Optimized path: Uses single WASM call (batch_update_transforms) that:
 * 1. Computes all TRS matrices
 * 2. Propagates hierarchy in one pass
 *
 * Usage:
 * ```typescript
 * // Per frame:
 * TransformBatchUpdater.instance.collectDirty(transforms);
 * TransformBatchUpdater.instance.updateAll(); // Uses WASM if >= 4 transforms
 * ```
 */

import { Transform } from './Transform';
import { WasmBridge } from '../wasm/WasmBridge';
import { Matrix4x4 } from '../math/Matrix4x4';

/** Minimum transforms to use WASM batch (below this, JS is faster) */
const BATCH_THRESHOLD = 4;

/** Transform data packed for WASM processing */
interface PackedTransform {
    transform: Transform;
    depth: number;           // Hierarchy depth (0 = root)
    parentIndex: number;     // Index of parent in sorted array (-1 = no parent)
    externalParentIndex: number; // Index in external parents array (-1 = none)
}

/**
 * TransformBatchUpdater singleton
 */
export class TransformBatchUpdater {
    private static _instance: TransformBatchUpdater | null = null;

    // Buffers for batch processing
    private _positions: Float32Array;
    private _rotations: Float32Array;
    private _scales: Float32Array;
    private _parentIndices: Int32Array;
    private _externalParentMatrices: Float32Array;

    // Transform tracking
    private _packedTransforms: PackedTransform[] = [];
    private _externalParents: Transform[] = [];
    private _maxCapacity: number;

    // WASM function reference
    private _wasmBatchUpdate: ((
        positions: Float32Array,
        rotations: Float32Array,
        scales: Float32Array,
        parentIndices: Int32Array,
        externalParentMatrices: Float32Array,
        count: number
    ) => Float32Array) | null = null;

    // Stats
    private _stats = {
        transformsUpdated: 0,
        batchesExecuted: 0,
        wasmUsed: false,
        lastUpdateTimeMs: 0,
    };

    private constructor(maxCapacity: number = 10000) {
        this._maxCapacity = maxCapacity;

        // Pre-allocate buffers
        this._positions = new Float32Array(maxCapacity * 3);
        this._rotations = new Float32Array(maxCapacity * 4);
        this._scales = new Float32Array(maxCapacity * 3);
        this._parentIndices = new Int32Array(maxCapacity);
        this._externalParentMatrices = new Float32Array(maxCapacity * 16);
    }

    static get instance(): TransformBatchUpdater {
        if (!this._instance) {
            this._instance = new TransformBatchUpdater();
        }
        return this._instance;
    }

    get stats() {
        return { ...this._stats };
    }

    /**
     * Initialize WASM function binding
     * Should be called after WasmBridge.init()
     */
    async init(): Promise<void> {
        try {
            const bridge = WasmBridge.instance;
            if (!bridge.isReady || bridge.usingFallback) {
                return;
            }

            const isNode = typeof process !== 'undefined' && process.versions?.node;
            let wasmModule: any;

            if (isNode) {
                const { pathToFileURL } = await import('url');
                const moduleUrl = pathToFileURL('/home/user/engine/dist/wasm/engine_core.js').href;
                wasmModule = await import(moduleUrl);
            } else {
                wasmModule = await import('/dist/wasm/engine_core.js');
            }

            if (typeof wasmModule.batch_update_transforms === 'function') {
                this._wasmBatchUpdate = wasmModule.batch_update_transforms;
                console.log('[TransformBatchUpdater] Direct WASM batch_update_transforms connected');
            }
        } catch (e) {
            console.warn('[TransformBatchUpdater] Failed to connect WASM:', e);
        }
    }

    /**
     * Collect dirty transforms and sort by hierarchy depth
     * Must be called before updateAll()
     */
    collectDirty(transforms: Iterable<Transform>): number {
        this._packedTransforms = [];
        this._externalParents = [];

        const transformSet = new Set<Transform>();

        // Collect all dirty transforms with their depths
        for (const t of transforms) {
            if (t.isDirty) {
                transformSet.add(t);
                const depth = this._getDepth(t);
                this._packedTransforms.push({
                    transform: t,
                    depth,
                    parentIndex: -1,
                    externalParentIndex: -1,
                });
            }
        }

        // Sort by depth (parents first)
        this._packedTransforms.sort((a, b) => a.depth - b.depth);

        // Assign parent indices
        const transformMap = new Map<Transform, number>();
        for (let i = 0; i < this._packedTransforms.length; i++) {
            const pt = this._packedTransforms[i];
            transformMap.set(pt.transform, i);

            const parent = pt.transform.parent;
            if (parent) {
                const parentIdx = transformMap.get(parent);
                if (parentIdx !== undefined) {
                    // Parent is in batch
                    pt.parentIndex = parentIdx;
                } else {
                    // Parent is external (not in batch, but exists)
                    let extIdx = this._externalParents.indexOf(parent);
                    if (extIdx === -1) {
                        extIdx = this._externalParents.length;
                        this._externalParents.push(parent);
                    }
                    // Encode as -2 - index (so -2 = external 0, -3 = external 1, etc.)
                    pt.externalParentIndex = extIdx;
                    pt.parentIndex = -2 - extIdx;
                }
            }
        }

        return this._packedTransforms.length;
    }

    /**
     * Update all collected transforms
     * Uses WASM batch if >= BATCH_THRESHOLD transforms
     */
    updateAll(): void {
        const count = this._packedTransforms.length;
        if (count === 0) return;

        const startTime = performance.now();

        if (count >= BATCH_THRESHOLD && this._isWasmAvailable()) {
            this._updateBatchWasmDirect();
            this._stats.wasmUsed = true;
        } else {
            this._updateIndividualJS();
            this._stats.wasmUsed = false;
        }

        this._stats.transformsUpdated = count;
        this._stats.lastUpdateTimeMs = performance.now() - startTime;
        this._stats.batchesExecuted++;

        // Clear for next frame
        this._packedTransforms = [];
        this._externalParents = [];
    }

    /**
     * Optimized WASM batch update - single WASM call
     */
    private _updateBatchWasmDirect(): void {
        const count = this._packedTransforms.length;

        // Pack TRS data into buffers
        for (let i = 0; i < count; i++) {
            const pt = this._packedTransforms[i];
            const t = pt.transform;

            // Pack position
            const pos = t.localPosition;
            this._positions[i * 3] = pos.x;
            this._positions[i * 3 + 1] = pos.y;
            this._positions[i * 3 + 2] = pos.z;

            // Pack rotation
            const rot = t.localRotation;
            this._rotations[i * 4] = rot.x;
            this._rotations[i * 4 + 1] = rot.y;
            this._rotations[i * 4 + 2] = rot.z;
            this._rotations[i * 4 + 3] = rot.w;

            // Pack scale
            const scale = t.localScale;
            this._scales[i * 3] = scale.x;
            this._scales[i * 3 + 1] = scale.y;
            this._scales[i * 3 + 2] = scale.z;

            // Pack parent index
            this._parentIndices[i] = pt.parentIndex;
        }

        // Pack external parent world matrices
        for (let i = 0; i < this._externalParents.length; i++) {
            const parentWorld = this._externalParents[i].localToWorldMatrix.toFloat32Array();
            this._externalParentMatrices.set(parentWorld, i * 16);
        }

        // Single WASM call!
        const worldMatrices = this._wasmBatchUpdate!(
            this._positions.subarray(0, count * 3),
            this._rotations.subarray(0, count * 4),
            this._scales.subarray(0, count * 3),
            this._parentIndices.subarray(0, count),
            this._externalParentMatrices.subarray(0, this._externalParents.length * 16),
            count
        );

        // Write results back to transforms
        for (let i = 0; i < count; i++) {
            const pt = this._packedTransforms[i];
            const worldMatrix = worldMatrices.subarray(i * 16, i * 16 + 16);
            pt.transform._setMatricesFromBatch(
                Matrix4x4.fromFloat32Array(worldMatrix)
            );
        }
    }

    /**
     * Individual JS update - fallback for small counts
     */
    private _updateIndividualJS(): void {
        for (const pt of this._packedTransforms) {
            // Force matrix update via property access
            pt.transform.localToWorldMatrix;
        }
    }

    private _isWasmAvailable(): boolean {
        const bridge = WasmBridge.instance;
        return bridge.isReady && !bridge.usingFallback && this._wasmBatchUpdate !== null;
    }

    private _getDepth(transform: Transform): number {
        let depth = 0;
        let current = transform.parent;
        while (current) {
            depth++;
            current = current.parent;
        }
        return depth;
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this._stats = {
            transformsUpdated: 0,
            batchesExecuted: 0,
            wasmUsed: false,
            lastUpdateTimeMs: 0,
        };
    }
}
