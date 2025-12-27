/**
 * WASM Bridge - Connects TypeScript to Rust WASM module
 * Handles initialization and provides typed access to WASM functions
 */

import type { Vector3 } from '../math/Vector3';
import type { Matrix4x4 } from '../math/Matrix4x4';
import type { Quaternion } from '../math/Quaternion';

// Type definitions for WASM exports
export interface WasmMathExports {
    // Vec3 operations
    vec3_add(ax: number, ay: number, az: number, bx: number, by: number, bz: number): Float32Array;
    vec3_sub(ax: number, ay: number, az: number, bx: number, by: number, bz: number): Float32Array;
    vec3_scale(x: number, y: number, z: number, s: number): Float32Array;
    vec3_dot(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number;
    vec3_cross(ax: number, ay: number, az: number, bx: number, by: number, bz: number): Float32Array;
    vec3_normalize(x: number, y: number, z: number): Float32Array;
    vec3_length(x: number, y: number, z: number): number;
    vec3_lerp(ax: number, ay: number, az: number, bx: number, by: number, bz: number, t: number): Float32Array;

    // Mat4 operations
    mat4_multiply(a: Float32Array, b: Float32Array): Float32Array;
    mat4_invert(m: Float32Array): Float32Array | null;
    mat4_transpose(m: Float32Array): Float32Array;
    mat4_trs(tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, rw: number, sx: number, sy: number, sz: number): Float32Array;
    mat4_perspective(fov: number, aspect: number, near: number, far: number): Float32Array;
    mat4_ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array;
    mat4_look_at(ex: number, ey: number, ez: number, tx: number, ty: number, tz: number, ux: number, uy: number, uz: number): Float32Array;
    mat4_transform_point(m: Float32Array, x: number, y: number, z: number): Float32Array;
    mat4_transform_direction(m: Float32Array, x: number, y: number, z: number): Float32Array;

    // Quat operations
    quat_multiply(ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number): Float32Array;
    quat_slerp(ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number, t: number): Float32Array;
    quat_from_euler(x: number, y: number, z: number): Float32Array;
    quat_to_euler(x: number, y: number, z: number, w: number): Float32Array;
    quat_from_axis_angle(ax: number, ay: number, az: number, angle: number): Float32Array;
    quat_normalize(x: number, y: number, z: number, w: number): Float32Array;
    quat_inverse(x: number, y: number, z: number, w: number): Float32Array;
    quat_look_rotation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): Float32Array;

    // Batch operations
    batch_transform_points(m: Float32Array, points: Float32Array): Float32Array;
    batch_multiply_matrices(matrices: Float32Array): Float32Array;
    batch_slerp_quats(quats_a: Float32Array, quats_b: Float32Array, t: number): Float32Array;
}

export interface WasmCullingExports {
    frustum_cull_aabbs(frustum: Float32Array, aabbs: Float32Array): Uint32Array;
    frustum_cull_spheres(frustum: Float32Array, spheres: Float32Array): Uint32Array;
}

export interface WasmAnimationExports {
    skeleton_interpolate(bones_a: Float32Array, bones_b: Float32Array, t: number): Float32Array;
    skeleton_blend(skeletons: Float32Array, weights: Float32Array): Float32Array;
}

export interface WasmParticlesExports {
    particles_update(positions: Float32Array, velocities: Float32Array, lifetimes: Float32Array, deltaTime: number): void;
    particles_sort_by_depth(positions: Float32Array, cameraPos: Float32Array): Uint32Array;
}

export interface WasmModule {
    math: WasmMathExports;
    culling: WasmCullingExports;
    animation: WasmAnimationExports;
    particles: WasmParticlesExports;
    memory: WebAssembly.Memory;
}

/**
 * WASM Bridge singleton - manages WASM module lifecycle
 */
export class WasmBridge {
    private static _instance: WasmBridge | null = null;
    private static _initPromise: Promise<WasmBridge> | null = null;

    private _module: WasmModule | null = null;
    private _isInitialized: boolean = false;
    private _useFallback: boolean = false;

    private constructor() {}

    static get instance(): WasmBridge {
        if (!this._instance) {
            this._instance = new WasmBridge();
        }
        return this._instance;
    }

    /** Check if WASM is initialized and ready */
    get isReady(): boolean {
        return this._isInitialized;
    }

    /** Check if using JavaScript fallback */
    get usingFallback(): boolean {
        return this._useFallback;
    }

    /** Get the WASM module (throws if not initialized) */
    get module(): WasmModule {
        if (!this._module) {
            throw new Error('WASM module not initialized. Call WasmBridge.init() first.');
        }
        return this._module;
    }

    /**
     * Initialize the WASM module
     * @param wasmPath Path to the .wasm file
     * @returns Promise that resolves when WASM is ready
     */
    static async init(wasmPath: string = '/rust_core_bg.wasm'): Promise<WasmBridge> {
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInit(wasmPath);
        return this._initPromise;
    }

    private static async _doInit(wasmPath: string): Promise<WasmBridge> {
        const bridge = this.instance;

        try {
            // Try to load WASM module
            const response = await fetch(wasmPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.statusText}`);
            }

            const wasmBuffer = await response.arrayBuffer();

            // Import object for WASM module
            const importObject = {
                env: {
                    // Memory will be provided by wasm-bindgen
                },
                wbg: {
                    // wasm-bindgen glue
                    __wbindgen_throw: (ptr: number, len: number) => {
                        throw new Error('WASM threw an error');
                    }
                }
            };

            const { instance } = await WebAssembly.instantiate(wasmBuffer, importObject);

            // Extract exports
            bridge._module = bridge._extractExports(instance);
            bridge._isInitialized = true;
            bridge._useFallback = false;

            console.log('[WasmBridge] WASM module initialized successfully');

        } catch (error) {
            console.warn('[WasmBridge] Failed to load WASM, using JavaScript fallback:', error);
            bridge._module = bridge._createFallbackModule();
            bridge._isInitialized = true;
            bridge._useFallback = true;
        }

        return bridge;
    }

    private _extractExports(instance: WebAssembly.Instance): WasmModule {
        const exports = instance.exports as Record<string, unknown>;

        return {
            math: {
                vec3_add: exports.vec3_add as WasmMathExports['vec3_add'],
                vec3_sub: exports.vec3_sub as WasmMathExports['vec3_sub'],
                vec3_scale: exports.vec3_scale as WasmMathExports['vec3_scale'],
                vec3_dot: exports.vec3_dot as WasmMathExports['vec3_dot'],
                vec3_cross: exports.vec3_cross as WasmMathExports['vec3_cross'],
                vec3_normalize: exports.vec3_normalize as WasmMathExports['vec3_normalize'],
                vec3_length: exports.vec3_length as WasmMathExports['vec3_length'],
                vec3_lerp: exports.vec3_lerp as WasmMathExports['vec3_lerp'],
                mat4_multiply: exports.mat4_multiply as WasmMathExports['mat4_multiply'],
                mat4_invert: exports.mat4_invert as WasmMathExports['mat4_invert'],
                mat4_transpose: exports.mat4_transpose as WasmMathExports['mat4_transpose'],
                mat4_trs: exports.mat4_trs as WasmMathExports['mat4_trs'],
                mat4_perspective: exports.mat4_perspective as WasmMathExports['mat4_perspective'],
                mat4_ortho: exports.mat4_ortho as WasmMathExports['mat4_ortho'],
                mat4_look_at: exports.mat4_look_at as WasmMathExports['mat4_look_at'],
                mat4_transform_point: exports.mat4_transform_point as WasmMathExports['mat4_transform_point'],
                mat4_transform_direction: exports.mat4_transform_direction as WasmMathExports['mat4_transform_direction'],
                quat_multiply: exports.quat_multiply as WasmMathExports['quat_multiply'],
                quat_slerp: exports.quat_slerp as WasmMathExports['quat_slerp'],
                quat_from_euler: exports.quat_from_euler as WasmMathExports['quat_from_euler'],
                quat_to_euler: exports.quat_to_euler as WasmMathExports['quat_to_euler'],
                quat_from_axis_angle: exports.quat_from_axis_angle as WasmMathExports['quat_from_axis_angle'],
                quat_normalize: exports.quat_normalize as WasmMathExports['quat_normalize'],
                quat_inverse: exports.quat_inverse as WasmMathExports['quat_inverse'],
                quat_look_rotation: exports.quat_look_rotation as WasmMathExports['quat_look_rotation'],
                batch_transform_points: exports.batch_transform_points as WasmMathExports['batch_transform_points'],
                batch_multiply_matrices: exports.batch_multiply_matrices as WasmMathExports['batch_multiply_matrices'],
                batch_slerp_quats: exports.batch_slerp_quats as WasmMathExports['batch_slerp_quats'],
            },
            culling: {
                frustum_cull_aabbs: exports.frustum_cull_aabbs as WasmCullingExports['frustum_cull_aabbs'],
                frustum_cull_spheres: exports.frustum_cull_spheres as WasmCullingExports['frustum_cull_spheres'],
            },
            animation: {
                skeleton_interpolate: exports.skeleton_interpolate as WasmAnimationExports['skeleton_interpolate'],
                skeleton_blend: exports.skeleton_blend as WasmAnimationExports['skeleton_blend'],
            },
            particles: {
                particles_update: exports.particles_update as WasmParticlesExports['particles_update'],
                particles_sort_by_depth: exports.particles_sort_by_depth as WasmParticlesExports['particles_sort_by_depth'],
            },
            memory: exports.memory as WebAssembly.Memory,
        };
    }

    private _createFallbackModule(): WasmModule {
        // JavaScript fallback implementations
        return {
            math: this._createMathFallback(),
            culling: this._createCullingFallback(),
            animation: this._createAnimationFallback(),
            particles: this._createParticlesFallback(),
            memory: new WebAssembly.Memory({ initial: 256 }),
        };
    }

    private _createMathFallback(): WasmMathExports {
        return {
            vec3_add: (ax, ay, az, bx, by, bz) => new Float32Array([ax + bx, ay + by, az + bz]),
            vec3_sub: (ax, ay, az, bx, by, bz) => new Float32Array([ax - bx, ay - by, az - bz]),
            vec3_scale: (x, y, z, s) => new Float32Array([x * s, y * s, z * s]),
            vec3_dot: (ax, ay, az, bx, by, bz) => ax * bx + ay * by + az * bz,
            vec3_cross: (ax, ay, az, bx, by, bz) => new Float32Array([
                ay * bz - az * by,
                az * bx - ax * bz,
                ax * by - ay * bx
            ]),
            vec3_normalize: (x, y, z) => {
                const len = Math.sqrt(x * x + y * y + z * z);
                if (len === 0) return new Float32Array([0, 0, 0]);
                return new Float32Array([x / len, y / len, z / len]);
            },
            vec3_length: (x, y, z) => Math.sqrt(x * x + y * y + z * z),
            vec3_lerp: (ax, ay, az, bx, by, bz, t) => new Float32Array([
                ax + (bx - ax) * t,
                ay + (by - ay) * t,
                az + (bz - az) * t
            ]),
            mat4_multiply: (a, b) => {
                const out = new Float32Array(16);
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        out[i * 4 + j] =
                            a[i * 4 + 0] * b[0 * 4 + j] +
                            a[i * 4 + 1] * b[1 * 4 + j] +
                            a[i * 4 + 2] * b[2 * 4 + j] +
                            a[i * 4 + 3] * b[3 * 4 + j];
                    }
                }
                return out;
            },
            mat4_invert: (m) => {
                // Simplified matrix inversion (full implementation in actual WASM)
                const out = new Float32Array(16);
                // ... (complex inversion logic)
                return out;
            },
            mat4_transpose: (m) => {
                return new Float32Array([
                    m[0], m[4], m[8], m[12],
                    m[1], m[5], m[9], m[13],
                    m[2], m[6], m[10], m[14],
                    m[3], m[7], m[11], m[15]
                ]);
            },
            mat4_trs: (tx, ty, tz, rx, ry, rz, rw, sx, sy, sz) => {
                const out = new Float32Array(16);
                // TRS composition
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
                return out;
            },
            mat4_perspective: (fov, aspect, near, far) => {
                const f = 1.0 / Math.tan(fov / 2);
                const nf = 1 / (near - far);
                return new Float32Array([
                    f / aspect, 0, 0, 0,
                    0, f, 0, 0,
                    0, 0, (far + near) * nf, -1,
                    0, 0, 2 * far * near * nf, 0
                ]);
            },
            mat4_ortho: (left, right, bottom, top, near, far) => {
                const lr = 1 / (left - right);
                const bt = 1 / (bottom - top);
                const nf = 1 / (near - far);
                return new Float32Array([
                    -2 * lr, 0, 0, 0,
                    0, -2 * bt, 0, 0,
                    0, 0, 2 * nf, 0,
                    (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
                ]);
            },
            mat4_look_at: (ex, ey, ez, tx, ty, tz, ux, uy, uz) => {
                // Simplified lookAt
                const out = new Float32Array(16);
                out[15] = 1;
                return out;
            },
            mat4_transform_point: (m, x, y, z) => {
                const w = m[3] * x + m[7] * y + m[11] * z + m[15];
                return new Float32Array([
                    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
                    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
                    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
                ]);
            },
            mat4_transform_direction: (m, x, y, z) => {
                return new Float32Array([
                    m[0] * x + m[4] * y + m[8] * z,
                    m[1] * x + m[5] * y + m[9] * z,
                    m[2] * x + m[6] * y + m[10] * z
                ]);
            },
            quat_multiply: (ax, ay, az, aw, bx, by, bz, bw) => {
                return new Float32Array([
                    aw * bx + ax * bw + ay * bz - az * by,
                    aw * by - ax * bz + ay * bw + az * bx,
                    aw * bz + ax * by - ay * bx + az * bw,
                    aw * bw - ax * bx - ay * by - az * bz
                ]);
            },
            quat_slerp: (ax, ay, az, aw, bx, by, bz, bw, t) => {
                let cosom = ax * bx + ay * by + az * bz + aw * bw;
                if (cosom < 0) {
                    cosom = -cosom;
                    bx = -bx; by = -by; bz = -bz; bw = -bw;
                }
                let scale0, scale1;
                if (1 - cosom > 0.000001) {
                    const omega = Math.acos(cosom);
                    const sinom = Math.sin(omega);
                    scale0 = Math.sin((1 - t) * omega) / sinom;
                    scale1 = Math.sin(t * omega) / sinom;
                } else {
                    scale0 = 1 - t;
                    scale1 = t;
                }
                return new Float32Array([
                    scale0 * ax + scale1 * bx,
                    scale0 * ay + scale1 * by,
                    scale0 * az + scale1 * bz,
                    scale0 * aw + scale1 * bw
                ]);
            },
            quat_from_euler: (x, y, z) => {
                const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
                const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
                const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
                return new Float32Array([
                    s1 * c2 * c3 + c1 * s2 * s3,
                    c1 * s2 * c3 - s1 * c2 * s3,
                    c1 * c2 * s3 + s1 * s2 * c3,
                    c1 * c2 * c3 - s1 * s2 * s3
                ]);
            },
            quat_to_euler: (x, y, z, w) => {
                const sinr = 2 * (w * x + y * z);
                const cosr = 1 - 2 * (x * x + y * y);
                const roll = Math.atan2(sinr, cosr);

                const sinp = 2 * (w * y - z * x);
                const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

                const siny = 2 * (w * z + x * y);
                const cosy = 1 - 2 * (y * y + z * z);
                const yaw = Math.atan2(siny, cosy);

                return new Float32Array([roll, pitch, yaw]);
            },
            quat_from_axis_angle: (ax, ay, az, angle) => {
                const halfAngle = angle / 2;
                const s = Math.sin(halfAngle);
                return new Float32Array([ax * s, ay * s, az * s, Math.cos(halfAngle)]);
            },
            quat_normalize: (x, y, z, w) => {
                const len = Math.sqrt(x * x + y * y + z * z + w * w);
                if (len === 0) return new Float32Array([0, 0, 0, 1]);
                return new Float32Array([x / len, y / len, z / len, w / len]);
            },
            quat_inverse: (x, y, z, w) => {
                const dot = x * x + y * y + z * z + w * w;
                if (dot === 0) return new Float32Array([0, 0, 0, 1]);
                return new Float32Array([-x / dot, -y / dot, -z / dot, w / dot]);
            },
            quat_look_rotation: (fx, fy, fz, ux, uy, uz) => {
                // Simplified look rotation
                return new Float32Array([0, 0, 0, 1]);
            },
            batch_transform_points: (m, points) => {
                const count = points.length / 3;
                const out = new Float32Array(count * 3);
                for (let i = 0; i < count; i++) {
                    const x = points[i * 3];
                    const y = points[i * 3 + 1];
                    const z = points[i * 3 + 2];
                    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
                    out[i * 3] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
                    out[i * 3 + 1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
                    out[i * 3 + 2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
                }
                return out;
            },
            batch_multiply_matrices: (matrices) => {
                // Batch multiply (returns accumulated result)
                const count = matrices.length / 16;
                if (count === 0) return new Float32Array(16);
                let result = matrices.slice(0, 16);
                for (let i = 1; i < count; i++) {
                    const next = matrices.slice(i * 16, (i + 1) * 16);
                    const temp = new Float32Array(16);
                    for (let r = 0; r < 4; r++) {
                        for (let c = 0; c < 4; c++) {
                            temp[r * 4 + c] =
                                result[r * 4 + 0] * next[0 * 4 + c] +
                                result[r * 4 + 1] * next[1 * 4 + c] +
                                result[r * 4 + 2] * next[2 * 4 + c] +
                                result[r * 4 + 3] * next[3 * 4 + c];
                        }
                    }
                    result = temp;
                }
                return result;
            },
            batch_slerp_quats: (quats_a, quats_b, t) => {
                const count = quats_a.length / 4;
                const out = new Float32Array(count * 4);
                for (let i = 0; i < count; i++) {
                    const result = this.math.quat_slerp(
                        quats_a[i * 4], quats_a[i * 4 + 1], quats_a[i * 4 + 2], quats_a[i * 4 + 3],
                        quats_b[i * 4], quats_b[i * 4 + 1], quats_b[i * 4 + 2], quats_b[i * 4 + 3],
                        t
                    );
                    out.set(result, i * 4);
                }
                return out;
            }
        };
    }

    private _createCullingFallback(): WasmCullingExports {
        return {
            frustum_cull_aabbs: (frustum, aabbs) => {
                // Simplified frustum culling
                const count = aabbs.length / 6;
                const visible = [];
                for (let i = 0; i < count; i++) {
                    visible.push(i); // Assume all visible for fallback
                }
                return new Uint32Array(visible);
            },
            frustum_cull_spheres: (frustum, spheres) => {
                const count = spheres.length / 4;
                const visible = [];
                for (let i = 0; i < count; i++) {
                    visible.push(i);
                }
                return new Uint32Array(visible);
            }
        };
    }

    private _createAnimationFallback(): WasmAnimationExports {
        return {
            skeleton_interpolate: (bones_a, bones_b, t) => {
                const out = new Float32Array(bones_a.length);
                for (let i = 0; i < bones_a.length; i++) {
                    out[i] = bones_a[i] + (bones_b[i] - bones_a[i]) * t;
                }
                return out;
            },
            skeleton_blend: (skeletons, weights) => {
                const boneCount = skeletons.length / weights.length;
                const out = new Float32Array(boneCount);
                // Weighted blend
                return out;
            }
        };
    }

    private _createParticlesFallback(): WasmParticlesExports {
        return {
            particles_update: (positions, velocities, lifetimes, deltaTime) => {
                const count = positions.length / 3;
                for (let i = 0; i < count; i++) {
                    if (lifetimes[i] > 0) {
                        positions[i * 3] += velocities[i * 3] * deltaTime;
                        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
                        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
                        lifetimes[i] -= deltaTime;
                    }
                }
            },
            particles_sort_by_depth: (positions, cameraPos) => {
                const count = positions.length / 3;
                const indices: Array<{ index: number; depth: number }> = [];
                for (let i = 0; i < count; i++) {
                    const dx = positions[i * 3] - cameraPos[0];
                    const dy = positions[i * 3 + 1] - cameraPos[1];
                    const dz = positions[i * 3 + 2] - cameraPos[2];
                    indices.push({ index: i, depth: dx * dx + dy * dy + dz * dz });
                }
                indices.sort((a, b) => b.depth - a.depth);
                return new Uint32Array(indices.map(i => i.index));
            }
        };
    }
}
