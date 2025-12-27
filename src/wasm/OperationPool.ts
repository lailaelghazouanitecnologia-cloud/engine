/**
 * Operation Pool - Batches operations for efficient WASM execution
 * Collects operations during a frame and executes them in batches
 */

import { WasmBridge } from './WasmBridge';

export enum OperationType {
    // Matrix operations
    MATRIX_MULTIPLY,
    MATRIX_INVERT,
    MATRIX_TRS,

    // Transform operations
    TRANSFORM_POINTS,
    TRANSFORM_DIRECTIONS,

    // Quaternion operations
    QUAT_SLERP,
    QUAT_MULTIPLY,

    // Culling operations
    FRUSTUM_CULL_AABB,
    FRUSTUM_CULL_SPHERE,

    // Animation operations
    SKELETON_INTERPOLATE,
    SKELETON_BLEND,

    // Particle operations
    PARTICLES_UPDATE,
    PARTICLES_SORT,
}

interface PendingOperation {
    type: OperationType;
    data: Float32Array | Uint32Array;
    callback: (result: Float32Array | Uint32Array) => void;
    priority: number;
}

interface BatchedOperations {
    [OperationType.MATRIX_MULTIPLY]: Array<{
        a: Float32Array;
        b: Float32Array;
        callback: (result: Float32Array) => void;
    }>;
    [OperationType.QUAT_SLERP]: Array<{
        a: Float32Array;
        b: Float32Array;
        t: number;
        callback: (result: Float32Array) => void;
    }>;
    [OperationType.TRANSFORM_POINTS]: Array<{
        matrix: Float32Array;
        points: Float32Array;
        callback: (result: Float32Array) => void;
    }>;
    [OperationType.FRUSTUM_CULL_AABB]: Array<{
        frustum: Float32Array;
        aabbs: Float32Array;
        callback: (result: Uint32Array) => void;
    }>;
    [OperationType.SKELETON_INTERPOLATE]: Array<{
        bones_a: Float32Array;
        bones_b: Float32Array;
        t: number;
        callback: (result: Float32Array) => void;
    }>;
}

/**
 * OperationPool manages batched WASM operations for maximum performance
 */
export class OperationPool {
    private static _instance: OperationPool | null = null;

    private _matrixMultiplies: Array<{
        a: Float32Array;
        b: Float32Array;
        callback: (result: Float32Array) => void;
    }> = [];

    private _quatSlerps: Array<{
        a: Float32Array;
        b: Float32Array;
        t: number;
        callback: (result: Float32Array) => void;
    }> = [];

    private _transformPoints: Array<{
        matrix: Float32Array;
        points: Float32Array;
        callback: (result: Float32Array) => void;
    }> = [];

    private _frustumCulls: Array<{
        frustum: Float32Array;
        bounds: Float32Array;
        callback: (result: Uint32Array) => void;
    }> = [];

    private _skeletonInterpolations: Array<{
        bones_a: Float32Array;
        bones_b: Float32Array;
        t: number;
        callback: (result: Float32Array) => void;
    }> = [];

    private _isProcessing: boolean = false;
    private _stats = {
        operationsQueued: 0,
        operationsProcessed: 0,
        batchesExecuted: 0,
        lastFlushTime: 0,
    };

    private constructor() {}

    static get instance(): OperationPool {
        if (!this._instance) {
            this._instance = new OperationPool();
        }
        return this._instance;
    }

    /** Get pool statistics */
    get stats() {
        return { ...this._stats };
    }

    /** Queue a matrix multiply operation */
    queueMatrixMultiply(
        a: Float32Array,
        b: Float32Array,
        callback: (result: Float32Array) => void
    ): void {
        this._matrixMultiplies.push({ a, b, callback });
        this._stats.operationsQueued++;
    }

    /** Queue a quaternion SLERP operation */
    queueQuatSlerp(
        a: Float32Array,
        b: Float32Array,
        t: number,
        callback: (result: Float32Array) => void
    ): void {
        this._quatSlerps.push({ a, b, t, callback });
        this._stats.operationsQueued++;
    }

    /** Queue a batch of point transforms */
    queueTransformPoints(
        matrix: Float32Array,
        points: Float32Array,
        callback: (result: Float32Array) => void
    ): void {
        this._transformPoints.push({ matrix, points, callback });
        this._stats.operationsQueued++;
    }

    /** Queue a frustum culling operation */
    queueFrustumCull(
        frustum: Float32Array,
        bounds: Float32Array,
        callback: (result: Uint32Array) => void
    ): void {
        this._frustumCulls.push({ frustum, bounds, callback });
        this._stats.operationsQueued++;
    }

    /** Queue skeleton interpolation */
    queueSkeletonInterpolation(
        bones_a: Float32Array,
        bones_b: Float32Array,
        t: number,
        callback: (result: Float32Array) => void
    ): void {
        this._skeletonInterpolations.push({ bones_a, bones_b, t, callback });
        this._stats.operationsQueued++;
    }

    /**
     * Flush all pending operations and execute them in WASM
     * Should be called once per frame, typically at the start of the render phase
     */
    flush(): void {
        if (this._isProcessing) {
            console.warn('[OperationPool] Flush called while already processing');
            return;
        }

        const startTime = performance.now();
        this._isProcessing = true;

        try {
            const wasm = WasmBridge.instance;
            if (!wasm.isReady) {
                this._executeWithFallback();
                return;
            }

            const module = wasm.module;

            // Process matrix multiplies
            this._processMatrixMultiplies(module);

            // Process quaternion SLERPs
            this._processQuatSlerps(module);

            // Process point transforms
            this._processTransformPoints(module);

            // Process frustum culls
            this._processFrustumCulls(module);

            // Process skeleton interpolations
            this._processSkeletonInterpolations(module);

            this._stats.batchesExecuted++;
            this._stats.lastFlushTime = performance.now() - startTime;

        } finally {
            this._isProcessing = false;
            this._clearQueues();
        }
    }

    private _processMatrixMultiplies(module: ReturnType<typeof WasmBridge.prototype.module>): void {
        if (this._matrixMultiplies.length === 0) return;

        // For small counts, execute individually
        if (this._matrixMultiplies.length < 10) {
            for (const op of this._matrixMultiplies) {
                const result = module.math.mat4_multiply(op.a, op.b);
                op.callback(result);
                this._stats.operationsProcessed++;
            }
        } else {
            // For larger counts, batch them
            const allMatricesA = new Float32Array(this._matrixMultiplies.length * 16);
            const allMatricesB = new Float32Array(this._matrixMultiplies.length * 16);

            for (let i = 0; i < this._matrixMultiplies.length; i++) {
                allMatricesA.set(this._matrixMultiplies[i].a, i * 16);
                allMatricesB.set(this._matrixMultiplies[i].b, i * 16);
            }

            // Execute batch multiply and distribute results
            for (let i = 0; i < this._matrixMultiplies.length; i++) {
                const result = module.math.mat4_multiply(
                    allMatricesA.subarray(i * 16, (i + 1) * 16),
                    allMatricesB.subarray(i * 16, (i + 1) * 16)
                );
                this._matrixMultiplies[i].callback(result);
                this._stats.operationsProcessed++;
            }
        }
    }

    private _processQuatSlerps(module: ReturnType<typeof WasmBridge.prototype.module>): void {
        if (this._quatSlerps.length === 0) return;

        // Group by t value for batch processing
        const groupedByT = new Map<number, typeof this._quatSlerps>();

        for (const op of this._quatSlerps) {
            const key = Math.round(op.t * 1000); // Group similar t values
            if (!groupedByT.has(key)) {
                groupedByT.set(key, []);
            }
            groupedByT.get(key)!.push(op);
        }

        for (const [, ops] of groupedByT) {
            if (ops.length >= 4) {
                // Batch process
                const quatsA = new Float32Array(ops.length * 4);
                const quatsB = new Float32Array(ops.length * 4);
                const t = ops[0].t;

                for (let i = 0; i < ops.length; i++) {
                    quatsA.set(ops[i].a, i * 4);
                    quatsB.set(ops[i].b, i * 4);
                }

                const results = module.math.batch_slerp_quats(quatsA, quatsB, t);

                for (let i = 0; i < ops.length; i++) {
                    ops[i].callback(results.subarray(i * 4, (i + 1) * 4));
                    this._stats.operationsProcessed++;
                }
            } else {
                // Individual processing
                for (const op of ops) {
                    const result = module.math.quat_slerp(
                        op.a[0], op.a[1], op.a[2], op.a[3],
                        op.b[0], op.b[1], op.b[2], op.b[3],
                        op.t
                    );
                    op.callback(result);
                    this._stats.operationsProcessed++;
                }
            }
        }
    }

    private _processTransformPoints(module: ReturnType<typeof WasmBridge.prototype.module>): void {
        for (const op of this._transformPoints) {
            const result = module.math.batch_transform_points(op.matrix, op.points);
            op.callback(result);
            this._stats.operationsProcessed++;
        }
    }

    private _processFrustumCulls(module: ReturnType<typeof WasmBridge.prototype.module>): void {
        for (const op of this._frustumCulls) {
            const result = module.culling.frustum_cull_aabbs(op.frustum, op.bounds);
            op.callback(result);
            this._stats.operationsProcessed++;
        }
    }

    private _processSkeletonInterpolations(module: ReturnType<typeof WasmBridge.prototype.module>): void {
        for (const op of this._skeletonInterpolations) {
            const result = module.animation.skeleton_interpolate(op.bones_a, op.bones_b, op.t);
            op.callback(result);
            this._stats.operationsProcessed++;
        }
    }

    private _executeWithFallback(): void {
        console.warn('[OperationPool] WASM not ready, operations deferred');
        // Clear without executing - operations will need to be requeued
        this._clearQueues();
    }

    private _clearQueues(): void {
        this._matrixMultiplies = [];
        this._quatSlerps = [];
        this._transformPoints = [];
        this._frustumCulls = [];
        this._skeletonInterpolations = [];
    }

    /** Clear all pending operations without executing */
    clear(): void {
        this._clearQueues();
        this._stats.operationsQueued = 0;
    }

    /** Reset statistics */
    resetStats(): void {
        this._stats = {
            operationsQueued: 0,
            operationsProcessed: 0,
            batchesExecuted: 0,
            lastFlushTime: 0,
        };
    }
}
