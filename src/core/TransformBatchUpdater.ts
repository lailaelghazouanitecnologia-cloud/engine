/**
 * TransformBatchUpdater - Batch updates transforms using WASM
 *
 * When many transforms are dirty, batching TRS matrix computation
 * and parent multiplication is significantly faster than individual updates.
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
import { WasmBatchProcessor } from '../wasm/WasmBatchProcessor';
import { Matrix4x4 } from '../math/Matrix4x4';

/** Minimum transforms to use WASM batch (below this, JS is faster) */
const BATCH_THRESHOLD = 4;

/** Transform data packed for WASM processing */
interface PackedTransform {
    transform: Transform;
    depth: number;           // Hierarchy depth (0 = root)
    parentIndex: number;     // Index of parent in sorted array (-1 = no parent)
    localMatrixOffset: number;
    worldMatrixOffset: number;
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
    private _localMatrices: Float32Array;
    private _worldMatrices: Float32Array;
    private _parentMatrices: Float32Array;

    // Transform tracking
    private _packedTransforms: PackedTransform[] = [];
    private _maxCapacity: number;

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
        this._localMatrices = new Float32Array(maxCapacity * 16);
        this._worldMatrices = new Float32Array(maxCapacity * 16);
        this._parentMatrices = new Float32Array(maxCapacity * 16);
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
     * Collect dirty transforms and sort by hierarchy depth
     * Must be called before updateAll()
     */
    collectDirty(transforms: Iterable<Transform>): number {
        this._packedTransforms = [];

        // Collect all dirty transforms with their depths
        for (const t of transforms) {
            if (t.isDirty) {
                const depth = this._getDepth(t);
                this._packedTransforms.push({
                    transform: t,
                    depth,
                    parentIndex: -1,
                    localMatrixOffset: 0,
                    worldMatrixOffset: 0,
                });
            }
        }

        // Sort by depth (parents first)
        this._packedTransforms.sort((a, b) => a.depth - b.depth);

        // Assign buffer offsets and find parent indices
        const transformMap = new Map<Transform, number>();
        for (let i = 0; i < this._packedTransforms.length; i++) {
            const pt = this._packedTransforms[i];
            transformMap.set(pt.transform, i);
            pt.localMatrixOffset = i * 16;
            pt.worldMatrixOffset = i * 16;

            // Find parent index (if parent is also being updated)
            const parent = pt.transform.parent;
            if (parent) {
                const parentIdx = transformMap.get(parent);
                if (parentIdx !== undefined) {
                    pt.parentIndex = parentIdx;
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
            this._updateBatchWasm();
            this._stats.wasmUsed = true;
        } else {
            this._updateIndividualJS();
            this._stats.wasmUsed = false;
        }

        this._stats.transformsUpdated = count;
        this._stats.lastUpdateTimeMs = performance.now() - startTime;

        // Clear for next frame
        this._packedTransforms = [];
    }

    /**
     * WASM batch update - pack data, compute TRS, multiply hierarchies
     */
    private _updateBatchWasm(): void {
        const count = this._packedTransforms.length;
        const batch = WasmBatchProcessor.instance;

        // Step 1: Pack TRS data into buffers
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
        }

        // Step 2: Queue TRS matrix computations
        for (let i = 0; i < count; i++) {
            const pt = this._packedTransforms[i];
            const posSlice = this._positions.subarray(i * 3, i * 3 + 3);
            const rotSlice = this._rotations.subarray(i * 4, i * 4 + 4);
            const scaleSlice = this._scales.subarray(i * 3, i * 3 + 3);

            batch.queueMat4TRS(posSlice, rotSlice, scaleSlice, (localMatrix) => {
                // Store local matrix
                this._localMatrices.set(localMatrix, pt.localMatrixOffset);

                // If no parent or parent not in batch, local = world
                if (pt.parentIndex === -1) {
                    this._worldMatrices.set(localMatrix, pt.worldMatrixOffset);
                }
            });
        }

        // Flush TRS computations
        batch.flush();
        this._stats.batchesExecuted++;

        // Step 3: Queue parent * local multiplications (in depth order)
        for (let i = 0; i < count; i++) {
            const pt = this._packedTransforms[i];

            if (pt.parentIndex !== -1) {
                // Parent is in our batch
                const parentWorld = this._worldMatrices.subarray(
                    pt.parentIndex * 16,
                    pt.parentIndex * 16 + 16
                );
                const localMatrix = this._localMatrices.subarray(
                    pt.localMatrixOffset,
                    pt.localMatrixOffset + 16
                );

                batch.queueMat4Multiply(parentWorld, localMatrix, (worldMatrix) => {
                    this._worldMatrices.set(worldMatrix, pt.worldMatrixOffset);
                });
            } else if (pt.transform.parent) {
                // Parent exists but not in batch - get its world matrix
                const parentWorld = pt.transform.parent.localToWorldMatrix.toFloat32Array();
                const localMatrix = this._localMatrices.subarray(
                    pt.localMatrixOffset,
                    pt.localMatrixOffset + 16
                );

                batch.queueMat4Multiply(parentWorld, localMatrix, (worldMatrix) => {
                    this._worldMatrices.set(worldMatrix, pt.worldMatrixOffset);
                });
            }
        }

        // Flush multiplications
        batch.flush();
        this._stats.batchesExecuted++;

        // Step 4: Write results back to transforms
        for (let i = 0; i < count; i++) {
            const pt = this._packedTransforms[i];
            const worldMatrix = this._worldMatrices.subarray(
                pt.worldMatrixOffset,
                pt.worldMatrixOffset + 16
            );

            // Update transform's matrices via internal method
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
        return bridge.isReady && !bridge.usingFallback;
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
