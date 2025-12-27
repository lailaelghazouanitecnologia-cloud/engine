/**
 * 3D Vector class with Unity-like API.
 * Uses WASM for batch operations.
 */

export class Vector3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // ==================== Static Properties ====================

    static get zero(): Vector3 { return new Vector3(0, 0, 0); }
    static get one(): Vector3 { return new Vector3(1, 1, 1); }
    static get up(): Vector3 { return new Vector3(0, 1, 0); }
    static get down(): Vector3 { return new Vector3(0, -1, 0); }
    static get left(): Vector3 { return new Vector3(-1, 0, 0); }
    static get right(): Vector3 { return new Vector3(1, 0, 0); }
    static get forward(): Vector3 { return new Vector3(0, 0, 1); }
    static get back(): Vector3 { return new Vector3(0, 0, -1); }
    static get negativeInfinity(): Vector3 { return new Vector3(-Infinity, -Infinity, -Infinity); }
    static get positiveInfinity(): Vector3 { return new Vector3(Infinity, Infinity, Infinity); }

    // ==================== Instance Properties ====================

    /** Returns a copy of this vector normalized */
    get normalized(): Vector3 {
        return this.clone().normalize();
    }

    /** Returns the magnitude (length) of this vector */
    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** Returns the squared magnitude (length) of this vector */
    get sqrMagnitude(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    // ==================== Indexer ====================

    get(index: number): number {
        switch (index) {
            case 0: return this.x;
            case 1: return this.y;
            case 2: return this.z;
            default: throw new Error('Index out of range');
        }
    }

    set(index: number, value: number): void {
        switch (index) {
            case 0: this.x = value; break;
            case 1: this.y = value; break;
            case 2: this.z = value; break;
            default: throw new Error('Index out of range');
        }
    }

    // ==================== Instance Methods ====================

    /** Set x, y, z components */
    setValues(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /** Copy values from another vector */
    copy(other: Vector3): this {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        return this;
    }

    /** Clone this vector */
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    /** Normalize this vector in place */
    normalize(): this {
        const mag = this.magnitude;
        if (mag > 0.00001) {
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
        } else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }

    /** Add another vector */
    add(other: Vector3): Vector3 {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    /** Subtract another vector */
    subtract(other: Vector3): Vector3 {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    /** Multiply by scalar */
    multiply(scalar: number): Vector3 {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    /** Divide by scalar */
    divide(scalar: number): Vector3 {
        return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    /** Negate this vector */
    negate(): Vector3 {
        return new Vector3(-this.x, -this.y, -this.z);
    }

    /** Scale by another vector (component-wise) */
    scale(other: Vector3): Vector3 {
        return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
    }

    /** Check equality (approximately) */
    equals(other: Vector3): boolean {
        return Vector3.distance(this, other) < 0.00001;
    }

    toString(): string {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
    }

    toArray(): [number, number, number] {
        return [this.x, this.y, this.z];
    }

    // ==================== Static Methods ====================

    /** Angle between two vectors in degrees */
    static angle(from: Vector3, to: Vector3): number {
        const denominator = Math.sqrt(from.sqrMagnitude * to.sqrMagnitude);
        if (denominator < 0.00001) return 0;
        const dot = Math.max(-1, Math.min(1, Vector3.dot(from, to) / denominator));
        return Math.acos(dot) * (180 / Math.PI);
    }

    /** Signed angle between two vectors around an axis */
    static signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
        const unsignedAngle = Vector3.angle(from, to);
        const cross = Vector3.cross(from, to);
        const sign = Math.sign(Vector3.dot(axis, cross));
        return unsignedAngle * sign;
    }

    /** Clamp magnitude of a vector */
    static clampMagnitude(vector: Vector3, maxLength: number): Vector3 {
        const sqrMag = vector.sqrMagnitude;
        if (sqrMag > maxLength * maxLength) {
            const mag = Math.sqrt(sqrMag);
            return vector.multiply(maxLength / mag);
        }
        return vector.clone();
    }

    /** Cross product */
    static cross(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    /** Distance between two vectors */
    static distance(a: Vector3, b: Vector3): number {
        return a.subtract(b).magnitude;
    }

    /** Dot product */
    static dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /** Linear interpolation */
    static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
        t = Math.max(0, Math.min(1, t));
        return new Vector3(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t,
            a.z + (b.z - a.z) * t
        );
    }

    /** Linear interpolation (unclamped) */
    static lerpUnclamped(a: Vector3, b: Vector3, t: number): Vector3 {
        return new Vector3(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t,
            a.z + (b.z - a.z) * t
        );
    }

    /** Component-wise maximum */
    static max(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            Math.max(a.x, b.x),
            Math.max(a.y, b.y),
            Math.max(a.z, b.z)
        );
    }

    /** Component-wise minimum */
    static min(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            Math.min(a.x, b.x),
            Math.min(a.y, b.y),
            Math.min(a.z, b.z)
        );
    }

    /** Move towards target */
    static moveTowards(current: Vector3, target: Vector3, maxDistanceDelta: number): Vector3 {
        const diff = target.subtract(current);
        const distance = diff.magnitude;
        if (distance <= maxDistanceDelta || distance < 0.00001) {
            return target.clone();
        }
        return current.add(diff.divide(distance).multiply(maxDistanceDelta));
    }

    /** Normalize a vector */
    static normalize(value: Vector3): Vector3 {
        return value.clone().normalize();
    }

    /** Project vector onto another */
    static project(vector: Vector3, onNormal: Vector3): Vector3 {
        const sqrMag = onNormal.sqrMagnitude;
        if (sqrMag < 0.00001) return Vector3.zero;
        const dot = Vector3.dot(vector, onNormal);
        return onNormal.multiply(dot / sqrMag);
    }

    /** Project vector onto a plane */
    static projectOnPlane(vector: Vector3, planeNormal: Vector3): Vector3 {
        return vector.subtract(Vector3.project(vector, planeNormal));
    }

    /** Reflect vector off a surface */
    static reflect(inDirection: Vector3, inNormal: Vector3): Vector3 {
        const factor = -2 * Vector3.dot(inNormal, inDirection);
        return inNormal.multiply(factor).add(inDirection);
    }

    /** Scale two vectors component-wise */
    static scale(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
    }

    /** Spherical interpolation */
    static slerp(a: Vector3, b: Vector3, t: number): Vector3 {
        t = Math.max(0, Math.min(1, t));
        const dot = Math.max(-1, Math.min(1, Vector3.dot(a.normalized, b.normalized)));
        const theta = Math.acos(dot) * t;
        const relative = b.subtract(a.multiply(dot)).normalize();
        return a.multiply(Math.cos(theta)).add(relative.multiply(Math.sin(theta)));
    }

    /** Smooth damp towards target */
    static smoothDamp(
        current: Vector3,
        target: Vector3,
        currentVelocity: { value: Vector3 },
        smoothTime: number,
        maxSpeed: number = Infinity,
        deltaTime: number
    ): Vector3 {
        smoothTime = Math.max(0.0001, smoothTime);
        const omega = 2 / smoothTime;

        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

        let change = current.subtract(target);
        const originalTo = target.clone();

        const maxChange = maxSpeed * smoothTime;
        const maxChangeSq = maxChange * maxChange;
        const sqrMag = change.sqrMagnitude;
        if (sqrMag > maxChangeSq) {
            change = change.multiply(maxChange / Math.sqrt(sqrMag));
        }

        const newTarget = current.subtract(change);
        const temp = currentVelocity.value.add(change.multiply(omega)).multiply(deltaTime);
        currentVelocity.value = currentVelocity.value.subtract(temp.multiply(omega)).multiply(exp);

        let output = newTarget.add(change.add(temp).multiply(exp));

        // Prevent overshoot
        const origMinusCurrent = originalTo.subtract(current);
        const outMinusOrig = output.subtract(originalTo);
        if (Vector3.dot(origMinusCurrent, outMinusOrig) > 0) {
            output = originalTo;
            currentVelocity.value = outMinusOrig.divide(deltaTime);
        }

        return output;
    }

    /** Create from array */
    static fromArray(arr: number[]): Vector3 {
        return new Vector3(arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0);
    }
}
