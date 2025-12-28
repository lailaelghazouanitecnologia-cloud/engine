/**
 * 3D Vector class with Unity-like API.
 * Optimized with in-place mutation for performance.
 *
 * API Design:
 * - Instance methods (add, sub, mul) mutate in-place and return this for chaining
 * - Static methods (Add, Sub, Mul) create new vectors for convenience
 * - ToRef methods write to an output parameter for zero allocation
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

    // ==================== Static Constants (frozen) ====================

    static readonly zero = Object.freeze(new Vector3(0, 0, 0));
    static readonly one = Object.freeze(new Vector3(1, 1, 1));
    static readonly up = Object.freeze(new Vector3(0, 1, 0));
    static readonly down = Object.freeze(new Vector3(0, -1, 0));
    static readonly left = Object.freeze(new Vector3(-1, 0, 0));
    static readonly right = Object.freeze(new Vector3(1, 0, 0));
    static readonly forward = Object.freeze(new Vector3(0, 0, 1));
    static readonly back = Object.freeze(new Vector3(0, 0, -1));

    // ==================== Instance Properties ====================

    /** Returns the magnitude (length) of this vector */
    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** Returns the squared magnitude (length) of this vector */
    get sqrMagnitude(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /** Returns a copy of this vector normalized (creates new object) */
    get normalized(): Vector3 {
        return this.clone().normalize();
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

    setIndex(index: number, value: number): this {
        switch (index) {
            case 0: this.x = value; break;
            case 1: this.y = value; break;
            case 2: this.z = value; break;
            default: throw new Error('Index out of range');
        }
        return this;
    }

    // ==================== Instance Methods (IN-PLACE) ====================

    /** Set x, y, z components */
    set(x: number, y: number, z: number): this {
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

    /** Clone this vector (creates new object) */
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    /** Add another vector (IN-PLACE) */
    add(rhs: Vector3): this {
        this.x += rhs.x;
        this.y += rhs.y;
        this.z += rhs.z;
        return this;
    }

    /** Add another vector (returns NEW vector) - convenience method */
    plus(rhs: Vector3): Vector3 {
        return new Vector3(this.x + rhs.x, this.y + rhs.y, this.z + rhs.z);
    }

    /** Add two vectors and store in this (IN-PLACE) */
    add2(lhs: Vector3, rhs: Vector3): this {
        this.x = lhs.x + rhs.x;
        this.y = lhs.y + rhs.y;
        this.z = lhs.z + rhs.z;
        return this;
    }

    /** Add a scalar to each component (IN-PLACE) */
    addScalar(scalar: number): this {
        this.x += scalar;
        this.y += scalar;
        this.z += scalar;
        return this;
    }

    /** Add a scaled vector (IN-PLACE): this += rhs * scalar */
    addScaled(rhs: Vector3, scalar: number): this {
        this.x += rhs.x * scalar;
        this.y += rhs.y * scalar;
        this.z += rhs.z * scalar;
        return this;
    }

    /** Subtract another vector (IN-PLACE) */
    sub(rhs: Vector3): this {
        this.x -= rhs.x;
        this.y -= rhs.y;
        this.z -= rhs.z;
        return this;
    }

    /** Subtract another vector (returns NEW vector) - convenience method */
    subtract(rhs: Vector3): Vector3 {
        return new Vector3(this.x - rhs.x, this.y - rhs.y, this.z - rhs.z);
    }

    /** Subtract two vectors and store in this (IN-PLACE) */
    sub2(lhs: Vector3, rhs: Vector3): this {
        this.x = lhs.x - rhs.x;
        this.y = lhs.y - rhs.y;
        this.z = lhs.z - rhs.z;
        return this;
    }

    /** Subtract a scalar from each component (IN-PLACE) */
    subScalar(scalar: number): this {
        this.x -= scalar;
        this.y -= scalar;
        this.z -= scalar;
        return this;
    }

    /** Multiply by another vector component-wise (IN-PLACE) */
    mul(rhs: Vector3): this {
        this.x *= rhs.x;
        this.y *= rhs.y;
        this.z *= rhs.z;
        return this;
    }

    /** Multiply two vectors and store in this (IN-PLACE) */
    mul2(lhs: Vector3, rhs: Vector3): this {
        this.x = lhs.x * rhs.x;
        this.y = lhs.y * rhs.y;
        this.z = lhs.z * rhs.z;
        return this;
    }

    /** Multiply by scalar (IN-PLACE) */
    mulScalar(scalar: number): this {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /** Multiply by scalar (returns NEW vector) - convenience method */
    multiply(scalar: number): Vector3 {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    /** Divide by another vector component-wise (IN-PLACE) */
    div(rhs: Vector3): this {
        this.x /= rhs.x;
        this.y /= rhs.y;
        this.z /= rhs.z;
        return this;
    }

    /** Divide two vectors and store in this (IN-PLACE) */
    div2(lhs: Vector3, rhs: Vector3): this {
        this.x = lhs.x / rhs.x;
        this.y = lhs.y / rhs.y;
        this.z = lhs.z / rhs.z;
        return this;
    }

    /** Divide by scalar (IN-PLACE) */
    divScalar(scalar: number): this {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    /** Negate this vector (IN-PLACE) */
    negate(): this {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /** Normalize this vector (IN-PLACE) */
    normalize(src: Vector3 = this): this {
        const lengthSq = src.x * src.x + src.y * src.y + src.z * src.z;
        if (lengthSq > 0) {
            const invLength = 1 / Math.sqrt(lengthSq);
            this.x = src.x * invLength;
            this.y = src.y * invLength;
            this.z = src.z * invLength;
        }
        return this;
    }

    /** Cross product: this = lhs x rhs (IN-PLACE) */
    cross(lhs: Vector3, rhs: Vector3): this {
        const lx = lhs.x, ly = lhs.y, lz = lhs.z;
        const rx = rhs.x, ry = rhs.y, rz = rhs.z;
        this.x = ly * rz - ry * lz;
        this.y = lz * rx - rz * lx;
        this.z = lx * ry - rx * ly;
        return this;
    }

    /** Linear interpolation: this = lerp(lhs, rhs, t) (IN-PLACE) */
    lerp(lhs: Vector3, rhs: Vector3, t: number): this {
        this.x = lhs.x + t * (rhs.x - lhs.x);
        this.y = lhs.y + t * (rhs.y - lhs.y);
        this.z = lhs.z + t * (rhs.z - lhs.z);
        return this;
    }

    /** Project onto another vector (IN-PLACE) */
    project(rhs: Vector3): this {
        const dotAB = this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
        const dotBB = rhs.x * rhs.x + rhs.y * rhs.y + rhs.z * rhs.z;
        const s = dotAB / dotBB;
        this.x = rhs.x * s;
        this.y = rhs.y * s;
        this.z = rhs.z * s;
        return this;
    }

    /** Floor each component (IN-PLACE) */
    floor(src: Vector3 = this): this {
        this.x = Math.floor(src.x);
        this.y = Math.floor(src.y);
        this.z = Math.floor(src.z);
        return this;
    }

    /** Ceil each component (IN-PLACE) */
    ceil(src: Vector3 = this): this {
        this.x = Math.ceil(src.x);
        this.y = Math.ceil(src.y);
        this.z = Math.ceil(src.z);
        return this;
    }

    /** Round each component (IN-PLACE) */
    round(src: Vector3 = this): this {
        this.x = Math.round(src.x);
        this.y = Math.round(src.y);
        this.z = Math.round(src.z);
        return this;
    }

    /** Min of this and rhs per component (IN-PLACE) */
    min(rhs: Vector3): this {
        if (rhs.x < this.x) this.x = rhs.x;
        if (rhs.y < this.y) this.y = rhs.y;
        if (rhs.z < this.z) this.z = rhs.z;
        return this;
    }

    /** Max of this and rhs per component (IN-PLACE) */
    max(rhs: Vector3): this {
        if (rhs.x > this.x) this.x = rhs.x;
        if (rhs.y > this.y) this.y = rhs.y;
        if (rhs.z > this.z) this.z = rhs.z;
        return this;
    }

    // ==================== Instance Query Methods ====================

    /** Dot product */
    dot(rhs: Vector3): number {
        return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
    }

    /** Distance to another vector */
    distance(rhs: Vector3): number {
        const dx = this.x - rhs.x;
        const dy = this.y - rhs.y;
        const dz = this.z - rhs.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** Squared distance to another vector */
    distanceSq(rhs: Vector3): number {
        const dx = this.x - rhs.x;
        const dy = this.y - rhs.y;
        const dz = this.z - rhs.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /** Check equality (exact) */
    equals(rhs: Vector3): boolean {
        return this.x === rhs.x && this.y === rhs.y && this.z === rhs.z;
    }

    /** Check equality (approximately) */
    equalsApprox(rhs: Vector3, epsilon: number = 1e-6): boolean {
        return Math.abs(this.x - rhs.x) < epsilon &&
               Math.abs(this.y - rhs.y) < epsilon &&
               Math.abs(this.z - rhs.z) < epsilon;
    }

    /** Convert to string */
    toString(): string {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
    }

    /** Convert to array */
    toArray(arr: number[] = [], offset: number = 0): number[] {
        arr[offset] = this.x;
        arr[offset + 1] = this.y;
        arr[offset + 2] = this.z;
        return arr;
    }

    /** Set from array */
    fromArray(arr: ArrayLike<number>, offset: number = 0): this {
        this.x = arr[offset] ?? 0;
        this.y = arr[offset + 1] ?? 0;
        this.z = arr[offset + 2] ?? 0;
        return this;
    }

    // ==================== Static Methods (create new objects) ====================

    /** Add two vectors (returns NEW vector) */
    static Add(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    /** Subtract two vectors (returns NEW vector) */
    static Sub(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    /** Multiply two vectors component-wise (returns NEW vector) */
    static Mul(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
    }

    /** Multiply by scalar (returns NEW vector) */
    static MulScalar(a: Vector3, s: number): Vector3 {
        return new Vector3(a.x * s, a.y * s, a.z * s);
    }

    /** Divide two vectors component-wise (returns NEW vector) */
    static Div(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x / b.x, a.y / b.y, a.z / b.z);
    }

    /** Negate a vector (returns NEW vector) */
    static Negate(a: Vector3): Vector3 {
        return new Vector3(-a.x, -a.y, -a.z);
    }

    /** Normalize a vector (returns NEW vector) */
    static Normalize(a: Vector3): Vector3 {
        return a.clone().normalize();
    }

    /** Cross product (returns NEW vector) */
    static Cross(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    /** Dot product */
    static Dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /** Distance between two vectors */
    static Distance(a: Vector3, b: Vector3): number {
        return a.distance(b);
    }

    /** Linear interpolation (returns NEW vector) */
    static Lerp(a: Vector3, b: Vector3, t: number): Vector3 {
        t = Math.max(0, Math.min(1, t));
        return new Vector3(
            a.x + t * (b.x - a.x),
            a.y + t * (b.y - a.y),
            a.z + t * (b.z - a.z)
        );
    }

    /** Linear interpolation unclamped (returns NEW vector) */
    static LerpUnclamped(a: Vector3, b: Vector3, t: number): Vector3 {
        return new Vector3(
            a.x + t * (b.x - a.x),
            a.y + t * (b.y - a.y),
            a.z + t * (b.z - a.z)
        );
    }

    /** Angle between two vectors in degrees */
    static Angle(from: Vector3, to: Vector3): number {
        const denom = Math.sqrt(from.sqrMagnitude * to.sqrMagnitude);
        if (denom < 1e-15) return 0;
        const dot = Math.max(-1, Math.min(1, Vector3.Dot(from, to) / denom));
        return Math.acos(dot) * (180 / Math.PI);
    }

    /** Signed angle between two vectors around an axis */
    static SignedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
        const unsignedAngle = Vector3.Angle(from, to);
        const cross = Vector3.Cross(from, to);
        const sign = Math.sign(Vector3.Dot(axis, cross));
        return unsignedAngle * sign;
    }

    /** Clamp magnitude (returns NEW vector) */
    static ClampMagnitude(vector: Vector3, maxLength: number): Vector3 {
        const sqrMag = vector.sqrMagnitude;
        if (sqrMag > maxLength * maxLength) {
            const mag = Math.sqrt(sqrMag);
            return Vector3.MulScalar(vector, maxLength / mag);
        }
        return vector.clone();
    }

    /** Min per component (returns NEW vector) */
    static Min(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            Math.min(a.x, b.x),
            Math.min(a.y, b.y),
            Math.min(a.z, b.z)
        );
    }

    /** Max per component (returns NEW vector) */
    static Max(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            Math.max(a.x, b.x),
            Math.max(a.y, b.y),
            Math.max(a.z, b.z)
        );
    }

    /** Scale two vectors component-wise (returns NEW vector) */
    static Scale(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
    }

    /** Project vector onto another (returns NEW vector) */
    static Project(vector: Vector3, onNormal: Vector3): Vector3 {
        const sqrMag = onNormal.sqrMagnitude;
        if (sqrMag < 1e-15) return new Vector3();
        const dot = Vector3.Dot(vector, onNormal);
        return Vector3.MulScalar(onNormal, dot / sqrMag);
    }

    /** Project onto plane (returns NEW vector) */
    static ProjectOnPlane(vector: Vector3, planeNormal: Vector3): Vector3 {
        return Vector3.Sub(vector, Vector3.Project(vector, planeNormal));
    }

    /** Reflect off surface (returns NEW vector) */
    static Reflect(inDirection: Vector3, inNormal: Vector3): Vector3 {
        const factor = -2 * Vector3.Dot(inNormal, inDirection);
        return Vector3.Add(inDirection, Vector3.MulScalar(inNormal, factor));
    }

    /** Move towards target (returns NEW vector) */
    static MoveTowards(current: Vector3, target: Vector3, maxDistanceDelta: number): Vector3 {
        const diff = Vector3.Sub(target, current);
        const dist = diff.magnitude;
        if (dist <= maxDistanceDelta || dist < 1e-10) {
            return target.clone();
        }
        return Vector3.Add(current, Vector3.MulScalar(diff, maxDistanceDelta / dist));
    }

    /** Spherical interpolation (returns NEW vector) */
    static Slerp(a: Vector3, b: Vector3, t: number): Vector3 {
        t = Math.max(0, Math.min(1, t));
        const dot = Math.max(-1, Math.min(1, Vector3.Dot(a.normalized, b.normalized)));
        const theta = Math.acos(dot) * t;
        const relative = Vector3.Sub(b, Vector3.MulScalar(a, dot)).normalize();
        return Vector3.Add(
            Vector3.MulScalar(a, Math.cos(theta)),
            Vector3.MulScalar(relative, Math.sin(theta))
        );
    }

    /** Create from array */
    static FromArray(arr: ArrayLike<number>, offset: number = 0): Vector3 {
        return new Vector3(arr[offset], arr[offset + 1], arr[offset + 2]);
    }

    // ==================== Static ToRef Methods (zero allocation) ====================

    /** Add to output vector */
    static AddToRef(a: Vector3, b: Vector3, out: Vector3): Vector3 {
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        out.z = a.z + b.z;
        return out;
    }

    /** Subtract to output vector */
    static SubToRef(a: Vector3, b: Vector3, out: Vector3): Vector3 {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        out.z = a.z - b.z;
        return out;
    }

    /** Cross to output vector */
    static CrossToRef(a: Vector3, b: Vector3, out: Vector3): Vector3 {
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x, by = b.y, bz = b.z;
        out.x = ay * bz - az * by;
        out.y = az * bx - ax * bz;
        out.z = ax * by - ay * bx;
        return out;
    }

    /** Normalize to output vector */
    static NormalizeToRef(a: Vector3, out: Vector3): Vector3 {
        const lenSq = a.x * a.x + a.y * a.y + a.z * a.z;
        if (lenSq > 0) {
            const inv = 1 / Math.sqrt(lenSq);
            out.x = a.x * inv;
            out.y = a.y * inv;
            out.z = a.z * inv;
        } else {
            out.x = out.y = out.z = 0;
        }
        return out;
    }

    /** Lerp to output vector */
    static LerpToRef(a: Vector3, b: Vector3, t: number, out: Vector3): Vector3 {
        out.x = a.x + t * (b.x - a.x);
        out.y = a.y + t * (b.y - a.y);
        out.z = a.z + t * (b.z - a.z);
        return out;
    }

    // ==================== Lowercase Aliases for compatibility ====================

    /** Alias for Dot (lowercase) */
    static dot = Vector3.Dot;

    /** Alias for Cross (lowercase) */
    static cross = Vector3.Cross;

    /** Alias for Distance (lowercase) */
    static distance = Vector3.Distance;

    /** Alias for Lerp (lowercase) */
    static lerp = Vector3.Lerp;

    /** Alias for Project (lowercase) */
    static project = Vector3.Project;

    /** Alias for Reflect (lowercase) */
    static reflect = Vector3.Reflect;

    /** Alias for Angle (lowercase) */
    static angle = Vector3.Angle;
}
