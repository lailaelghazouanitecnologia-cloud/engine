let wasm;

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const BoneTransformFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bonetransform_free(ptr >>> 0, 1));

const FrustumFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_frustum_free(ptr >>> 0, 1));

const Mat4Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mat4_free(ptr >>> 0, 1));

const QuatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_quat_free(ptr >>> 0, 1));

const Vec3Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_vec3_free(ptr >>> 0, 1));

const Vec4Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_vec4_free(ptr >>> 0, 1));

/**
 * Bone transform
 */
export class BoneTransform {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BoneTransform.prototype);
        obj.__wbg_ptr = ptr;
        BoneTransformFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BoneTransformFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bonetransform_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.bonetransform_identity();
        this.__wbg_ptr = ret >>> 0;
        BoneTransformFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {BoneTransform} other
     * @param {number} t
     * @returns {BoneTransform}
     */
    lerp(other, t) {
        _assertClass(other, BoneTransform);
        const ret = wasm.bonetransform_lerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return BoneTransform.__wrap(ret);
    }
    /**
     * @returns {BoneTransform}
     */
    static identity() {
        const ret = wasm.bonetransform_identity();
        return BoneTransform.__wrap(ret);
    }
    /**
     * @returns {Mat4}
     */
    to_matrix() {
        const ret = wasm.bonetransform_to_matrix(this.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    get position() {
        const ret = wasm.__wbg_get_bonetransform_position(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} arg0
     */
    set position(arg0) {
        _assertClass(arg0, Vec3);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_bonetransform_position(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {Quat}
     */
    get rotation() {
        const ret = wasm.__wbg_get_bonetransform_rotation(this.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @param {Quat} arg0
     */
    set rotation(arg0) {
        _assertClass(arg0, Quat);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_bonetransform_rotation(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {Vec3}
     */
    get scale() {
        const ret = wasm.__wbg_get_bonetransform_scale(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} arg0
     */
    set scale(arg0) {
        _assertClass(arg0, Vec3);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_bonetransform_scale(this.__wbg_ptr, ptr0);
    }
}
if (Symbol.dispose) BoneTransform.prototype[Symbol.dispose] = BoneTransform.prototype.free;

/**
 * Frustum planes (6 planes: left, right, bottom, top, near, far)
 */
export class Frustum {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Frustum.prototype);
        obj.__wbg_ptr = ptr;
        FrustumFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    static __unwrap(jsValue) {
        if (!(jsValue instanceof Frustum)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FrustumFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_frustum_free(ptr, 0);
    }
    /**
     * Extract frustum planes from view-projection matrix
     * @param {Mat4} vp
     * @returns {Frustum}
     */
    static from_matrix(vp) {
        _assertClass(vp, Mat4);
        const ret = wasm.frustum_from_matrix(vp.__wbg_ptr);
        return Frustum.__wrap(ret);
    }
    /**
     * Test if an AABB is inside or intersects the frustum
     * @param {Vec3} min
     * @param {Vec3} max
     * @returns {boolean}
     */
    contains_aabb(min, max) {
        _assertClass(min, Vec3);
        _assertClass(max, Vec3);
        const ret = wasm.frustum_contains_aabb(this.__wbg_ptr, min.__wbg_ptr, max.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Test if a point is inside the frustum
     * @param {Vec3} point
     * @returns {boolean}
     */
    contains_point(point) {
        _assertClass(point, Vec3);
        const ret = wasm.frustum_contains_point(this.__wbg_ptr, point.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Test if a sphere is inside or intersects the frustum
     * @param {Vec3} center
     * @param {number} radius
     * @returns {boolean}
     */
    contains_sphere(center, radius) {
        _assertClass(center, Vec3);
        const ret = wasm.frustum_contains_sphere(this.__wbg_ptr, center.__wbg_ptr, radius);
        return ret !== 0;
    }
    constructor() {
        const ret = wasm.frustum_new();
        this.__wbg_ptr = ret >>> 0;
        FrustumFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) Frustum.prototype[Symbol.dispose] = Frustum.prototype.free;

/**
 * 4x4 Matrix stored in column-major order (OpenGL/WebGL convention)
 * Layout: [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15]
 *         [col0      ] [col1      ] [col2       ] [col3        ]
 */
export class Mat4 {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Mat4.prototype);
        obj.__wbg_ptr = ptr;
        Mat4Finalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Mat4Finalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mat4_free(ptr, 0);
    }
    /**
     * @param {Vec3} v
     * @returns {Mat4}
     */
    static from_scale(v) {
        _assertClass(v, Vec3);
        const ret = wasm.mat4_from_scale(v.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    determinant() {
        const ret = wasm.mat4_determinant(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m03
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m30
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33
     * @returns {Mat4}
     */
    static from_values(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        const ret = wasm.mat4_from_values(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    get_forward() {
        const ret = wasm.mat4_get_forward(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} fov_y
     * @param {number} aspect
     * @param {number} near
     * @param {number} far
     * @returns {Mat4}
     */
    static perspective(fov_y, aspect, near, far) {
        const ret = wasm.mat4_perspective(fov_y, aspect, near, far);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    get_position() {
        const ret = wasm.mat4_get_position(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    set_identity() {
        wasm.mat4_set_identity(this.__wbg_ptr);
    }
    /**
     * @param {Vec4} v
     * @returns {Vec4}
     */
    transform_vec4(v) {
        _assertClass(v, Vec4);
        const ret = wasm.mat4_transform_vec4(this.__wbg_ptr, v.__wbg_ptr);
        return Vec4.__wrap(ret);
    }
    /**
     * @param {Vec3} axis
     * @param {number} radians
     * @returns {Mat4}
     */
    static from_axis_angle(axis, radians) {
        _assertClass(axis, Vec3);
        const ret = wasm.mat4_from_axis_angle(axis.__wbg_ptr, radians);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {number} radians
     * @returns {Mat4}
     */
    static from_rotation_x(radians) {
        const ret = wasm.mat4_from_rotation_x(radians);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {number} radians
     * @returns {Mat4}
     */
    static from_rotation_y(radians) {
        const ret = wasm.mat4_from_rotation_y(radians);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {number} radians
     * @returns {Mat4}
     */
    static from_rotation_z(radians) {
        const ret = wasm.mat4_from_rotation_z(radians);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {Vec3} point
     * @returns {Vec3}
     */
    transform_point(point) {
        _assertClass(point, Vec3);
        const ret = wasm.mat4_transform_point(this.__wbg_ptr, point.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} v
     * @returns {Mat4}
     */
    static from_translation(v) {
        _assertClass(v, Vec3);
        const ret = wasm.mat4_from_translation(v.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * Decompose matrix into TRS as flat array [tx,ty,tz, qx,qy,qz,qw, sx,sy,sz]
     * WASM-compatible version (returns 10 floats)
     * @returns {Float32Array}
     */
    decompose_to_array() {
        const ret = wasm.mat4_decompose_to_array(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {Vec3} direction
     * @returns {Vec3}
     */
    transform_direction(direction) {
        _assertClass(direction, Vec3);
        const ret = wasm.mat4_transform_direction(this.__wbg_ptr, direction.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} row
     * @param {number} col
     * @returns {number}
     */
    get(row, col) {
        const ret = wasm.mat4_get(this.__wbg_ptr, row, col);
        return ret;
    }
    constructor() {
        const ret = wasm.mat4_identity();
        this.__wbg_ptr = ret >>> 0;
        Mat4Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Mat4} other
     */
    copy(other) {
        _assertClass(other, Mat4);
        wasm.mat4_copy(this.__wbg_ptr, other.__wbg_ptr);
    }
    /**
     * @returns {Mat4}
     */
    static zero() {
        const ret = wasm.mat4_zero();
        return Mat4.__wrap(ret);
    }
    /**
     * @param {number} left
     * @param {number} right
     * @param {number} bottom
     * @param {number} top
     * @param {number} near
     * @param {number} far
     * @returns {Mat4}
     */
    static ortho(left, right, bottom, top, near, far) {
        const ret = wasm.mat4_ortho(left, right, bottom, top, near, far);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {Mat4} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Mat4);
        const ret = wasm.mat4_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Vec3}
     */
    get_up() {
        const ret = wasm.mat4_get_up(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Mat4 | undefined}
     */
    invert() {
        const ret = wasm.mat4_invert(this.__wbg_ptr);
        return ret === 0 ? undefined : Mat4.__wrap(ret);
    }
    /**
     * Compose TRS matrix (Translation * Rotation * Scale)
     * @param {Vec3} position
     * @param {Quat} rotation
     * @param {Vec3} scale
     * @returns {Mat4}
     */
    static compose(position, rotation, scale) {
        _assertClass(position, Vec3);
        _assertClass(rotation, Quat);
        _assertClass(scale, Vec3);
        const ret = wasm.mat4_compose(position.__wbg_ptr, rotation.__wbg_ptr, scale.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Mat4}
     */
    inverse() {
        const ret = wasm.mat4_inverse(this.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {Vec3} eye
     * @param {Vec3} target
     * @param {Vec3} up
     * @returns {Mat4}
     */
    static look_at(eye, target, up) {
        _assertClass(eye, Vec3);
        _assertClass(target, Vec3);
        _assertClass(up, Vec3);
        const ret = wasm.mat4_look_at(eye.__wbg_ptr, target.__wbg_ptr, up.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Mat4}
     */
    static identity() {
        const ret = wasm.mat4_identity();
        return Mat4.__wrap(ret);
    }
    /**
     * Multiply two matrices: result = self * other
     * @param {Mat4} other
     * @returns {Mat4}
     */
    multiply(other) {
        _assertClass(other, Mat4);
        const ret = wasm.mat4_multiply(this.__wbg_ptr, other.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Float32Array}
     */
    to_array() {
        const ret = wasm.mat4_to_array(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Mat4}
     */
    clone_mat() {
        const ret = wasm.mat4_clone_mat(this.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @param {Quat} q
     * @returns {Mat4}
     */
    static from_quat(q) {
        _assertClass(q, Quat);
        const ret = wasm.mat4_from_quat(q.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    get_right() {
        const ret = wasm.mat4_get_right(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    get_scale() {
        const ret = wasm.mat4_get_scale(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} row
     * @param {number} col
     * @param {number} value
     */
    set_value(row, col, value) {
        wasm.mat4_set_value(this.__wbg_ptr, row, col, value);
    }
    /**
     * @returns {Mat4}
     */
    transpose() {
        const ret = wasm.mat4_transpose(this.__wbg_ptr);
        return Mat4.__wrap(ret);
    }
}
if (Symbol.dispose) Mat4.prototype[Symbol.dispose] = Mat4.prototype.free;

export class Quat {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Quat.prototype);
        obj.__wbg_ptr = ptr;
        QuatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        QuatFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_quat_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_quat_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_quat_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_quat_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_quat_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_quat_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_quat_z(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get w() {
        const ret = wasm.__wbg_get_quat_w(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set w(arg0) {
        wasm.__wbg_set_quat_w(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {Quat}
     */
    clone_quat() {
        const ret = wasm.quat_clone_quat(this.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Quat}
     */
    static from_euler(x, y, z) {
        const ret = wasm.quat_from_euler(x, y, z);
        return Quat.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    euler_angles() {
        const ret = wasm.quat_euler_angles(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * Look rotation - creates a rotation looking from origin towards forward
     * @param {Vec3} forward
     * @param {Vec3} up
     * @returns {Quat}
     */
    static look_rotation(forward, up) {
        _assertClass(forward, Vec3);
        _assertClass(up, Vec3);
        const ret = wasm.quat_look_rotation(forward.__wbg_ptr, up.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    length_squared() {
        const ret = wasm.quat_length_squared(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec3} axis
     * @param {number} radians
     * @returns {Quat}
     */
    static from_axis_angle(axis, radians) {
        _assertClass(axis, Vec3);
        const ret = wasm.quat_from_axis_angle(axis.__wbg_ptr, radians);
        return Quat.__wrap(ret);
    }
    /**
     * @param {Quat} other
     * @returns {number}
     */
    dot(other) {
        _assertClass(other, Quat);
        const ret = wasm.quat_dot(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    constructor(x, y, z, w) {
        const ret = wasm.quat_new(x, y, z, w);
        this.__wbg_ptr = ret >>> 0;
        QuatFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    set(x, y, z, w) {
        wasm.quat_set(this.__wbg_ptr, x, y, z, w);
    }
    /**
     * @param {Quat} other
     */
    copy(other) {
        _assertClass(other, Quat);
        wasm.quat_copy(this.__wbg_ptr, other.__wbg_ptr);
    }
    /**
     * @param {Quat} other
     * @param {number} t
     * @returns {Quat}
     */
    lerp(other, t) {
        _assertClass(other, Quat);
        const ret = wasm.quat_lerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return Quat.__wrap(ret);
    }
    /**
     * @param {Quat} other
     * @returns {number}
     */
    angle(other) {
        _assertClass(other, Quat);
        const ret = wasm.quat_angle(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * Create quaternion from Euler angles in degrees
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Quat}
     */
    static euler(x, y, z) {
        const ret = wasm.quat_euler(x, y, z);
        return Quat.__wrap(ret);
    }
    /**
     * Spherical linear interpolation (optimized)
     * @param {Quat} other
     * @param {number} t
     * @returns {Quat}
     */
    slerp(other, t) {
        _assertClass(other, Quat);
        const ret = wasm.quat_slerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return Quat.__wrap(ret);
    }
    /**
     * @param {Quat} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Quat);
        const ret = wasm.quat_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Quat}
     */
    invert() {
        const ret = wasm.quat_invert(this.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    length() {
        const ret = wasm.quat_length(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Quat}
     */
    static identity() {
        const ret = wasm.quat_identity();
        return Quat.__wrap(ret);
    }
    /**
     * Rotate a vector by this quaternion
     * @param {Vec3} v
     * @returns {Vec3}
     */
    mul_vec3(v) {
        _assertClass(v, Vec3);
        const ret = wasm.quat_mul_vec3(this.__wbg_ptr, v.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * Multiply quaternions: result = self * other
     * @param {Quat} other
     * @returns {Quat}
     */
    multiply(other) {
        _assertClass(other, Quat);
        const ret = wasm.quat_multiply(this.__wbg_ptr, other.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @returns {Float32Array}
     */
    to_array() {
        const ret = wasm.quat_to_array(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Quat}
     */
    conjugate() {
        const ret = wasm.quat_conjugate(this.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @param {Mat4} m
     * @returns {Quat}
     */
    static from_mat4(m) {
        _assertClass(m, Mat4);
        const ret = wasm.quat_from_mat4(m.__wbg_ptr);
        return Quat.__wrap(ret);
    }
    /**
     * @returns {Quat}
     */
    normalize() {
        const ret = wasm.quat_normalize(this.__wbg_ptr);
        return Quat.__wrap(ret);
    }
}
if (Symbol.dispose) Quat.prototype[Symbol.dispose] = Quat.prototype.free;

export class Vec3 {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Vec3.prototype);
        obj.__wbg_ptr = ptr;
        Vec3Finalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Vec3Finalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_vec3_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_quat_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_quat_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_quat_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_quat_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_quat_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_quat_z(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} scalar
     * @returns {Vec3}
     */
    div_scalar(scalar) {
        const ret = wasm.vec3_div_scalar(this.__wbg_ptr, scalar);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Float32Array} arr
     * @returns {Vec3}
     */
    static from_array(arr) {
        const ptr0 = passArrayF32ToWasm0(arr, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vec3_from_array(ptr0, len0);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} scalar
     * @returns {Vec3}
     */
    mul_scalar(scalar) {
        const ret = wasm.vec3_mul_scalar(this.__wbg_ptr, scalar);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    normalized() {
        const ret = wasm.vec3_normalize(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} target
     * @param {number} max_distance
     * @returns {Vec3}
     */
    move_towards(target, max_distance) {
        _assertClass(target, Vec3);
        const ret = wasm.vec3_move_towards(this.__wbg_ptr, target.__wbg_ptr, max_distance);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    length_squared() {
        const ret = wasm.vec3_length_squared(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec3} other
     * @returns {number}
     */
    distance_squared(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_distance_squared(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec3} plane_normal
     * @returns {Vec3}
     */
    project_on_plane(plane_normal) {
        _assertClass(plane_normal, Vec3);
        const ret = wasm.vec3_project_on_plane(this.__wbg_ptr, plane_normal.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    static up() {
        const ret = wasm.vec3_up();
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    abs() {
        const ret = wasm.vec3_abs(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {number}
     */
    dot(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_dot(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    max(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_max(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    min(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_min(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x, y, z) {
        const ret = wasm.vec3_new(x, y, z);
        this.__wbg_ptr = ret >>> 0;
        Vec3Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Vec3}
     */
    static one() {
        const ret = wasm.vec3_one();
        return Vec3.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set(x, y, z) {
        wasm.vec3_set(this.__wbg_ptr, x, y, z);
    }
    /**
     * @returns {Vec3}
     */
    static back() {
        const ret = wasm.vec3_back();
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    ceil() {
        const ret = wasm.vec3_ceil(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     */
    copy(other) {
        _assertClass(other, Vec3);
        wasm.vec3_copy(this.__wbg_ptr, other.__wbg_ptr);
    }
    /**
     * @returns {Vec3}
     */
    static down() {
        const ret = wasm.vec3_down();
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    static left() {
        const ret = wasm.vec3_left();
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @param {number} t
     * @returns {Vec3}
     */
    lerp(other, t) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_lerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    static zero() {
        const ret = wasm.vec3_zero();
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {number}
     */
    angle(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_angle(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec3} min
     * @param {Vec3} max
     * @returns {Vec3}
     */
    clamp(min, max) {
        _assertClass(min, Vec3);
        _assertClass(max, Vec3);
        const ret = wasm.vec3_clamp(this.__wbg_ptr, min.__wbg_ptr, max.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    cross(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_cross(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    floor() {
        const ret = wasm.vec3_floor(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    static right() {
        const ret = wasm.vec3_right();
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    round() {
        const ret = wasm.vec3_round(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @param {number} t
     * @returns {Vec3}
     */
    slerp(other, t) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_slerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    length() {
        const ret = wasm.vec3_length(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Vec3}
     */
    negate() {
        const ret = wasm.vec3_negate(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    add_vec(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_add_vec(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {Vec3}
     */
    static forward() {
        const ret = wasm.vec3_forward();
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    mul_vec(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_mul_vec(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} on_normal
     * @returns {Vec3}
     */
    project(on_normal) {
        _assertClass(on_normal, Vec3);
        const ret = wasm.vec3_project(this.__wbg_ptr, on_normal.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} normal
     * @returns {Vec3}
     */
    reflect(normal) {
        _assertClass(normal, Vec3);
        const ret = wasm.vec3_reflect(this.__wbg_ptr, normal.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {Vec3}
     */
    sub_vec(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_sub_vec(this.__wbg_ptr, other.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @param {Vec3} other
     * @returns {number}
     */
    distance(other) {
        _assertClass(other, Vec3);
        const ret = wasm.vec3_distance(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    to_array() {
        const ret = wasm.vec3_to_array(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Vec3}
     */
    clone_vec() {
        const ret = wasm.vec3_clone_vec(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    magnitude() {
        const ret = wasm.vec3_length(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Vec3}
     */
    normalize() {
        const ret = wasm.vec3_normalize(this.__wbg_ptr);
        return Vec3.__wrap(ret);
    }
}
if (Symbol.dispose) Vec3.prototype[Symbol.dispose] = Vec3.prototype.free;

export class Vec4 {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Vec4.prototype);
        obj.__wbg_ptr = ptr;
        Vec4Finalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Vec4Finalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_vec4_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_quat_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_quat_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_quat_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_quat_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_quat_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_quat_z(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get w() {
        const ret = wasm.__wbg_get_quat_w(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set w(arg0) {
        wasm.__wbg_set_quat_w(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} scalar
     * @returns {Vec4}
     */
    div_scalar(scalar) {
        const ret = wasm.vec4_div_scalar(this.__wbg_ptr, scalar);
        return Vec4.__wrap(ret);
    }
    /**
     * @param {number} scalar
     * @returns {Vec4}
     */
    mul_scalar(scalar) {
        const ret = wasm.vec4_mul_scalar(this.__wbg_ptr, scalar);
        return Vec4.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    length_squared() {
        const ret = wasm.quat_length_squared(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec4} other
     * @returns {number}
     */
    dot(other) {
        _assertClass(other, Vec4);
        const ret = wasm.quat_dot(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    constructor(x, y, z, w) {
        const ret = wasm.quat_new(x, y, z, w);
        this.__wbg_ptr = ret >>> 0;
        Vec4Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Vec4}
     */
    static one() {
        const ret = wasm.vec4_one();
        return Vec4.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    set(x, y, z, w) {
        wasm.quat_set(this.__wbg_ptr, x, y, z, w);
    }
    /**
     * @param {Vec4} other
     */
    copy(other) {
        _assertClass(other, Vec4);
        wasm.quat_copy(this.__wbg_ptr, other.__wbg_ptr);
    }
    /**
     * @param {Vec4} other
     * @param {number} t
     * @returns {Vec4}
     */
    lerp(other, t) {
        _assertClass(other, Vec4);
        const ret = wasm.vec4_lerp(this.__wbg_ptr, other.__wbg_ptr, t);
        return Vec4.__wrap(ret);
    }
    /**
     * @returns {Vec4}
     */
    static zero() {
        const ret = wasm.vec4_zero();
        return Vec4.__wrap(ret);
    }
    /**
     * @param {Vec4} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Vec4);
        const ret = wasm.quat_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    length() {
        const ret = wasm.quat_length(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Vec4} other
     * @returns {Vec4}
     */
    add_vec(other) {
        _assertClass(other, Vec4);
        const ret = wasm.vec4_add_vec(this.__wbg_ptr, other.__wbg_ptr);
        return Vec4.__wrap(ret);
    }
    /**
     * @param {Vec4} other
     * @returns {Vec4}
     */
    sub_vec(other) {
        _assertClass(other, Vec4);
        const ret = wasm.vec4_sub_vec(this.__wbg_ptr, other.__wbg_ptr);
        return Vec4.__wrap(ret);
    }
    /**
     * @returns {Float32Array}
     */
    to_array() {
        const ret = wasm.vec4_to_array(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    magnitude() {
        const ret = wasm.quat_length(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Vec4}
     */
    normalize() {
        const ret = wasm.vec4_normalize(this.__wbg_ptr);
        return Vec4.__wrap(ret);
    }
}
if (Symbol.dispose) Vec4.prototype[Symbol.dispose] = Vec4.prototype.free;

/**
 * Allocate a Float32Array in WASM memory
 * @param {number} size
 * @returns {number}
 */
export function alloc_f32(size) {
    const ret = wasm.alloc_f32(size);
    return ret >>> 0;
}

/**
 * Allocate a Uint32Array in WASM memory
 * @param {number} size
 * @returns {number}
 */
export function alloc_u32(size) {
    const ret = wasm.alloc_u32(size);
    return ret >>> 0;
}

/**
 * Apply gravity to particle velocities
 * @param {Float32Array} velocities
 * @param {number} gravity_x
 * @param {number} gravity_y
 * @param {number} gravity_z
 * @param {number} delta_time
 */
export function apply_gravity(velocities, gravity_x, gravity_y, gravity_z, delta_time) {
    var ptr0 = passArrayF32ToWasm0(velocities, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.apply_gravity(ptr0, len0, velocities, gravity_x, gravity_y, gravity_z, delta_time);
}

/**
 * Compose batch TRS matrices
 * @param {Float32Array} positions
 * @param {Float32Array} rotations
 * @param {Float32Array} scales
 * @returns {Float32Array}
 */
export function batch_compose_trs(positions, rotations, scales) {
    const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(rotations, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(scales, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.batch_compose_trs(ptr0, len0, ptr1, len1, ptr2, len2);
    var v4 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v4;
}

/**
 * Batch compute TRS matrices
 * @param {Float32Array} positions
 * @param {Float32Array} rotations
 * @param {Float32Array} scales
 * @param {number} count
 * @returns {Float32Array}
 */
export function batch_compute_trs_matrices(positions, rotations, scales, count) {
    const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(rotations, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(scales, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.batch_compute_trs_matrices(ptr0, len0, ptr1, len1, ptr2, len2, count);
    var v4 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v4;
}

/**
 * Batch cross product
 * @param {Float32Array} a_data
 * @param {Float32Array} b_data
 * @returns {Float32Array}
 */
export function batch_cross_vec3(a_data, b_data) {
    const ptr0 = passArrayF32ToWasm0(a_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(b_data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_cross_vec3(ptr0, len0, ptr1, len1);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch cull AABBs against frustum
 * @param {Frustum} frustum
 * @param {Float32Array} mins
 * @param {Float32Array} maxs
 * @returns {Uint8Array}
 */
export function batch_cull_aabbs(frustum, mins, maxs) {
    _assertClass(frustum, Frustum);
    const ptr0 = passArrayF32ToWasm0(mins, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(maxs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_cull_aabbs(frustum.__wbg_ptr, ptr0, len0, ptr1, len1);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

/**
 * Batch cull spheres against multiple frustums
 * Returns visibility matrix (cameras × objects)
 * @param {Frustum[]} frustums
 * @param {Float32Array} centers
 * @param {Float32Array} radii
 * @returns {Uint8Array}
 */
export function batch_cull_multi_frustum(frustums, centers, radii) {
    const ptr0 = passArrayJsValueToWasm0(frustums, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(centers, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(radii, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.batch_cull_multi_frustum(ptr0, len0, ptr1, len1, ptr2, len2);
    var v4 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v4;
}

/**
 * Batch cull spheres against frustum
 * Returns a byte array where 1 = visible, 0 = culled
 * @param {Frustum} frustum
 * @param {Float32Array} centers
 * @param {Float32Array} radii
 * @returns {Uint8Array}
 */
export function batch_cull_spheres(frustum, centers, radii) {
    _assertClass(frustum, Frustum);
    const ptr0 = passArrayF32ToWasm0(centers, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(radii, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_cull_spheres(frustum.__wbg_ptr, ptr0, len0, ptr1, len1);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

/**
 * Batch dot product
 * @param {Float32Array} a_data
 * @param {Float32Array} b_data
 * @returns {Float32Array}
 */
export function batch_dot_vec3(a_data, b_data) {
    const ptr0 = passArrayF32ToWasm0(a_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(b_data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_dot_vec3(ptr0, len0, ptr1, len1);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch interpolate bone transforms
 * @param {Float32Array} a_positions
 * @param {Float32Array} a_rotations
 * @param {Float32Array} a_scales
 * @param {Float32Array} b_positions
 * @param {Float32Array} b_rotations
 * @param {Float32Array} b_scales
 * @param {number} t
 * @returns {Float32Array}
 */
export function batch_interpolate_bones(a_positions, a_rotations, a_scales, b_positions, b_rotations, b_scales, t) {
    const ptr0 = passArrayF32ToWasm0(a_positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(a_rotations, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(a_scales, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(b_positions, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArrayF32ToWasm0(b_rotations, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ptr5 = passArrayF32ToWasm0(b_scales, wasm.__wbindgen_malloc);
    const len5 = WASM_VECTOR_LEN;
    const ret = wasm.batch_interpolate_bones(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, t);
    var v7 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v7;
}

/**
 * Batch LERP vectors
 * @param {Float32Array} a_data
 * @param {Float32Array} b_data
 * @param {number} t
 * @returns {Float32Array}
 */
export function batch_lerp_vec3(a_data, b_data, t) {
    const ptr0 = passArrayF32ToWasm0(a_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(b_data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_lerp_vec3(ptr0, len0, ptr1, len1, t);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch multiply matrices: C[i] = A[i] * B[i]
 * @param {Float32Array} a_data
 * @param {Float32Array} b_data
 * @returns {Float32Array}
 */
export function batch_multiply_matrices(a_data, b_data) {
    const ptr0 = passArrayF32ToWasm0(a_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(b_data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_multiply_matrices(ptr0, len0, ptr1, len1);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch multiply matrices (for transform hierarchies)
 * @param {Float32Array} matrices
 * @param {number} count
 * @returns {Float32Array}
 */
export function batch_multiply_matrices_chain(matrices, count) {
    const ptr0 = passArrayF32ToWasm0(matrices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.batch_multiply_matrices_chain(ptr0, len0, count);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Batch normalize vectors
 * @param {Float32Array} data
 * @returns {Float32Array}
 */
export function batch_normalize_vec3(data) {
    const ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.batch_normalize_vec3(ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Batch propagate transform hierarchy
 *
 * Takes local matrices and parent indices, outputs world matrices.
 * Must be called with transforms sorted by depth (parents before children).
 *
 * # Arguments
 * * `local_matrices` - Flat array of local matrices (count * 16 floats)
 * * `parent_indices` - Parent index for each transform (-1 = no parent, use local as world)
 * * `parent_world_matrices` - Optional external parent world matrices (for parents not in batch)
 * * `count` - Number of transforms
 *
 * # Returns
 * Flat array of world matrices (count * 16 floats)
 * @param {Float32Array} local_matrices
 * @param {Int32Array} parent_indices
 * @param {Float32Array} parent_world_matrices
 * @param {number} count
 * @returns {Float32Array}
 */
export function batch_propagate_hierarchy(local_matrices, parent_indices, parent_world_matrices, count) {
    const ptr0 = passArrayF32ToWasm0(local_matrices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(parent_indices, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(parent_world_matrices, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.batch_propagate_hierarchy(ptr0, len0, ptr1, len1, ptr2, len2, count);
    var v4 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v4;
}

/**
 * Batch rotate vectors by quaternions
 * Each quaternion rotates one vector
 * @param {Float32Array} quats
 * @param {Float32Array} vecs
 * @param {number} count
 * @returns {Float32Array}
 */
export function batch_rotate_vectors(quats, vecs, count) {
    const ptr0 = passArrayF32ToWasm0(quats, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(vecs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_rotate_vectors(ptr0, len0, ptr1, len1, count);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch SLERP quaternions
 * @param {Float32Array} quats_a
 * @param {Float32Array} quats_b
 * @param {number} t
 * @returns {Float32Array}
 */
export function batch_slerp_quaternions(quats_a, quats_b, t) {
    const ptr0 = passArrayF32ToWasm0(quats_a, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(quats_b, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_slerp_quaternions(ptr0, len0, ptr1, len1, t);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch SLERP quaternions
 * @param {Float32Array} a_data
 * @param {Float32Array} b_data
 * @param {number} t
 * @returns {Float32Array}
 */
export function batch_slerp_quats(a_data, b_data, t) {
    const ptr0 = passArrayF32ToWasm0(a_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(b_data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_slerp_quats(ptr0, len0, ptr1, len1, t);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Batch transform directions by a matrix (no translation)
 * @param {Mat4} matrix
 * @param {Float32Array} directions
 * @returns {Float32Array}
 */
export function batch_transform_directions(matrix, directions) {
    _assertClass(matrix, Mat4);
    const ptr0 = passArrayF32ToWasm0(directions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.batch_transform_directions(matrix.__wbg_ptr, ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Batch transform points by a matrix
 * @param {Mat4} matrix
 * @param {Float32Array} points
 * @returns {Float32Array}
 */
export function batch_transform_points(matrix, points) {
    _assertClass(matrix, Mat4);
    const ptr0 = passArrayF32ToWasm0(points, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.batch_transform_points(matrix.__wbg_ptr, ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Batch transform array of points by matrix
 * @param {Float32Array} matrix
 * @param {Float32Array} points
 * @returns {Float32Array}
 */
export function batch_transform_points_by_matrix(matrix, points) {
    const ptr0 = passArrayF32ToWasm0(matrix, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(points, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.batch_transform_points_by_matrix(ptr0, len0, ptr1, len1);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Combined batch TRS + hierarchy propagation in one call
 *
 * This is the most efficient path for transform updates:
 * 1. Compute all TRS matrices from position/rotation/scale
 * 2. Propagate through hierarchy using parent indices
 *
 * # Arguments
 * * `positions` - Flat array of positions (count * 3 floats)
 * * `rotations` - Flat array of quaternions (count * 4 floats)
 * * `scales` - Flat array of scales (count * 3 floats)
 * * `parent_indices` - Parent index for each transform (-1 = root)
 * * `parent_world_matrices` - External parent world matrices (encoded with negative indices)
 * * `count` - Number of transforms
 * @param {Float32Array} positions
 * @param {Float32Array} rotations
 * @param {Float32Array} scales
 * @param {Int32Array} parent_indices
 * @param {Float32Array} parent_world_matrices
 * @param {number} count
 * @returns {Float32Array}
 */
export function batch_update_transforms(positions, rotations, scales, parent_indices, parent_world_matrices, count) {
    const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(rotations, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(scales, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray32ToWasm0(parent_indices, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArrayF32ToWasm0(parent_world_matrices, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.batch_update_transforms(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, count);
    var v6 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v6;
}

/**
 * Blend two skeleton poses
 * @param {Float32Array} pose_a
 * @param {Float32Array} pose_b
 * @param {number} weight
 * @returns {Float32Array}
 */
export function blend_skeleton_poses(pose_a, pose_b, weight) {
    const ptr0 = passArrayF32ToWasm0(pose_a, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(pose_b, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.blend_skeleton_poses(ptr0, len0, ptr1, len1, weight);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Compute final bone matrices from local transforms and hierarchy
 * @param {Float32Array} local_transforms
 * @param {Int32Array} parent_indices
 * @param {Float32Array} bind_poses
 * @returns {Float32Array}
 */
export function compute_bone_matrices(local_transforms, parent_indices, bind_poses) {
    const ptr0 = passArrayF32ToWasm0(local_transforms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(parent_indices, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(bind_poses, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.compute_bone_matrices(ptr0, len0, ptr1, len1, ptr2, len2);
    var v4 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v4;
}

/**
 * Execute a batch of commands from buffers
 *
 * # Arguments
 * * `commands` - Command buffer (opcode, count, data_offset, output_offset per command)
 * * `command_count` - Number of commands
 * * `data` - Input data buffer
 * * `output` - Output buffer (will be written to)
 * @param {Uint32Array} commands
 * @param {number} command_count
 * @param {Float32Array} data
 * @param {Float32Array} output
 * @returns {number}
 */
export function execute_batch(commands, command_count, data, output) {
    const ptr0 = passArray32ToWasm0(commands, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    var ptr2 = passArrayF32ToWasm0(output, wasm.__wbindgen_malloc);
    var len2 = WASM_VECTOR_LEN;
    const ret = wasm.execute_batch(ptr0, len0, command_count, ptr1, len1, ptr2, len2, output);
    return ret >>> 0;
}

/**
 * Free a Float32Array
 * @param {number} ptr
 * @param {number} size
 */
export function free_f32(ptr, size) {
    wasm.free_f32(ptr, size);
}

/**
 * Free a Uint32Array
 * @param {number} ptr
 * @param {number} size
 */
export function free_u32(ptr, size) {
    wasm.free_f32(ptr, size);
}

/**
 * Get WASM memory
 * @returns {any}
 */
export function getMemory() {
    const ret = wasm.getMemory();
    return ret;
}

/**
 * Initialize the WASM module
 */
export function init() {
    wasm.init();
}

/**
 * Interpolate particle colors over lifetime
 * @param {Float32Array} lifetimes
 * @param {Float32Array} max_lifetimes
 * @param {Float32Array} start_colors
 * @param {Float32Array} end_colors
 * @returns {Float32Array}
 */
export function interpolate_particle_colors(lifetimes, max_lifetimes, start_colors, end_colors) {
    const ptr0 = passArrayF32ToWasm0(lifetimes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(max_lifetimes, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(start_colors, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(end_colors, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_particle_colors(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    var v5 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v5;
}

/**
 * Interpolate particle sizes over lifetime
 * @param {Float32Array} lifetimes
 * @param {Float32Array} max_lifetimes
 * @param {Float32Array} start_sizes
 * @param {Float32Array} end_sizes
 * @returns {Float32Array}
 */
export function interpolate_particle_sizes(lifetimes, max_lifetimes, start_sizes, end_sizes) {
    const ptr0 = passArrayF32ToWasm0(lifetimes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(max_lifetimes, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(start_sizes, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(end_sizes, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_particle_sizes(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    var v5 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v5;
}

/**
 * Decompose a 4x4 matrix into Translation, Rotation (quaternion), Scale
 * Returns 10 floats: [tx, ty, tz, qx, qy, qz, qw, sx, sy, sz]
 * @param {Float32Array} matrix
 * @returns {Float32Array}
 */
export function mat4_decompose(matrix) {
    const ptr0 = passArrayF32ToWasm0(matrix, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.mat4_decompose(ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Rotate a vector by a quaternion
 * Returns 3 floats: [x, y, z]
 * @param {Float32Array} quat
 * @param {Float32Array} vec
 * @returns {Float32Array}
 */
export function quat_rotate_vec3(quat, vec) {
    const ptr0 = passArrayF32ToWasm0(quat, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(vec, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.quat_rotate_vec3(ptr0, len0, ptr1, len1);
    var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Check if SIMD is available
 * @returns {boolean}
 */
export function simd_available() {
    const ret = wasm.simd_available();
    return ret !== 0;
}

/**
 * Sort particles by distance to camera (for transparency)
 * @param {Float32Array} positions
 * @param {number} camera_pos_x
 * @param {number} camera_pos_y
 * @param {number} camera_pos_z
 * @returns {Uint32Array}
 */
export function sort_particles_by_distance(positions, camera_pos_x, camera_pos_y, camera_pos_z) {
    const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sort_particles_by_distance(ptr0, len0, camera_pos_x, camera_pos_y, camera_pos_z);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Spawn particles in a box
 * @param {number} count
 * @param {number} min_x
 * @param {number} min_y
 * @param {number} min_z
 * @param {number} max_x
 * @param {number} max_y
 * @param {number} max_z
 * @param {number} seed
 * @returns {Float32Array}
 */
export function spawn_particles_box(count, min_x, min_y, min_z, max_x, max_y, max_z, seed) {
    const ret = wasm.spawn_particles_box(count, min_x, min_y, min_z, max_x, max_y, max_z, seed);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Spawn particles in a sphere
 * @param {number} count
 * @param {number} center_x
 * @param {number} center_y
 * @param {number} center_z
 * @param {number} radius
 * @param {number} seed
 * @returns {Float32Array}
 */
export function spawn_particles_sphere(count, center_x, center_y, center_z, radius, seed) {
    const ret = wasm.spawn_particles_sphere(count, center_x, center_y, center_z, radius, seed);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Update particle lifetimes and return alive mask
 * @param {Float32Array} lifetimes
 * @param {number} delta_time
 * @returns {Uint8Array}
 */
export function update_particle_lifetimes(lifetimes, delta_time) {
    var ptr0 = passArrayF32ToWasm0(lifetimes, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.update_particle_lifetimes(ptr0, len0, lifetimes, delta_time);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Update particle positions based on velocity
 * @param {Float32Array} positions
 * @param {Float32Array} velocities
 * @param {number} delta_time
 */
export function update_particle_positions(positions, velocities, delta_time) {
    var ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(velocities, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.update_particle_positions(ptr0, len0, positions, ptr1, len1, delta_time);
}

/**
 * Get version string
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
        new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg___wbindgen_memory_a342e963fbcabd68 = function() {
        const ret = wasm.memory;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_frustum_unwrap = function(arg0) {
        const ret = Frustum.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('engine_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
