/**
 * WASM Bridge - Connects TypeScript to Rust WASM module
 *
 * Uses the wasm-bindgen generated glue code for proper initialization
 * and memory management.
 */

// Type definitions for WASM exports (matches generated engine_core.d.ts)
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
    batch_multiply_matrices(a: Float32Array, b: Float32Array): Float32Array;
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

// Dynamic imports for the wasm-bindgen generated module
let wasmModule: any = null;

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
     * Initialize the WASM module using wasm-bindgen generated glue code
     * @param wasmPath Path to the .wasm file (or directory containing engine_core.js)
     */
    static async init(wasmPath: string = '/dist/wasm/engine_core_bg.wasm'): Promise<WasmBridge> {
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInit(wasmPath);
        return this._initPromise;
    }

    private static async _doInit(wasmPath: string): Promise<WasmBridge> {
        const bridge = this.instance;

        try {
            // Derive the glue code path from the WASM path
            const glueCodePath = wasmPath.replace('_bg.wasm', '.js').replace('.wasm', '.js');

            // Dynamic import of the wasm-bindgen generated module
            if (typeof process !== 'undefined' && process.versions?.node) {
                // Node.js environment
                const modulePath = glueCodePath.startsWith('/')
                    ? glueCodePath
                    : new URL(glueCodePath, import.meta.url).pathname;

                wasmModule = await import(modulePath);
            } else {
                // Browser environment
                wasmModule = await import(glueCodePath);
            }

            // Initialize the WASM module
            // The default export is the init function
            if (typeof wasmModule.default === 'function') {
                await wasmModule.default(wasmPath);
            }

            // Create adapter module that wraps wasm-bindgen classes
            bridge._module = bridge._createWasmAdapter(wasmModule);
            bridge._isInitialized = true;
            bridge._useFallback = false;

            console.log('[WasmBridge] WASM module initialized successfully via wasm-bindgen');

            // Check SIMD support
            if (wasmModule.simd_available) {
                console.log('[WasmBridge] SIMD:', wasmModule.simd_available() ? 'Available' : 'Not available');
            }

        } catch (error) {
            console.warn('[WasmBridge] Failed to load WASM, using JavaScript fallback:', error);
            bridge._module = bridge._createFallbackModule();
            bridge._isInitialized = true;
            bridge._useFallback = true;
        }

        return bridge;
    }

    /**
     * Create adapter that wraps wasm-bindgen classes to match expected interface
     */
    private _createWasmAdapter(wasm: any): WasmModule {
        // Cache class instances to avoid repeated allocations
        const tempVec3A = new wasm.Vec3(0, 0, 0);
        const tempVec3B = new wasm.Vec3(0, 0, 0);
        const tempQuatA = new wasm.Quat(0, 0, 0, 1);
        const tempQuatB = new wasm.Quat(0, 0, 0, 1);

        return {
            math: {
                // Vec3 operations using wasm-bindgen classes
                vec3_add: (ax, ay, az, bx, by, bz) => {
                    tempVec3A.set(ax, ay, az);
                    tempVec3B.set(bx, by, bz);
                    const result = tempVec3A.add_vec(tempVec3B);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                vec3_sub: (ax, ay, az, bx, by, bz) => {
                    tempVec3A.set(ax, ay, az);
                    tempVec3B.set(bx, by, bz);
                    const result = tempVec3A.sub_vec(tempVec3B);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                vec3_scale: (x, y, z, s) => {
                    tempVec3A.set(x, y, z);
                    const result = tempVec3A.mul_scalar(s);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                vec3_dot: (ax, ay, az, bx, by, bz) => {
                    tempVec3A.set(ax, ay, az);
                    tempVec3B.set(bx, by, bz);
                    return tempVec3A.dot(tempVec3B);
                },
                vec3_cross: (ax, ay, az, bx, by, bz) => {
                    tempVec3A.set(ax, ay, az);
                    tempVec3B.set(bx, by, bz);
                    const result = tempVec3A.cross(tempVec3B);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                vec3_normalize: (x, y, z) => {
                    tempVec3A.set(x, y, z);
                    const result = tempVec3A.normalize();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                vec3_length: (x, y, z) => {
                    tempVec3A.set(x, y, z);
                    return tempVec3A.length();
                },
                vec3_lerp: (ax, ay, az, bx, by, bz, t) => {
                    tempVec3A.set(ax, ay, az);
                    tempVec3B.set(bx, by, bz);
                    const result = tempVec3A.lerp(tempVec3B, t);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },

                // Mat4 operations
                mat4_multiply: (a, b) => {
                    // Use the batch function for individual multiplies too
                    return wasm.batch_multiply_matrices(a, b);
                },
                mat4_invert: (m) => {
                    const mat = wasm.Mat4.from_values(
                        m[0], m[1], m[2], m[3],
                        m[4], m[5], m[6], m[7],
                        m[8], m[9], m[10], m[11],
                        m[12], m[13], m[14], m[15]
                    );
                    const inv = mat.invert();
                    mat.free();
                    if (!inv) return null;
                    const arr = inv.to_array();
                    inv.free();
                    return arr;
                },
                mat4_transpose: (m) => {
                    const mat = wasm.Mat4.from_values(
                        m[0], m[1], m[2], m[3],
                        m[4], m[5], m[6], m[7],
                        m[8], m[9], m[10], m[11],
                        m[12], m[13], m[14], m[15]
                    );
                    const result = mat.transpose();
                    mat.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                mat4_trs: (tx, ty, tz, rx, ry, rz, rw, sx, sy, sz) => {
                    const pos = new wasm.Vec3(tx, ty, tz);
                    const rot = new wasm.Quat(rx, ry, rz, rw);
                    const scale = new wasm.Vec3(sx, sy, sz);
                    const result = wasm.Mat4.compose(pos, rot, scale);
                    pos.free();
                    rot.free();
                    scale.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                mat4_perspective: (fov, aspect, near, far) => {
                    const result = wasm.Mat4.perspective(fov, aspect, near, far);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                mat4_ortho: (left, right, bottom, top, near, far) => {
                    const result = wasm.Mat4.ortho(left, right, bottom, top, near, far);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                mat4_look_at: (ex, ey, ez, tx, ty, tz, ux, uy, uz) => {
                    const eye = new wasm.Vec3(ex, ey, ez);
                    const target = new wasm.Vec3(tx, ty, tz);
                    const up = new wasm.Vec3(ux, uy, uz);
                    const result = wasm.Mat4.look_at(eye, target, up);
                    eye.free();
                    target.free();
                    up.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                mat4_transform_point: (m, x, y, z) => {
                    // Use batch function for single point
                    const points = new Float32Array([x, y, z]);
                    const result = wasm.batch_transform_points_by_matrix(m, points);
                    return result;
                },
                mat4_transform_direction: (m, x, y, z) => {
                    const mat = wasm.Mat4.from_values(
                        m[0], m[1], m[2], m[3],
                        m[4], m[5], m[6], m[7],
                        m[8], m[9], m[10], m[11],
                        m[12], m[13], m[14], m[15]
                    );
                    const dir = new wasm.Vec3(x, y, z);
                    const result = mat.transform_direction(dir);
                    mat.free();
                    dir.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },

                // Quat operations
                quat_multiply: (ax, ay, az, aw, bx, by, bz, bw) => {
                    tempQuatA.set(ax, ay, az, aw);
                    tempQuatB.set(bx, by, bz, bw);
                    const result = tempQuatA.multiply(tempQuatB);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_slerp: (ax, ay, az, aw, bx, by, bz, bw, t) => {
                    tempQuatA.set(ax, ay, az, aw);
                    tempQuatB.set(bx, by, bz, bw);
                    const result = tempQuatA.slerp(tempQuatB, t);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_from_euler: (x, y, z) => {
                    const result = wasm.Quat.from_euler(x, y, z);
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_to_euler: (x, y, z, w) => {
                    tempQuatA.set(x, y, z, w);
                    const result = tempQuatA.euler_angles();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_from_axis_angle: (ax, ay, az, angle) => {
                    const axis = new wasm.Vec3(ax, ay, az);
                    const result = wasm.Quat.from_axis_angle(axis, angle);
                    axis.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_normalize: (x, y, z, w) => {
                    tempQuatA.set(x, y, z, w);
                    const result = tempQuatA.normalize();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_inverse: (x, y, z, w) => {
                    tempQuatA.set(x, y, z, w);
                    const result = tempQuatA.invert();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },
                quat_look_rotation: (fx, fy, fz, ux, uy, uz) => {
                    const forward = new wasm.Vec3(fx, fy, fz);
                    const up = new wasm.Vec3(ux, uy, uz);
                    const result = wasm.Quat.look_rotation(forward, up);
                    forward.free();
                    up.free();
                    const arr = result.to_array();
                    result.free();
                    return arr;
                },

                // Batch operations - use wasm-bindgen functions directly
                batch_transform_points: (m, points) => {
                    return wasm.batch_transform_points_by_matrix(m, points);
                },
                batch_multiply_matrices: (a, b) => {
                    return wasm.batch_multiply_matrices(a, b);
                },
                batch_slerp_quats: (quats_a, quats_b, t) => {
                    return wasm.batch_slerp_quats(quats_a, quats_b, t);
                },
            },
            culling: {
                frustum_cull_aabbs: (frustum, aabbs) => {
                    // Create Frustum from view-projection matrix
                    const mat = wasm.Mat4.from_values(
                        frustum[0], frustum[1], frustum[2], frustum[3],
                        frustum[4], frustum[5], frustum[6], frustum[7],
                        frustum[8], frustum[9], frustum[10], frustum[11],
                        frustum[12], frustum[13], frustum[14], frustum[15]
                    );
                    const f = wasm.Frustum.from_matrix(mat);
                    mat.free();

                    // Split AABB data into mins and maxs
                    const count = aabbs.length / 6;
                    const mins = new Float32Array(count * 3);
                    const maxs = new Float32Array(count * 3);
                    for (let i = 0; i < count; i++) {
                        mins[i * 3] = aabbs[i * 6];
                        mins[i * 3 + 1] = aabbs[i * 6 + 1];
                        mins[i * 3 + 2] = aabbs[i * 6 + 2];
                        maxs[i * 3] = aabbs[i * 6 + 3];
                        maxs[i * 3 + 1] = aabbs[i * 6 + 4];
                        maxs[i * 3 + 2] = aabbs[i * 6 + 5];
                    }

                    const visibility = wasm.batch_cull_aabbs(f, mins, maxs);
                    f.free();

                    // Convert Uint8Array to indices
                    const visible: number[] = [];
                    for (let i = 0; i < visibility.length; i++) {
                        if (visibility[i]) visible.push(i);
                    }
                    return new Uint32Array(visible);
                },
                frustum_cull_spheres: (frustum, spheres) => {
                    const mat = wasm.Mat4.from_values(
                        frustum[0], frustum[1], frustum[2], frustum[3],
                        frustum[4], frustum[5], frustum[6], frustum[7],
                        frustum[8], frustum[9], frustum[10], frustum[11],
                        frustum[12], frustum[13], frustum[14], frustum[15]
                    );
                    const f = wasm.Frustum.from_matrix(mat);
                    mat.free();

                    // Split sphere data into centers and radii
                    const count = spheres.length / 4;
                    const centers = new Float32Array(count * 3);
                    const radii = new Float32Array(count);
                    for (let i = 0; i < count; i++) {
                        centers[i * 3] = spheres[i * 4];
                        centers[i * 3 + 1] = spheres[i * 4 + 1];
                        centers[i * 3 + 2] = spheres[i * 4 + 2];
                        radii[i] = spheres[i * 4 + 3];
                    }

                    const visibility = wasm.batch_cull_spheres(f, centers, radii);
                    f.free();

                    const visible: number[] = [];
                    for (let i = 0; i < visibility.length; i++) {
                        if (visibility[i]) visible.push(i);
                    }
                    return new Uint32Array(visible);
                }
            },
            animation: {
                skeleton_interpolate: (bones_a, bones_b, t) => {
                    return wasm.blend_skeleton_poses(bones_a, bones_b, t);
                },
                skeleton_blend: (skeletons, weights) => {
                    // TODO: Implement multi-skeleton blending
                    return skeletons.slice(0, skeletons.length / weights.length);
                }
            },
            particles: {
                particles_update: (positions, velocities, lifetimes, deltaTime) => {
                    wasm.update_particle_positions(positions, velocities, deltaTime);
                    wasm.update_particle_lifetimes(lifetimes, deltaTime);
                },
                particles_sort_by_depth: (positions, cameraPos) => {
                    return wasm.sort_particles_by_distance(
                        positions,
                        cameraPos[0],
                        cameraPos[1],
                        cameraPos[2]
                    );
                }
            },
            memory: wasm.getMemory ? wasm.getMemory() : new WebAssembly.Memory({ initial: 256 }),
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
                const out = new Float32Array(16);
                // Full 4x4 matrix inversion
                const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
                const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
                const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
                const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

                const b00 = a00 * a11 - a01 * a10;
                const b01 = a00 * a12 - a02 * a10;
                const b02 = a00 * a13 - a03 * a10;
                const b03 = a01 * a12 - a02 * a11;
                const b04 = a01 * a13 - a03 * a11;
                const b05 = a02 * a13 - a03 * a12;
                const b06 = a20 * a31 - a21 * a30;
                const b07 = a20 * a32 - a22 * a30;
                const b08 = a20 * a33 - a23 * a30;
                const b09 = a21 * a32 - a22 * a31;
                const b10 = a21 * a33 - a23 * a31;
                const b11 = a22 * a33 - a23 * a32;

                let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
                if (!det) return null;
                det = 1.0 / det;

                out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
                out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
                out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
                out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
                out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
                out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
                out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
                out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
                out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
                out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

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
                const out = new Float32Array(16);
                let fx = tx - ex, fy = ty - ey, fz = tz - ez;
                let len = Math.sqrt(fx * fx + fy * fy + fz * fz);
                if (len > 0) { fx /= len; fy /= len; fz /= len; }

                let sx = fy * uz - fz * uy;
                let sy = fz * ux - fx * uz;
                let sz = fx * uy - fy * ux;
                len = Math.sqrt(sx * sx + sy * sy + sz * sz);
                if (len > 0) { sx /= len; sy /= len; sz /= len; }

                const ux2 = sy * fz - sz * fy;
                const uy2 = sz * fx - sx * fz;
                const uz2 = sx * fy - sy * fx;

                out[0] = sx; out[1] = ux2; out[2] = -fx; out[3] = 0;
                out[4] = sy; out[5] = uy2; out[6] = -fy; out[7] = 0;
                out[8] = sz; out[9] = uz2; out[10] = -fz; out[11] = 0;
                out[12] = -(sx * ex + sy * ey + sz * ez);
                out[13] = -(ux2 * ex + uy2 * ey + uz2 * ez);
                out[14] = fx * ex + fy * ey + fz * ez;
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
            quat_look_rotation: (_fx, _fy, _fz, _ux, _uy, _uz) => {
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
            batch_multiply_matrices: (a, b) => {
                const count = a.length / 16;
                const out = new Float32Array(count * 16);
                for (let n = 0; n < count; n++) {
                    const offset = n * 16;
                    for (let i = 0; i < 4; i++) {
                        for (let j = 0; j < 4; j++) {
                            out[offset + i * 4 + j] =
                                a[offset + i * 4 + 0] * b[offset + 0 * 4 + j] +
                                a[offset + i * 4 + 1] * b[offset + 1 * 4 + j] +
                                a[offset + i * 4 + 2] * b[offset + 2 * 4 + j] +
                                a[offset + i * 4 + 3] * b[offset + 3 * 4 + j];
                        }
                    }
                }
                return out;
            },
            batch_slerp_quats: (quats_a, quats_b, t) => {
                const count = quats_a.length / 4;
                const out = new Float32Array(count * 4);
                for (let i = 0; i < count; i++) {
                    const idx = i * 4;
                    let ax = quats_a[idx], ay = quats_a[idx + 1], az = quats_a[idx + 2], aw = quats_a[idx + 3];
                    let bx = quats_b[idx], by = quats_b[idx + 1], bz = quats_b[idx + 2], bw = quats_b[idx + 3];

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

                    out[idx] = scale0 * ax + scale1 * bx;
                    out[idx + 1] = scale0 * ay + scale1 * by;
                    out[idx + 2] = scale0 * az + scale1 * bz;
                    out[idx + 3] = scale0 * aw + scale1 * bw;
                }
                return out;
            }
        };
    }

    private _createCullingFallback(): WasmCullingExports {
        return {
            frustum_cull_aabbs: (_frustum, aabbs) => {
                const count = aabbs.length / 6;
                const visible = [];
                for (let i = 0; i < count; i++) {
                    visible.push(i); // Assume all visible for fallback
                }
                return new Uint32Array(visible);
            },
            frustum_cull_spheres: (_frustum, spheres) => {
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
