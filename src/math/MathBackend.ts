/**
 * MathBackend - Unified abstraction for math operations
 *
 * Automatically selects the best backend based on:
 * - Operation type
 * - Batch size
 * - Available backends (JS, WASM)
 *
 * Based on benchmarks:
 * - JS is better for: single operations, small batches
 * - WASM batch is better for: 10+ similar operations, skinning, particles
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         MathBackend                                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  User Code                                                          │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │  MathBackend.mat4Multiply(a, b)                             │   │
 * │  │  MathBackend.batchTransform(matrix, points)                 │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              │                                      │
 * │                              ▼                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Decision Engine                          │   │
 * │  │  if (count < threshold) → JavaScript                        │   │
 * │  │  if (count >= threshold && WASM ready) → WASM Batch         │   │
 * │  │  if (GPU available && count > 1000) → GPU Compute           │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              │                                      │
 * │           ┌──────────────────┼──────────────────┐                  │
 * │           ▼                  ▼                  ▼                  │
 * │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
 * │  │   JavaScript    │ │   WASM Batch    │ │   GPU Compute   │      │
 * │  │   (inline)      │ │   (Rust)        │ │   (WebGPU)      │      │
 * │  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { WasmBatchProcessor, WasmOpCode } from '../wasm/WasmBatchProcessor';

// ==================== Configuration ====================

export interface BackendConfig {
    /** Minimum batch size to use WASM (default: 10) */
    wasmBatchThreshold: number;
    /** Minimum batch size to use GPU (default: 1000) */
    gpuBatchThreshold: number;
    /** Force specific backend */
    forceBackend?: 'js' | 'wasm' | 'gpu';
    /** Enable performance tracking */
    trackPerformance: boolean;
}

const DEFAULT_CONFIG: BackendConfig = {
    wasmBatchThreshold: 10,
    gpuBatchThreshold: 1000,
    trackPerformance: false,
};

// ==================== Performance Stats ====================

export interface BackendStats {
    jsOperations: number;
    wasmOperations: number;
    gpuOperations: number;
    jsTimeMs: number;
    wasmTimeMs: number;
    gpuTimeMs: number;
}

// ==================== MathBackend ====================

/**
 * Unified math operations with automatic backend selection
 */
export class MathBackend {
    private static _config: BackendConfig = { ...DEFAULT_CONFIG };
    private static _stats: BackendStats = {
        jsOperations: 0,
        wasmOperations: 0,
        gpuOperations: 0,
        jsTimeMs: 0,
        wasmTimeMs: 0,
        gpuTimeMs: 0,
    };
    private static _wasmAvailable = false;
    private static _gpuAvailable = false;

    /**
     * Configure the backend
     */
    static configure(config: Partial<BackendConfig>): void {
        this._config = { ...this._config, ...config };
    }

    /**
     * Get current configuration
     */
    static get config(): BackendConfig {
        return { ...this._config };
    }

    /**
     * Get performance statistics
     */
    static get stats(): BackendStats {
        return { ...this._stats };
    }

    /**
     * Reset statistics
     */
    static resetStats(): void {
        this._stats = {
            jsOperations: 0,
            wasmOperations: 0,
            gpuOperations: 0,
            jsTimeMs: 0,
            wasmTimeMs: 0,
            gpuTimeMs: 0,
        };
    }

    /**
     * Set WASM availability
     */
    static setWasmAvailable(available: boolean): void {
        this._wasmAvailable = available;
    }

    /**
     * Set GPU availability
     */
    static setGpuAvailable(available: boolean): void {
        this._gpuAvailable = available;
    }

    // ==================== Vector3 Operations ====================

    /**
     * Add two vectors
     */
    static vec3Add(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        out[2] = a[2] + b[2];
        this._stats.jsOperations++;
        return out;
    }

    /**
     * Subtract two vectors
     */
    static vec3Sub(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        out[2] = a[2] - b[2];
        this._stats.jsOperations++;
        return out;
    }

    /**
     * Scale a vector
     */
    static vec3Scale(out: Float32Array, v: Float32Array, s: number): Float32Array {
        out[0] = v[0] * s;
        out[1] = v[1] * s;
        out[2] = v[2] * s;
        this._stats.jsOperations++;
        return out;
    }

    /**
     * Normalize a vector
     */
    static vec3Normalize(out: Float32Array, v: Float32Array): Float32Array {
        const x = v[0], y = v[1], z = v[2];
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0) {
            const inv = 1 / len;
            out[0] = x * inv;
            out[1] = y * inv;
            out[2] = z * inv;
        } else {
            out[0] = out[1] = out[2] = 0;
        }
        this._stats.jsOperations++;
        return out;
    }

    /**
     * Dot product
     */
    static vec3Dot(a: Float32Array, b: Float32Array): number {
        this._stats.jsOperations++;
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    /**
     * Cross product
     */
    static vec3Cross(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
        out[0] = a[1] * b[2] - a[2] * b[1];
        out[1] = a[2] * b[0] - a[0] * b[2];
        out[2] = a[0] * b[1] - a[1] * b[0];
        this._stats.jsOperations++;
        return out;
    }

    /**
     * Lerp between vectors
     */
    static vec3Lerp(out: Float32Array, a: Float32Array, b: Float32Array, t: number): Float32Array {
        out[0] = a[0] + (b[0] - a[0]) * t;
        out[1] = a[1] + (b[1] - a[1]) * t;
        out[2] = a[2] + (b[2] - a[2]) * t;
        this._stats.jsOperations++;
        return out;
    }

    // ==================== Quaternion Operations ====================

    /**
     * Multiply quaternions
     */
    static quatMultiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];

        out[0] = aw * bx + ax * bw + ay * bz - az * by;
        out[1] = aw * by - ax * bz + ay * bw + az * bx;
        out[2] = aw * bz + ax * by - ay * bx + az * bw;
        out[3] = aw * bw - ax * bx - ay * by - az * bz;

        this._stats.jsOperations++;
        return out;
    }

    /**
     * SLERP between quaternions
     */
    static quatSlerp(out: Float32Array, a: Float32Array, b: Float32Array, t: number): Float32Array {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        let bx = b[0], by = b[1], bz = b[2], bw = b[3];

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

        out[0] = scale0 * ax + scale1 * bx;
        out[1] = scale0 * ay + scale1 * by;
        out[2] = scale0 * az + scale1 * bz;
        out[3] = scale0 * aw + scale1 * bw;

        this._stats.jsOperations++;
        return out;
    }

    /**
     * Normalize quaternion
     */
    static quatNormalize(out: Float32Array, q: Float32Array): Float32Array {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            out[0] = x * len;
            out[1] = y * len;
            out[2] = z * len;
            out[3] = w * len;
        } else {
            out[0] = out[1] = out[2] = 0;
            out[3] = 1;
        }
        this._stats.jsOperations++;
        return out;
    }

    // ==================== Matrix4 Operations ====================

    /**
     * Multiply 4x4 matrices
     */
    static mat4Multiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        this._stats.jsOperations++;
        return out;
    }

    /**
     * Create TRS matrix
     */
    static mat4FromTRS(
        out: Float32Array,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number, rw: number,
        sx: number, sy: number, sz: number
    ): Float32Array {
        const x2 = rx + rx, y2 = ry + ry, z2 = rz + rz;
        const xx = rx * x2, xy = rx * y2, xz = rx * z2;
        const yy = ry * y2, yz = ry * z2, zz = rz * z2;
        const wx = rw * x2, wy = rw * y2, wz = rw * z2;

        out[0] = (1 - (yy + zz)) * sx;
        out[1] = (xy + wz) * sx;
        out[2] = (xz - wy) * sx;
        out[3] = 0;
        out[4] = (xy - wz) * sy;
        out[5] = (1 - (xx + zz)) * sy;
        out[6] = (yz + wx) * sy;
        out[7] = 0;
        out[8] = (xz + wy) * sz;
        out[9] = (yz - wx) * sz;
        out[10] = (1 - (xx + yy)) * sz;
        out[11] = 0;
        out[12] = tx;
        out[13] = ty;
        out[14] = tz;
        out[15] = 1;

        this._stats.jsOperations++;
        return out;
    }

    /**
     * Transform point by matrix
     */
    static mat4TransformPoint(out: Float32Array, m: Float32Array, p: Float32Array): Float32Array {
        const x = p[0], y = p[1], z = p[2];
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        const invW = w !== 0 ? 1 / w : 1;

        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;

        this._stats.jsOperations++;
        return out;
    }

    // ==================== Batch Operations ====================

    /**
     * Batch transform points by matrix
     * Automatically selects best backend based on count
     */
    static batchTransformPoints(
        out: Float32Array,
        matrix: Float32Array,
        points: Float32Array
    ): Float32Array {
        const count = points.length / 3;

        if (this._shouldUseWasm(count)) {
            return this._batchTransformPointsWasm(out, matrix, points);
        } else {
            return this._batchTransformPointsJS(out, matrix, points);
        }
    }

    private static _batchTransformPointsJS(
        out: Float32Array,
        m: Float32Array,
        points: Float32Array
    ): Float32Array {
        const count = points.length / 3;

        for (let i = 0; i < count; i++) {
            const x = points[i * 3];
            const y = points[i * 3 + 1];
            const z = points[i * 3 + 2];

            const w = m[3] * x + m[7] * y + m[11] * z + m[15];
            const invW = w !== 0 ? 1 / w : 1;

            out[i * 3] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
            out[i * 3 + 1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
            out[i * 3 + 2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
        }

        this._stats.jsOperations += count;
        return out;
    }

    private static _batchTransformPointsWasm(
        out: Float32Array,
        matrix: Float32Array,
        points: Float32Array
    ): Float32Array {
        const batch = WasmBatchProcessor.instance;
        batch.queueBatchTransformPoints(matrix, points, (result) => {
            out.set(result);
        });
        batch.flush();

        this._stats.wasmOperations += points.length / 3;
        return out;
    }

    /**
     * Batch SLERP quaternions
     */
    static batchSlerpQuats(
        out: Float32Array,
        quatsA: Float32Array,
        quatsB: Float32Array,
        t: number
    ): Float32Array {
        const count = quatsA.length / 4;

        if (this._shouldUseWasm(count)) {
            return this._batchSlerpQuatsWasm(out, quatsA, quatsB, t);
        } else {
            return this._batchSlerpQuatsJS(out, quatsA, quatsB, t);
        }
    }

    private static _batchSlerpQuatsJS(
        out: Float32Array,
        quatsA: Float32Array,
        quatsB: Float32Array,
        t: number
    ): Float32Array {
        const count = quatsA.length / 4;
        const tempA = new Float32Array(4);
        const tempB = new Float32Array(4);
        const tempOut = new Float32Array(4);

        for (let i = 0; i < count; i++) {
            const offset = i * 4;
            tempA[0] = quatsA[offset];
            tempA[1] = quatsA[offset + 1];
            tempA[2] = quatsA[offset + 2];
            tempA[3] = quatsA[offset + 3];

            tempB[0] = quatsB[offset];
            tempB[1] = quatsB[offset + 1];
            tempB[2] = quatsB[offset + 2];
            tempB[3] = quatsB[offset + 3];

            this.quatSlerp(tempOut, tempA, tempB, t);

            out[offset] = tempOut[0];
            out[offset + 1] = tempOut[1];
            out[offset + 2] = tempOut[2];
            out[offset + 3] = tempOut[3];
        }

        return out;
    }

    private static _batchSlerpQuatsWasm(
        out: Float32Array,
        quatsA: Float32Array,
        quatsB: Float32Array,
        t: number
    ): Float32Array {
        const batch = WasmBatchProcessor.instance;
        batch.queueBatchSlerpQuats(quatsA, quatsB, t, (result) => {
            out.set(result);
        });
        batch.flush();

        this._stats.wasmOperations += quatsA.length / 4;
        return out;
    }

    /**
     * Batch compute TRS matrices
     */
    static batchComputeTRS(
        out: Float32Array,
        positions: Float32Array,
        rotations: Float32Array,
        scales: Float32Array
    ): Float32Array {
        const count = positions.length / 3;

        if (this._shouldUseWasm(count)) {
            // TODO: Implement WASM batch TRS
            return this._batchComputeTRSJS(out, positions, rotations, scales);
        } else {
            return this._batchComputeTRSJS(out, positions, rotations, scales);
        }
    }

    private static _batchComputeTRSJS(
        out: Float32Array,
        positions: Float32Array,
        rotations: Float32Array,
        scales: Float32Array
    ): Float32Array {
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            const pOff = i * 3;
            const rOff = i * 4;
            const sOff = i * 3;
            const mOff = i * 16;

            this.mat4FromTRS(
                out.subarray(mOff, mOff + 16),
                positions[pOff], positions[pOff + 1], positions[pOff + 2],
                rotations[rOff], rotations[rOff + 1], rotations[rOff + 2], rotations[rOff + 3],
                scales[sOff], scales[sOff + 1], scales[sOff + 2]
            );
        }

        return out;
    }

    // ==================== Backend Selection ====================

    private static _shouldUseWasm(count: number): boolean {
        if (this._config.forceBackend === 'js') return false;
        if (this._config.forceBackend === 'wasm') return this._wasmAvailable;

        return this._wasmAvailable && count >= this._config.wasmBatchThreshold;
    }

    private static _shouldUseGpu(count: number): boolean {
        if (this._config.forceBackend === 'gpu') return this._gpuAvailable;
        if (this._config.forceBackend) return false;

        return this._gpuAvailable && count >= this._config.gpuBatchThreshold;
    }
}
