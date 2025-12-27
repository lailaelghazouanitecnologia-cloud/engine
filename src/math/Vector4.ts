/**
 * 4D Vector class with Unity-like API.
 */

export class Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    static get zero(): Vector4 { return new Vector4(0, 0, 0, 0); }
    static get one(): Vector4 { return new Vector4(1, 1, 1, 1); }

    get normalized(): Vector4 {
        return this.clone().normalize();
    }

    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    get sqrMagnitude(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }

    setValues(x: number, y: number, z: number, w: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    copy(other: Vector4): this {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        this.w = other.w;
        return this;
    }

    clone(): Vector4 {
        return new Vector4(this.x, this.y, this.z, this.w);
    }

    normalize(): this {
        const mag = this.magnitude;
        if (mag > 0.00001) {
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
            this.w /= mag;
        }
        return this;
    }

    add(other: Vector4): Vector4 {
        return new Vector4(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    }

    subtract(other: Vector4): Vector4 {
        return new Vector4(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
    }

    multiply(scalar: number): Vector4 {
        return new Vector4(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
    }

    divide(scalar: number): Vector4 {
        return new Vector4(this.x / scalar, this.y / scalar, this.z / scalar, this.w / scalar);
    }

    static dot(a: Vector4, b: Vector4): number {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    static lerp(a: Vector4, b: Vector4, t: number): Vector4 {
        t = Math.max(0, Math.min(1, t));
        return new Vector4(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t,
            a.z + (b.z - a.z) * t,
            a.w + (b.w - a.w) * t
        );
    }

    static distance(a: Vector4, b: Vector4): number {
        return a.subtract(b).magnitude;
    }

    equals(other: Vector4): boolean {
        return (
            Math.abs(this.x - other.x) < 0.00001 &&
            Math.abs(this.y - other.y) < 0.00001 &&
            Math.abs(this.z - other.z) < 0.00001 &&
            Math.abs(this.w - other.w) < 0.00001
        );
    }

    toString(): string {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)}, ${this.w.toFixed(2)})`;
    }

    toArray(): [number, number, number, number] {
        return [this.x, this.y, this.z, this.w];
    }
}
