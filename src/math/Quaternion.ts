/**
 * Quaternion class with Unity-like API.
 * Uses WASM for batch operations.
 */

import { Vector3 } from './Vector3';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    // ==================== Static Properties ====================

    static get identity(): Quaternion {
        return new Quaternion(0, 0, 0, 1);
    }

    // ==================== Instance Properties ====================

    /** Returns the euler angle representation (in degrees) */
    get eulerAngles(): Vector3 {
        const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
        const x = Math.atan2(sinr_cosp, cosr_cosp);

        const sinp = 2 * (this.w * this.y - this.z * this.x);
        const y = Math.abs(sinp) >= 1
            ? Math.sign(sinp) * Math.PI / 2
            : Math.asin(sinp);

        const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
        const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
        const z = Math.atan2(siny_cosp, cosy_cosp);

        return new Vector3(x * RAD2DEG, y * RAD2DEG, z * RAD2DEG);
    }

    set eulerAngles(value: Vector3) {
        const q = Quaternion.euler(value.x, value.y, value.z);
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
    }

    /** Returns a normalized copy of this quaternion */
    get normalized(): Quaternion {
        return this.clone().normalize();
    }

    // ==================== Instance Methods ====================

    /** Set x, y, z, w components */
    setValues(x: number, y: number, z: number, w: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /** Copy values from another quaternion */
    copy(other: Quaternion): this {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        this.w = other.w;
        return this;
    }

    /** Clone this quaternion */
    clone(): Quaternion {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }

    /** Normalize this quaternion in place */
    normalize(): this {
        const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (mag > 0.00001) {
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
            this.w /= mag;
        }
        return this;
    }

    /** Set rotation from euler angles (in degrees) */
    setFromEuler(x: number, y: number, z: number): this {
        const q = Quaternion.euler(x, y, z);
        this.copy(q);
        return this;
    }

    /** Set rotation to look in a direction */
    setLookRotation(forward: Vector3, up?: Vector3): this {
        const q = Quaternion.lookRotation(forward, up);
        this.copy(q);
        return this;
    }

    /** Multiply this quaternion by another */
    multiply(other: Quaternion): Quaternion {
        return new Quaternion(
            this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
            this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
            this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
            this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z
        );
    }

    /** Returns the inverse of this quaternion */
    get inverse(): Quaternion {
        const sqrMag = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (sqrMag < 0.00001) return Quaternion.identity;
        const inv = 1 / sqrMag;
        return new Quaternion(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
    }

    /** Check equality (approximately) */
    equals(other: Quaternion): boolean {
        return Quaternion.dot(this, other) > 0.999999;
    }

    toString(): string {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)}, ${this.w.toFixed(2)})`;
    }

    toArray(): [number, number, number, number] {
        return [this.x, this.y, this.z, this.w];
    }

    // ==================== Static Methods ====================

    /** Angle between two quaternions in degrees */
    static angle(a: Quaternion, b: Quaternion): number {
        const dot = Math.min(Math.abs(Quaternion.dot(a, b)), 1);
        return 2 * Math.acos(dot) * RAD2DEG;
    }

    /** Create rotation from angle and axis */
    static angleAxis(angle: number, axis: Vector3): Quaternion {
        const halfAngle = (angle * DEG2RAD) / 2;
        const s = Math.sin(halfAngle);
        const normalized = axis.normalized;
        return new Quaternion(
            normalized.x * s,
            normalized.y * s,
            normalized.z * s,
            Math.cos(halfAngle)
        );
    }

    /** Dot product of two quaternions */
    static dot(a: Quaternion, b: Quaternion): number {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    /** Create rotation from euler angles (in degrees) */
    static euler(x: number, y: number, z: number): Quaternion {
        const hx = (x * DEG2RAD) / 2;
        const hy = (y * DEG2RAD) / 2;
        const hz = (z * DEG2RAD) / 2;

        const cx = Math.cos(hx);
        const sx = Math.sin(hx);
        const cy = Math.cos(hy);
        const sy = Math.sin(hy);
        const cz = Math.cos(hz);
        const sz = Math.sin(hz);

        return new Quaternion(
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz,
            cx * cy * cz + sx * sy * sz
        );
    }

    /** Create rotation from one direction to another */
    static fromToRotation(fromDirection: Vector3, toDirection: Vector3): Quaternion {
        const from = fromDirection.normalized;
        const to = toDirection.normalized;
        const dot = Vector3.dot(from, to);

        if (dot > 0.99999) {
            return Quaternion.identity;
        }
        if (dot < -0.99999) {
            let axis = Vector3.cross(Vector3.right, from);
            if (axis.magnitude < 0.00001) {
                axis = Vector3.cross(Vector3.up, from);
            }
            return Quaternion.angleAxis(180, axis.normalized);
        }

        const axis = Vector3.cross(from, to);
        const s = Math.sqrt((1 + dot) * 2);
        const invS = 1 / s;

        return new Quaternion(
            axis.x * invS,
            axis.y * invS,
            axis.z * invS,
            s * 0.5
        );
    }

    /** Inverse of a quaternion */
    static inverse(rotation: Quaternion): Quaternion {
        return rotation.inverse;
    }

    /** Linear interpolation */
    static lerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
        t = Math.max(0, Math.min(1, t));
        return Quaternion.lerpUnclamped(a, b, t);
    }

    /** Linear interpolation (unclamped) */
    static lerpUnclamped(a: Quaternion, b: Quaternion, t: number): Quaternion {
        let bx = b.x, by = b.y, bz = b.z, bw = b.w;

        // Flip if needed for shortest path
        if (Quaternion.dot(a, b) < 0) {
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        return new Quaternion(
            a.x + (bx - a.x) * t,
            a.y + (by - a.y) * t,
            a.z + (bz - a.z) * t,
            a.w + (bw - a.w) * t
        ).normalize();
    }

    /** Create rotation to look in a direction */
    static lookRotation(forward: Vector3, up: Vector3 = Vector3.up): Quaternion {
        const f = forward.normalized;
        const r = Vector3.cross(up, f).normalize();
        const u = Vector3.cross(f, r);

        const m00 = r.x, m01 = r.y, m02 = r.z;
        const m10 = u.x, m11 = u.y, m12 = u.z;
        const m20 = f.x, m21 = f.y, m22 = f.z;

        const trace = m00 + m11 + m22;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            return new Quaternion(
                (m12 - m21) * s,
                (m20 - m02) * s,
                (m01 - m10) * s,
                0.25 / s
            );
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            return new Quaternion(
                0.25 * s,
                (m01 + m10) / s,
                (m20 + m02) / s,
                (m12 - m21) / s
            );
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            return new Quaternion(
                (m01 + m10) / s,
                0.25 * s,
                (m12 + m21) / s,
                (m20 - m02) / s
            );
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            return new Quaternion(
                (m20 + m02) / s,
                (m12 + m21) / s,
                0.25 * s,
                (m01 - m10) / s
            );
        }
    }

    /** Normalize a quaternion */
    static normalize(value: Quaternion): Quaternion {
        return value.clone().normalize();
    }

    /** Rotate a vector by a quaternion */
    static rotateVector(rotation: Quaternion, point: Vector3): Vector3 {
        const qv = new Vector3(rotation.x, rotation.y, rotation.z);
        const uv = Vector3.Cross(qv, point);
        const uuv = Vector3.Cross(qv, uv);

        return Vector3.Add(
            Vector3.Add(point, Vector3.MulScalar(uv, 2 * rotation.w)),
            Vector3.MulScalar(uuv, 2)
        );
    }

    /** Rotate towards a target rotation */
    static rotateTowards(from: Quaternion, to: Quaternion, maxDegreesDelta: number): Quaternion {
        const angle = Quaternion.angle(from, to);
        if (angle < 0.00001) return to.clone();
        const t = Math.min(1, maxDegreesDelta / angle);
        return Quaternion.slerp(from, to, t);
    }

    /** Spherical interpolation */
    static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
        t = Math.max(0, Math.min(1, t));
        return Quaternion.slerpUnclamped(a, b, t);
    }

    /** Spherical interpolation (unclamped) */
    static slerpUnclamped(a: Quaternion, b: Quaternion, t: number): Quaternion {
        let bx = b.x, by = b.y, bz = b.z, bw = b.w;

        let cosHalfTheta = Quaternion.dot(a, b);

        // Flip if needed for shortest path
        if (cosHalfTheta < 0) {
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
            cosHalfTheta = -cosHalfTheta;
        }

        // If very close, use linear interpolation
        if (cosHalfTheta > 0.9999) {
            return Quaternion.lerpUnclamped(a, new Quaternion(bx, by, bz, bw), t);
        }

        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);

        // If theta is 180 degrees, result is undefined
        if (Math.abs(sinHalfTheta) < 0.00001) {
            return new Quaternion(
                a.x * 0.5 + bx * 0.5,
                a.y * 0.5 + by * 0.5,
                a.z * 0.5 + bz * 0.5,
                a.w * 0.5 + bw * 0.5
            );
        }

        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        return new Quaternion(
            a.x * ratioA + bx * ratioB,
            a.y * ratioA + by * ratioB,
            a.z * ratioA + bz * ratioB,
            a.w * ratioA + bw * ratioB
        );
    }

    /** Multiply two quaternions (static version) */
    static multiply(a: Quaternion, b: Quaternion): Quaternion {
        return new Quaternion(
            a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        );
    }
}
