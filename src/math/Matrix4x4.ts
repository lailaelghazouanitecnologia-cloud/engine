/**
 * 4x4 Matrix class with Unity-like API.
 * Column-major order (OpenGL convention).
 */

import { Vector3 } from './Vector3';
import { Vector4 } from './Vector4';
import { Quaternion } from './Quaternion';

export class Matrix4x4 {
    /** Matrix data in column-major order */
    readonly data: Float32Array;

    constructor() {
        this.data = new Float32Array(16);
        this.setIdentity();
    }

    // ==================== Static Properties ====================

    static get identity(): Matrix4x4 {
        return new Matrix4x4();
    }

    static get zero(): Matrix4x4 {
        const m = new Matrix4x4();
        m.data.fill(0);
        return m;
    }

    // ==================== Indexer ====================

    get(row: number, column: number): number {
        return this.data[column * 4 + row];
    }

    set(row: number, column: number, value: number): void {
        this.data[column * 4 + row] = value;
    }

    // ==================== Properties ====================

    /** Returns the determinant of this matrix */
    get determinant(): number {
        const m = this.data;
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

        return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    }

    /** Returns the inverse of this matrix */
    get inverse(): Matrix4x4 {
        return Matrix4x4.invert(this);
    }

    /** Is this an identity matrix? */
    get isIdentity(): boolean {
        const m = this.data;
        return (
            m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 0 &&
            m[4] === 0 && m[5] === 1 && m[6] === 0 && m[7] === 0 &&
            m[8] === 0 && m[9] === 0 && m[10] === 1 && m[11] === 0 &&
            m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1
        );
    }

    /** Returns the transpose of this matrix */
    get transpose(): Matrix4x4 {
        return Matrix4x4.transpose(this);
    }

    // ==================== Instance Methods ====================

    setIdentity(): this {
        this.data.set([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        return this;
    }

    copy(other: Matrix4x4): this {
        this.data.set(other.data);
        return this;
    }

    clone(): Matrix4x4 {
        const m = new Matrix4x4();
        m.data.set(this.data);
        return m;
    }

    /** Get the matrix data as Float32Array (returns internal reference) */
    toFloat32Array(): Float32Array {
        return this.data;
    }

    /** Create matrix from Float32Array data */
    static fromFloat32Array(arr: Float32Array | ArrayLike<number>): Matrix4x4 {
        const m = new Matrix4x4();
        if (arr.length >= 16) {
            for (let i = 0; i < 16; i++) {
                m.data[i] = arr[i];
            }
        }
        return m;
    }

    /** Set matrix data from Float32Array */
    setFromFloat32Array(arr: Float32Array | ArrayLike<number>): this {
        if (arr.length >= 16) {
            for (let i = 0; i < 16; i++) {
                this.data[i] = arr[i];
            }
        }
        return this;
    }

    multiply(other: Matrix4x4): Matrix4x4 {
        return Matrix4x4.multiply(this, other);
    }

    getColumn(index: number): Vector4 {
        const i = index * 4;
        return new Vector4(this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]);
    }

    setColumn(index: number, column: Vector4): void {
        const i = index * 4;
        this.data[i] = column.x;
        this.data[i + 1] = column.y;
        this.data[i + 2] = column.z;
        this.data[i + 3] = column.w;
    }

    getRow(index: number): Vector4 {
        return new Vector4(
            this.data[index],
            this.data[index + 4],
            this.data[index + 8],
            this.data[index + 12]
        );
    }

    setRow(index: number, row: Vector4): void {
        this.data[index] = row.x;
        this.data[index + 4] = row.y;
        this.data[index + 8] = row.z;
        this.data[index + 12] = row.w;
    }

    getPosition(): Vector3 {
        return new Vector3(this.data[12], this.data[13], this.data[14]);
    }

    /** Transform a point (includes translation) */
    transformPoint(point: Vector3): Vector3 {
        const m = this.data;
        const w = m[3] * point.x + m[7] * point.y + m[11] * point.z + m[15];
        const invW = w !== 0 ? 1 / w : 1;
        return new Vector3(
            (m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12]) * invW,
            (m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13]) * invW,
            (m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14]) * invW
        );
    }

    /** Transform a direction (no translation) */
    transformDirection(direction: Vector3): Vector3 {
        const m = this.data;
        return new Vector3(
            m[0] * direction.x + m[4] * direction.y + m[8] * direction.z,
            m[1] * direction.x + m[5] * direction.y + m[9] * direction.z,
            m[2] * direction.x + m[6] * direction.y + m[10] * direction.z
        );
    }

    /** Transform a Vector4 */
    transformVector4(v: Vector4): Vector4 {
        const m = this.data;
        return new Vector4(
            m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * v.w,
            m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * v.w,
            m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * v.w,
            m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * v.w
        );
    }

    toString(): string {
        const m = this.data;
        return `Matrix4x4:\n` +
            `${m[0].toFixed(2)}, ${m[4].toFixed(2)}, ${m[8].toFixed(2)}, ${m[12].toFixed(2)}\n` +
            `${m[1].toFixed(2)}, ${m[5].toFixed(2)}, ${m[9].toFixed(2)}, ${m[13].toFixed(2)}\n` +
            `${m[2].toFixed(2)}, ${m[6].toFixed(2)}, ${m[10].toFixed(2)}, ${m[14].toFixed(2)}\n` +
            `${m[3].toFixed(2)}, ${m[7].toFixed(2)}, ${m[11].toFixed(2)}, ${m[15].toFixed(2)}`;
    }

    // ==================== Static Methods ====================

    /** Create a TRS (Translation-Rotation-Scale) matrix */
    static trs(position: Vector3, rotation: Quaternion, scale: Vector3): Matrix4x4 {
        const m = new Matrix4x4();
        const d = m.data;

        const x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        d[0] = (1 - (yy + zz)) * scale.x;
        d[1] = (xy + wz) * scale.x;
        d[2] = (xz - wy) * scale.x;
        d[3] = 0;

        d[4] = (xy - wz) * scale.y;
        d[5] = (1 - (xx + zz)) * scale.y;
        d[6] = (yz + wx) * scale.y;
        d[7] = 0;

        d[8] = (xz + wy) * scale.z;
        d[9] = (yz - wx) * scale.z;
        d[10] = (1 - (xx + yy)) * scale.z;
        d[11] = 0;

        d[12] = position.x;
        d[13] = position.y;
        d[14] = position.z;
        d[15] = 1;

        return m;
    }

    /** Create a translation matrix */
    static translate(v: Vector3): Matrix4x4 {
        const m = new Matrix4x4();
        m.data[12] = v.x;
        m.data[13] = v.y;
        m.data[14] = v.z;
        return m;
    }

    /** Create a scale matrix */
    static scale(v: Vector3): Matrix4x4 {
        const m = new Matrix4x4();
        m.data[0] = v.x;
        m.data[5] = v.y;
        m.data[10] = v.z;
        return m;
    }

    /** Create a rotation matrix from quaternion */
    static rotate(q: Quaternion): Matrix4x4 {
        return Matrix4x4.trs(Vector3.zero, q, Vector3.one);
    }

    /** Multiply two matrices */
    static multiply(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
        const result = new Matrix4x4();
        const r = result.data;
        const m = a.data;
        const n = b.data;

        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                r[col * 4 + row] =
                    m[row] * n[col * 4] +
                    m[row + 4] * n[col * 4 + 1] +
                    m[row + 8] * n[col * 4 + 2] +
                    m[row + 12] * n[col * 4 + 3];
            }
        }

        return result;
    }

    /** Invert a matrix */
    static invert(m: Matrix4x4): Matrix4x4 {
        const result = new Matrix4x4();
        const d = m.data;
        const r = result.data;

        const a00 = d[0], a01 = d[1], a02 = d[2], a03 = d[3];
        const a10 = d[4], a11 = d[5], a12 = d[6], a13 = d[7];
        const a20 = d[8], a21 = d[9], a22 = d[10], a23 = d[11];
        const a30 = d[12], a31 = d[13], a32 = d[14], a33 = d[15];

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
        if (Math.abs(det) < 0.00001) {
            return Matrix4x4.identity;
        }
        det = 1 / det;

        r[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        r[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        r[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        r[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        r[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        r[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        r[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        r[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        r[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        r[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        r[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        r[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        r[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        r[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        r[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        r[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return result;
    }

    /** Transpose a matrix */
    static transpose(m: Matrix4x4): Matrix4x4 {
        const result = new Matrix4x4();
        const d = m.data;
        const r = result.data;

        r[0] = d[0]; r[1] = d[4]; r[2] = d[8]; r[3] = d[12];
        r[4] = d[1]; r[5] = d[5]; r[6] = d[9]; r[7] = d[13];
        r[8] = d[2]; r[9] = d[6]; r[10] = d[10]; r[11] = d[14];
        r[12] = d[3]; r[13] = d[7]; r[14] = d[11]; r[15] = d[15];

        return result;
    }

    /** Create a perspective projection matrix */
    static perspective(fov: number, aspect: number, near: number, far: number): Matrix4x4 {
        const m = new Matrix4x4();
        const d = m.data;
        d.fill(0);

        const f = 1 / Math.tan((fov * Math.PI / 180) / 2);
        const nf = 1 / (near - far);

        d[0] = f / aspect;
        d[5] = f;
        d[10] = (far + near) * nf;
        d[11] = -1;
        d[14] = 2 * far * near * nf;

        return m;
    }

    /** Create an orthographic projection matrix */
    static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4x4 {
        const m = new Matrix4x4();
        const d = m.data;
        d.fill(0);

        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        d[0] = -2 * lr;
        d[5] = -2 * bt;
        d[10] = 2 * nf;
        d[12] = (left + right) * lr;
        d[13] = (top + bottom) * bt;
        d[14] = (far + near) * nf;
        d[15] = 1;

        return m;
    }

    /** Create a look-at view matrix */
    static lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4x4 {
        const z = eye.subtract(target).normalize();
        const x = Vector3.cross(up, z).normalize();
        const y = Vector3.cross(z, x);

        const m = new Matrix4x4();
        const d = m.data;

        d[0] = x.x; d[1] = y.x; d[2] = z.x; d[3] = 0;
        d[4] = x.y; d[5] = y.y; d[6] = z.y; d[7] = 0;
        d[8] = x.z; d[9] = y.z; d[10] = z.z; d[11] = 0;
        d[12] = -Vector3.dot(x, eye);
        d[13] = -Vector3.dot(y, eye);
        d[14] = -Vector3.dot(z, eye);
        d[15] = 1;

        return m;
    }
}
