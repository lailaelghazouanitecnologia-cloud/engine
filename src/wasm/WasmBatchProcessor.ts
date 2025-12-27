/**
 * WasmBatchProcessor - Batches multiple WASM operations into single calls
 *
 * Problem: Each JS → WASM call has overhead (~50-200ns)
 * Solution: Batch operations and execute in one WASM call
 *
 * Architecture:
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │                      WasmBatchProcessor                                │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │                                                                        │
 * │  Frame N: Collect Phase                                                │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │  queue.mat4Multiply(a, b)  → CommandBuffer + DataBuffer          │ │
 * │  │  queue.vec3Normalize(v)    → CommandBuffer + DataBuffer          │ │
 * │  │  queue.quatSlerp(a,b,t)    → CommandBuffer + DataBuffer          │ │
 * │  │  queue.mat4Multiply(c, d)  → CommandBuffer + DataBuffer          │ │
 * │  │  ...hundreds of operations...                                    │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * │                               │                                        │
 * │                               ▼                                        │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │  Command Buffer (packed)                                         │ │
 * │  │  ┌────┬────┬────┬────┬────┬────┬────┬────┐                      │ │
 * │  │  │OP  │CNT │OFF │OP  │CNT │OFF │OP  │... │                      │ │
 * │  │  │MAT4│ 2  │ 0  │VEC3│ 1  │128 │QUAT│... │                      │ │
 * │  │  │MUL │    │    │NORM│    │    │SLRP│    │                      │ │
 * │  │  └────┴────┴────┴────┴────┴────┴────┴────┘                      │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * │                               │                                        │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │  Data Buffer (contiguous float32)                                │ │
 * │  │  ┌────────────────────────────────────────────────────────────┐  │ │
 * │  │  │ mat4A[16] │ mat4B[16] │ mat4C[16] │ mat4D[16] │ vec3[3] │...│  │ │
 * │  │  └────────────────────────────────────────────────────────────┘  │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * │                               │                                        │
 * │                               ▼ Single WASM Call                       │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │                    WASM: execute_batch()                         │ │
 * │  │  - Parse command buffer                                          │ │
 * │  │  - Execute all operations (SIMD optimized)                       │ │
 * │  │  - Write results to output buffer                                │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * │                               │                                        │
 * │                               ▼                                        │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │  Result Buffer                                                   │ │
 * │  │  ┌────────────────────────────────────────────────────────────┐  │ │
 * │  │  │ result0[16] │ result1[16] │ result2[3] │ result3[4] │ ...  │  │ │
 * │  │  └────────────────────────────────────────────────────────────┘  │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * │                               │                                        │
 * │                               ▼ Distribute to callbacks                │
 * │  ┌──────────────────────────────────────────────────────────────────┐ │
 * │  │  callback0(result0)                                              │ │
 * │  │  callback1(result1)                                              │ │
 * │  │  callback2(result2)                                              │ │
 * │  │  ...                                                             │ │
 * │  └──────────────────────────────────────────────────────────────────┘ │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import { WasmBridge } from './WasmBridge';

/** Operation codes for batch commands */
export enum WasmOpCode {
    // Vector operations (0x00-0x0F)
    VEC3_ADD = 0x00,
    VEC3_SUB = 0x01,
    VEC3_SCALE = 0x02,
    VEC3_NORMALIZE = 0x03,
    VEC3_DOT = 0x04,
    VEC3_CROSS = 0x05,
    VEC3_LERP = 0x06,
    VEC3_LENGTH = 0x07,
    VEC3_DISTANCE = 0x08,

    // Vector4 operations (0x10-0x1F)
    VEC4_ADD = 0x10,
    VEC4_SUB = 0x11,
    VEC4_SCALE = 0x12,
    VEC4_NORMALIZE = 0x13,
    VEC4_DOT = 0x14,

    // Quaternion operations (0x20-0x2F)
    QUAT_MULTIPLY = 0x20,
    QUAT_SLERP = 0x21,
    QUAT_NORMALIZE = 0x22,
    QUAT_INVERSE = 0x23,
    QUAT_FROM_EULER = 0x24,
    QUAT_TO_EULER = 0x25,
    QUAT_FROM_AXIS_ANGLE = 0x26,
    QUAT_ROTATE_VEC3 = 0x27,

    // Matrix operations (0x30-0x3F)
    MAT4_MULTIPLY = 0x30,
    MAT4_INVERT = 0x31,
    MAT4_TRANSPOSE = 0x32,
    MAT4_TRS = 0x33,
    MAT4_PERSPECTIVE = 0x34,
    MAT4_ORTHO = 0x35,
    MAT4_LOOK_AT = 0x36,
    MAT4_TRANSFORM_POINT = 0x37,
    MAT4_TRANSFORM_DIRECTION = 0x38,
    MAT4_DECOMPOSE = 0x39,

    // Batch operations (0x40-0x4F)
    BATCH_TRANSFORM_POINTS = 0x40,
    BATCH_MULTIPLY_MATRICES = 0x41,
    BATCH_SLERP_QUATS = 0x42,
    BATCH_SKINNING = 0x43,

    // Culling operations (0x50-0x5F)
    FRUSTUM_CULL_AABBS = 0x50,
    FRUSTUM_CULL_SPHERES = 0x51,

    // Physics operations (0x60-0x6F)
    PHYSICS_INTEGRATE = 0x60,
    PHYSICS_COLLISION_SPHERES = 0x61,

    // Animation operations (0x70-0x7F)
    SKELETON_INTERPOLATE = 0x70,
    SKELETON_BLEND = 0x71,
    MORPH_INTERPOLATE = 0x72,

    // Particle operations (0x80-0x8F)
    PARTICLES_UPDATE = 0x80,
    PARTICLES_EMIT = 0x81,
    PARTICLES_SORT = 0x82,
}

/** Size of output for each operation (in floats) */
const OP_OUTPUT_SIZE: Record<WasmOpCode, number> = {
    [WasmOpCode.VEC3_ADD]: 3,
    [WasmOpCode.VEC3_SUB]: 3,
    [WasmOpCode.VEC3_SCALE]: 3,
    [WasmOpCode.VEC3_NORMALIZE]: 3,
    [WasmOpCode.VEC3_DOT]: 1,
    [WasmOpCode.VEC3_CROSS]: 3,
    [WasmOpCode.VEC3_LERP]: 3,
    [WasmOpCode.VEC3_LENGTH]: 1,
    [WasmOpCode.VEC3_DISTANCE]: 1,
    [WasmOpCode.VEC4_ADD]: 4,
    [WasmOpCode.VEC4_SUB]: 4,
    [WasmOpCode.VEC4_SCALE]: 4,
    [WasmOpCode.VEC4_NORMALIZE]: 4,
    [WasmOpCode.VEC4_DOT]: 1,
    [WasmOpCode.QUAT_MULTIPLY]: 4,
    [WasmOpCode.QUAT_SLERP]: 4,
    [WasmOpCode.QUAT_NORMALIZE]: 4,
    [WasmOpCode.QUAT_INVERSE]: 4,
    [WasmOpCode.QUAT_FROM_EULER]: 4,
    [WasmOpCode.QUAT_TO_EULER]: 3,
    [WasmOpCode.QUAT_FROM_AXIS_ANGLE]: 4,
    [WasmOpCode.QUAT_ROTATE_VEC3]: 3,
    [WasmOpCode.MAT4_MULTIPLY]: 16,
    [WasmOpCode.MAT4_INVERT]: 16,
    [WasmOpCode.MAT4_TRANSPOSE]: 16,
    [WasmOpCode.MAT4_TRS]: 16,
    [WasmOpCode.MAT4_PERSPECTIVE]: 16,
    [WasmOpCode.MAT4_ORTHO]: 16,
    [WasmOpCode.MAT4_LOOK_AT]: 16,
    [WasmOpCode.MAT4_TRANSFORM_POINT]: 3,
    [WasmOpCode.MAT4_TRANSFORM_DIRECTION]: 3,
    [WasmOpCode.MAT4_DECOMPOSE]: 10, // pos(3) + rot(4) + scale(3)
    [WasmOpCode.BATCH_TRANSFORM_POINTS]: -1, // Variable
    [WasmOpCode.BATCH_MULTIPLY_MATRICES]: -1,
    [WasmOpCode.BATCH_SLERP_QUATS]: -1,
    [WasmOpCode.BATCH_SKINNING]: -1,
    [WasmOpCode.FRUSTUM_CULL_AABBS]: -1,
    [WasmOpCode.FRUSTUM_CULL_SPHERES]: -1,
    [WasmOpCode.PHYSICS_INTEGRATE]: -1,
    [WasmOpCode.PHYSICS_COLLISION_SPHERES]: -1,
    [WasmOpCode.SKELETON_INTERPOLATE]: -1,
    [WasmOpCode.SKELETON_BLEND]: -1,
    [WasmOpCode.MORPH_INTERPOLATE]: -1,
    [WasmOpCode.PARTICLES_UPDATE]: -1,
    [WasmOpCode.PARTICLES_EMIT]: -1,
    [WasmOpCode.PARTICLES_SORT]: -1,
};

/** Pending operation with callback */
interface PendingOperation {
    opCode: WasmOpCode;
    dataOffset: number;
    dataSize: number;
    outputOffset: number;
    outputSize: number;
    callback?: (result: Float32Array) => void;
}

/** Command header in buffer */
interface CommandHeader {
    opCode: WasmOpCode;
    count: number;      // Number of items for batch ops
    dataOffset: number; // Offset in data buffer
    outputOffset: number; // Offset in output buffer
}

/** Batch execution statistics */
export interface BatchStats {
    operationsQueued: number;
    operationsExecuted: number;
    batchesExecuted: number;
    wasmCallsSaved: number;
    totalDataBytes: number;
    averageBatchSize: number;
    executionTimeMs: number;
}

/**
 * WasmBatchProcessor - Main batch processing class
 */
export class WasmBatchProcessor {
    private static _instance: WasmBatchProcessor | null = null;

    // Buffers
    private _commandBuffer: Uint32Array;
    private _dataBuffer: Float32Array;
    private _outputBuffer: Float32Array;

    // Buffer positions
    private _commandOffset: number = 0;
    private _dataOffset: number = 0;
    private _outputOffset: number = 0;

    // Pending operations
    private _pendingOps: PendingOperation[] = [];

    // Grouped operations for batch execution
    private _groupedOps: Map<WasmOpCode, PendingOperation[]> = new Map();

    // Configuration
    private _commandBufferSize: number;
    private _dataBufferSize: number;
    private _outputBufferSize: number;
    private _minBatchSize: number;

    // Statistics
    private _stats: BatchStats = {
        operationsQueued: 0,
        operationsExecuted: 0,
        batchesExecuted: 0,
        wasmCallsSaved: 0,
        totalDataBytes: 0,
        averageBatchSize: 0,
        executionTimeMs: 0,
    };

    // WASM function pointer (matches execute_batch signature)
    private _wasmExecuteBatch: ((
        commands: Uint32Array,
        commandCount: number,
        data: Float32Array,
        output: Float32Array
    ) => number) | null = null;

    private constructor(options: {
        commandBufferSize?: number;
        dataBufferSize?: number;
        outputBufferSize?: number;
        minBatchSize?: number;
    } = {}) {
        this._commandBufferSize = options.commandBufferSize ?? 4096;
        this._dataBufferSize = options.dataBufferSize ?? 1024 * 1024; // 1MB
        this._outputBufferSize = options.outputBufferSize ?? 1024 * 1024;
        this._minBatchSize = options.minBatchSize ?? 8;

        // Allocate buffers
        this._commandBuffer = new Uint32Array(this._commandBufferSize);
        this._dataBuffer = new Float32Array(this._dataBufferSize);
        this._outputBuffer = new Float32Array(this._outputBufferSize);
    }

    static get instance(): WasmBatchProcessor {
        if (!this._instance) {
            this._instance = new WasmBatchProcessor();
        }
        return this._instance;
    }

    /** Get statistics */
    get stats(): BatchStats {
        return { ...this._stats };
    }

    /** Check if there are pending operations */
    get hasPendingOps(): boolean {
        return this._pendingOps.length > 0;
    }

    /** Get number of pending operations */
    get pendingCount(): number {
        return this._pendingOps.length;
    }

    // ==================== Queue Operations ====================

    /**
     * Queue a Vec3 add operation
     */
    queueVec3Add(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_ADD, [a[0], a[1], a[2], b[0], b[1], b[2]], 3, callback);
    }

    /**
     * Queue a Vec3 subtract operation
     */
    queueVec3Sub(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_SUB, [a[0], a[1], a[2], b[0], b[1], b[2]], 3, callback);
    }

    /**
     * Queue a Vec3 scale operation
     */
    queueVec3Scale(v: ArrayLike<number>, s: number, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_SCALE, [v[0], v[1], v[2], s], 3, callback);
    }

    /**
     * Queue a Vec3 normalize operation
     */
    queueVec3Normalize(v: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_NORMALIZE, [v[0], v[1], v[2]], 3, callback);
    }

    /**
     * Queue a Vec3 dot product
     */
    queueVec3Dot(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_DOT, [a[0], a[1], a[2], b[0], b[1], b[2]], 1, callback);
    }

    /**
     * Queue a Vec3 cross product
     */
    queueVec3Cross(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_CROSS, [a[0], a[1], a[2], b[0], b[1], b[2]], 3, callback);
    }

    /**
     * Queue a Vec3 lerp
     */
    queueVec3Lerp(a: ArrayLike<number>, b: ArrayLike<number>, t: number, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.VEC3_LERP, [a[0], a[1], a[2], b[0], b[1], b[2], t], 3, callback);
    }

    /**
     * Queue a quaternion multiply
     */
    queueQuatMultiply(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.QUAT_MULTIPLY, [a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3]], 4, callback);
    }

    /**
     * Queue a quaternion SLERP
     */
    queueQuatSlerp(a: ArrayLike<number>, b: ArrayLike<number>, t: number, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.QUAT_SLERP, [a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], t], 4, callback);
    }

    /**
     * Queue a quaternion normalize
     */
    queueQuatNormalize(q: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.QUAT_NORMALIZE, [q[0], q[1], q[2], q[3]], 4, callback);
    }

    /**
     * Queue quaternion from euler angles
     */
    queueQuatFromEuler(x: number, y: number, z: number, callback?: (result: Float32Array) => void): void {
        this._queueOp(WasmOpCode.QUAT_FROM_EULER, [x, y, z], 4, callback);
    }

    /**
     * Queue a matrix multiply
     */
    queueMat4Multiply(a: ArrayLike<number>, b: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        const data = new Array(32);
        for (let i = 0; i < 16; i++) {
            data[i] = a[i];
            data[i + 16] = b[i];
        }
        this._queueOp(WasmOpCode.MAT4_MULTIPLY, data, 16, callback);
    }

    /**
     * Queue a matrix invert
     */
    queueMat4Invert(m: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        const data = Array.from(m).slice(0, 16);
        this._queueOp(WasmOpCode.MAT4_INVERT, data, 16, callback);
    }

    /**
     * Queue a TRS matrix creation
     */
    queueMat4TRS(
        t: ArrayLike<number>,
        r: ArrayLike<number>,
        s: ArrayLike<number>,
        callback?: (result: Float32Array) => void
    ): void {
        this._queueOp(WasmOpCode.MAT4_TRS, [
            t[0], t[1], t[2],
            r[0], r[1], r[2], r[3],
            s[0], s[1], s[2]
        ], 16, callback);
    }

    /**
     * Queue transform point by matrix
     */
    queueMat4TransformPoint(m: ArrayLike<number>, p: ArrayLike<number>, callback?: (result: Float32Array) => void): void {
        const data = new Array(19);
        for (let i = 0; i < 16; i++) data[i] = m[i];
        data[16] = p[0];
        data[17] = p[1];
        data[18] = p[2];
        this._queueOp(WasmOpCode.MAT4_TRANSFORM_POINT, data, 3, callback);
    }

    /**
     * Queue batch transform points
     */
    queueBatchTransformPoints(
        matrix: ArrayLike<number>,
        points: Float32Array,
        callback?: (result: Float32Array) => void
    ): void {
        const count = points.length / 3;
        const data = new Array(16 + points.length);
        for (let i = 0; i < 16; i++) data[i] = matrix[i];
        for (let i = 0; i < points.length; i++) data[16 + i] = points[i];

        this._queueOp(WasmOpCode.BATCH_TRANSFORM_POINTS, data, count * 3, callback);
    }

    /**
     * Queue batch matrix multiply (chain of matrices)
     */
    queueBatchMultiplyMatrices(matrices: Float32Array[], callback?: (result: Float32Array) => void): void {
        const totalFloats = matrices.length * 16;
        const data = new Array(totalFloats);
        let offset = 0;
        for (const m of matrices) {
            for (let i = 0; i < 16; i++) {
                data[offset++] = m[i];
            }
        }
        this._queueOp(WasmOpCode.BATCH_MULTIPLY_MATRICES, data, 16, callback);
    }

    /**
     * Queue batch quaternion SLERP
     */
    queueBatchSlerpQuats(
        quatsA: Float32Array,
        quatsB: Float32Array,
        t: number,
        callback?: (result: Float32Array) => void
    ): void {
        const count = quatsA.length / 4;
        const data = new Array(quatsA.length + quatsB.length + 1);
        let offset = 0;
        for (let i = 0; i < quatsA.length; i++) data[offset++] = quatsA[i];
        for (let i = 0; i < quatsB.length; i++) data[offset++] = quatsB[i];
        data[offset] = t;

        this._queueOp(WasmOpCode.BATCH_SLERP_QUATS, data, count * 4, callback);
    }

    /**
     * Queue frustum culling of AABBs
     */
    queueFrustumCullAABBs(
        frustumPlanes: Float32Array, // 6 planes * 4 floats = 24
        aabbs: Float32Array, // N * 6 floats (min, max)
        callback?: (result: Float32Array) => void
    ): void {
        const count = aabbs.length / 6;
        const data = new Array(24 + aabbs.length);
        for (let i = 0; i < 24; i++) data[i] = frustumPlanes[i];
        for (let i = 0; i < aabbs.length; i++) data[24 + i] = aabbs[i];

        // Output is visibility mask (1 float per AABB, 0 or 1)
        this._queueOp(WasmOpCode.FRUSTUM_CULL_AABBS, data, count, callback);
    }

    /**
     * Queue skeleton interpolation
     */
    queueSkeletonInterpolate(
        bonesA: Float32Array,
        bonesB: Float32Array,
        t: number,
        callback?: (result: Float32Array) => void
    ): void {
        const data = new Array(bonesA.length + bonesB.length + 1);
        let offset = 0;
        for (let i = 0; i < bonesA.length; i++) data[offset++] = bonesA[i];
        for (let i = 0; i < bonesB.length; i++) data[offset++] = bonesB[i];
        data[offset] = t;

        this._queueOp(WasmOpCode.SKELETON_INTERPOLATE, data, bonesA.length, callback);
    }

    // ==================== Internal Queue Management ====================

    private _queueOp(opCode: WasmOpCode, data: number[], outputSize: number, callback?: (result: Float32Array) => void): void {
        // Check buffer space
        if (this._dataOffset + data.length > this._dataBufferSize) {
            console.warn('[WasmBatch] Data buffer full, executing pending ops');
            this.flush();
        }

        // Write data to buffer
        const dataOffset = this._dataOffset;
        for (let i = 0; i < data.length; i++) {
            this._dataBuffer[this._dataOffset++] = data[i];
        }

        // Create pending operation
        const op: PendingOperation = {
            opCode,
            dataOffset,
            dataSize: data.length,
            outputOffset: this._outputOffset,
            outputSize,
            callback,
        };

        this._outputOffset += outputSize;
        this._pendingOps.push(op);
        this._stats.operationsQueued++;

        // Group by opcode
        if (!this._groupedOps.has(opCode)) {
            this._groupedOps.set(opCode, []);
        }
        this._groupedOps.get(opCode)!.push(op);
    }

    // ==================== Execution ====================

    /**
     * Flush and execute all pending operations
     */
    flush(): void {
        if (this._pendingOps.length === 0) return;

        const startTime = performance.now();

        // Group operations by type and execute in batches
        for (const [opCode, ops] of this._groupedOps) {
            if (ops.length >= this._minBatchSize) {
                // Execute as batch
                this._executeBatch(opCode, ops);
            } else {
                // Execute individually (not worth batching)
                for (const op of ops) {
                    this._executeIndividual(op);
                }
            }
        }

        // Calculate savings
        const potentialCalls = this._pendingOps.length;
        const actualCalls = this._stats.batchesExecuted;
        this._stats.wasmCallsSaved += potentialCalls - actualCalls;
        this._stats.operationsExecuted += this._pendingOps.length;
        this._stats.totalDataBytes += this._dataOffset * 4;

        // Distribute results
        this._distributeResults();

        // Update stats
        this._stats.executionTimeMs = performance.now() - startTime;
        this._stats.averageBatchSize = this._pendingOps.length / Math.max(1, this._groupedOps.size);

        // Reset
        this._reset();
    }

    private _executeBatch(opCode: WasmOpCode, ops: PendingOperation[]): void {
        // Build command buffer for this batch
        const commandStart = this._commandOffset;

        // Command header: opCode, count, dataOffset, outputOffset
        this._commandBuffer[this._commandOffset++] = opCode;
        this._commandBuffer[this._commandOffset++] = ops.length;
        this._commandBuffer[this._commandOffset++] = ops[0].dataOffset;
        this._commandBuffer[this._commandOffset++] = ops[0].outputOffset;

        // Try WASM execution first
        const bridge = WasmBridge.instance;
        if (bridge.isReady && !bridge.usingFallback && this._wasmExecuteBatch) {
            try {
                // Create command slice for this batch
                const cmdSlice = this._commandBuffer.subarray(commandStart, this._commandOffset);
                const dataSlice = this._dataBuffer.subarray(0, this._dataOffset);
                const outputSlice = this._outputBuffer.subarray(0, this._outputOffset);

                this._wasmExecuteBatch(cmdSlice, 1, dataSlice, outputSlice);
            } catch (e) {
                // Fallback on error
                this._executeFallback(opCode, ops);
            }
        } else {
            // JavaScript fallback
            this._executeFallback(opCode, ops);
        }

        this._stats.batchesExecuted++;
    }

    private _executeIndividual(op: PendingOperation): void {
        // Execute single operation via fallback
        this._executeFallback(op.opCode, [op]);
        this._stats.batchesExecuted++;
    }

    private _executeFallback(opCode: WasmOpCode, ops: PendingOperation[]): void {
        for (const op of ops) {
            const inputData = this._dataBuffer.subarray(op.dataOffset, op.dataOffset + op.dataSize);

            switch (opCode) {
                case WasmOpCode.VEC3_ADD:
                    this._outputBuffer[op.outputOffset] = inputData[0] + inputData[3];
                    this._outputBuffer[op.outputOffset + 1] = inputData[1] + inputData[4];
                    this._outputBuffer[op.outputOffset + 2] = inputData[2] + inputData[5];
                    break;

                case WasmOpCode.VEC3_SUB:
                    this._outputBuffer[op.outputOffset] = inputData[0] - inputData[3];
                    this._outputBuffer[op.outputOffset + 1] = inputData[1] - inputData[4];
                    this._outputBuffer[op.outputOffset + 2] = inputData[2] - inputData[5];
                    break;

                case WasmOpCode.VEC3_SCALE:
                    this._outputBuffer[op.outputOffset] = inputData[0] * inputData[3];
                    this._outputBuffer[op.outputOffset + 1] = inputData[1] * inputData[3];
                    this._outputBuffer[op.outputOffset + 2] = inputData[2] * inputData[3];
                    break;

                case WasmOpCode.VEC3_NORMALIZE: {
                    const len = Math.sqrt(inputData[0] ** 2 + inputData[1] ** 2 + inputData[2] ** 2);
                    if (len > 0) {
                        this._outputBuffer[op.outputOffset] = inputData[0] / len;
                        this._outputBuffer[op.outputOffset + 1] = inputData[1] / len;
                        this._outputBuffer[op.outputOffset + 2] = inputData[2] / len;
                    }
                    break;
                }

                case WasmOpCode.VEC3_DOT:
                    this._outputBuffer[op.outputOffset] =
                        inputData[0] * inputData[3] +
                        inputData[1] * inputData[4] +
                        inputData[2] * inputData[5];
                    break;

                case WasmOpCode.VEC3_CROSS:
                    this._outputBuffer[op.outputOffset] = inputData[1] * inputData[5] - inputData[2] * inputData[4];
                    this._outputBuffer[op.outputOffset + 1] = inputData[2] * inputData[3] - inputData[0] * inputData[5];
                    this._outputBuffer[op.outputOffset + 2] = inputData[0] * inputData[4] - inputData[1] * inputData[3];
                    break;

                case WasmOpCode.VEC3_LERP: {
                    const t = inputData[6];
                    this._outputBuffer[op.outputOffset] = inputData[0] + (inputData[3] - inputData[0]) * t;
                    this._outputBuffer[op.outputOffset + 1] = inputData[1] + (inputData[4] - inputData[1]) * t;
                    this._outputBuffer[op.outputOffset + 2] = inputData[2] + (inputData[5] - inputData[2]) * t;
                    break;
                }

                case WasmOpCode.QUAT_MULTIPLY: {
                    const ax = inputData[0], ay = inputData[1], az = inputData[2], aw = inputData[3];
                    const bx = inputData[4], by = inputData[5], bz = inputData[6], bw = inputData[7];
                    this._outputBuffer[op.outputOffset] = aw * bx + ax * bw + ay * bz - az * by;
                    this._outputBuffer[op.outputOffset + 1] = aw * by - ax * bz + ay * bw + az * bx;
                    this._outputBuffer[op.outputOffset + 2] = aw * bz + ax * by - ay * bx + az * bw;
                    this._outputBuffer[op.outputOffset + 3] = aw * bw - ax * bx - ay * by - az * bz;
                    break;
                }

                case WasmOpCode.QUAT_SLERP: {
                    const ax = inputData[0], ay = inputData[1], az = inputData[2], aw = inputData[3];
                    let bx = inputData[4], by = inputData[5], bz = inputData[6], bw = inputData[7];
                    const t = inputData[8];

                    let cosom = ax * bx + ay * by + az * bz + aw * bw;
                    if (cosom < 0) {
                        cosom = -cosom;
                        bx = -bx; by = -by; bz = -bz; bw = -bw;
                    }

                    let scale0: number, scale1: number;
                    if (1 - cosom > 0.000001) {
                        const omega = Math.acos(cosom);
                        const sinom = Math.sin(omega);
                        scale0 = Math.sin((1 - t) * omega) / sinom;
                        scale1 = Math.sin(t * omega) / sinom;
                    } else {
                        scale0 = 1 - t;
                        scale1 = t;
                    }

                    this._outputBuffer[op.outputOffset] = scale0 * ax + scale1 * bx;
                    this._outputBuffer[op.outputOffset + 1] = scale0 * ay + scale1 * by;
                    this._outputBuffer[op.outputOffset + 2] = scale0 * az + scale1 * bz;
                    this._outputBuffer[op.outputOffset + 3] = scale0 * aw + scale1 * bw;
                    break;
                }

                case WasmOpCode.MAT4_MULTIPLY: {
                    const a = inputData.subarray(0, 16);
                    const b = inputData.subarray(16, 32);
                    for (let i = 0; i < 4; i++) {
                        for (let j = 0; j < 4; j++) {
                            this._outputBuffer[op.outputOffset + i * 4 + j] =
                                a[i * 4 + 0] * b[0 * 4 + j] +
                                a[i * 4 + 1] * b[1 * 4 + j] +
                                a[i * 4 + 2] * b[2 * 4 + j] +
                                a[i * 4 + 3] * b[3 * 4 + j];
                        }
                    }
                    break;
                }

                case WasmOpCode.MAT4_TRS: {
                    const tx = inputData[0], ty = inputData[1], tz = inputData[2];
                    const rx = inputData[3], ry = inputData[4], rz = inputData[5], rw = inputData[6];
                    const sx = inputData[7], sy = inputData[8], sz = inputData[9];

                    const x2 = rx + rx, y2 = ry + ry, z2 = rz + rz;
                    const xx = rx * x2, xy = rx * y2, xz = rx * z2;
                    const yy = ry * y2, yz = ry * z2, zz = rz * z2;
                    const wx = rw * x2, wy = rw * y2, wz = rw * z2;

                    const out = op.outputOffset;
                    this._outputBuffer[out + 0] = (1 - (yy + zz)) * sx;
                    this._outputBuffer[out + 1] = (xy + wz) * sx;
                    this._outputBuffer[out + 2] = (xz - wy) * sx;
                    this._outputBuffer[out + 3] = 0;
                    this._outputBuffer[out + 4] = (xy - wz) * sy;
                    this._outputBuffer[out + 5] = (1 - (xx + zz)) * sy;
                    this._outputBuffer[out + 6] = (yz + wx) * sy;
                    this._outputBuffer[out + 7] = 0;
                    this._outputBuffer[out + 8] = (xz + wy) * sz;
                    this._outputBuffer[out + 9] = (yz - wx) * sz;
                    this._outputBuffer[out + 10] = (1 - (xx + yy)) * sz;
                    this._outputBuffer[out + 11] = 0;
                    this._outputBuffer[out + 12] = tx;
                    this._outputBuffer[out + 13] = ty;
                    this._outputBuffer[out + 14] = tz;
                    this._outputBuffer[out + 15] = 1;
                    break;
                }

                default:
                    console.warn(`[WasmBatch] Unhandled opcode: ${opCode}`);
            }
        }
    }

    private _distributeResults(): void {
        for (const op of this._pendingOps) {
            if (op.callback) {
                const result = this._outputBuffer.subarray(op.outputOffset, op.outputOffset + op.outputSize);
                op.callback(new Float32Array(result));
            }
        }
    }

    private _reset(): void {
        this._commandOffset = 0;
        this._dataOffset = 0;
        this._outputOffset = 0;
        this._pendingOps = [];
        this._groupedOps.clear();
    }

    // ==================== Sync API (for small immediate operations) ====================

    /**
     * Execute immediately without batching (for single critical operations)
     */
    executeImmediate<T extends Float32Array>(opCode: WasmOpCode, data: number[]): T {
        const outputSize = OP_OUTPUT_SIZE[opCode] ?? 16;
        const result = new Float32Array(outputSize) as T;

        // Use fallback execution
        const tempOp: PendingOperation = {
            opCode,
            dataOffset: 0,
            dataSize: data.length,
            outputOffset: 0,
            outputSize,
        };

        // Temporarily use data buffer
        for (let i = 0; i < data.length; i++) {
            this._dataBuffer[i] = data[i];
        }

        this._executeFallback(opCode, [tempOp]);

        // Copy result
        for (let i = 0; i < outputSize; i++) {
            result[i] = this._outputBuffer[i];
        }

        return result;
    }

    // ==================== Lifecycle ====================

    /**
     * Reset statistics
     */
    resetStats(): void {
        this._stats = {
            operationsQueued: 0,
            operationsExecuted: 0,
            batchesExecuted: 0,
            wasmCallsSaved: 0,
            totalDataBytes: 0,
            averageBatchSize: 0,
            executionTimeMs: 0,
        };
    }

    /**
     * Clear all pending operations without executing
     */
    clear(): void {
        this._reset();
    }

    /**
     * Set WASM execute batch function
     */
    setWasmExecutor(fn: (commands: Uint32Array, commandCount: number, data: Float32Array, output: Float32Array) => number): void {
        this._wasmExecuteBatch = fn;
    }

    /**
     * Initialize the batch processor with WASM module
     * Should be called after WasmBridge.init()
     */
    async init(): Promise<void> {
        try {
            const bridge = WasmBridge.instance;
            if (!bridge.isReady) {
                console.warn('[WasmBatchProcessor] WasmBridge not ready, using fallback');
                return;
            }

            if (bridge.usingFallback) {
                console.log('[WasmBatchProcessor] Using JavaScript fallback');
                return;
            }

            // Dynamically import the WASM module to get execute_batch
            const isNode = typeof process !== 'undefined' && process.versions?.node;
            let wasmModule: any;

            if (isNode) {
                const { pathToFileURL } = await import('url');
                const moduleUrl = pathToFileURL('/home/user/engine/dist/wasm/engine_core.js').href;
                wasmModule = await import(moduleUrl);
            } else {
                wasmModule = await import('/dist/wasm/engine_core.js');
            }

            if (typeof wasmModule.execute_batch === 'function') {
                this._wasmExecuteBatch = wasmModule.execute_batch;
                console.log('[WasmBatchProcessor] WASM execute_batch connected');
            } else {
                console.warn('[WasmBatchProcessor] execute_batch not found in WASM module');
            }
        } catch (e) {
            console.warn('[WasmBatchProcessor] Failed to connect WASM:', e);
        }
    }
}
