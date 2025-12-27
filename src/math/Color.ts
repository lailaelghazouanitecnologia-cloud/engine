/**
 * Color class with Unity-like API.
 * Values are in 0-1 range.
 */

import { Mathf } from './Mathf';

export class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    // ==================== Static Properties ====================

    static get black(): Color { return new Color(0, 0, 0, 1); }
    static get blue(): Color { return new Color(0, 0, 1, 1); }
    static get clear(): Color { return new Color(0, 0, 0, 0); }
    static get cyan(): Color { return new Color(0, 1, 1, 1); }
    static get gray(): Color { return new Color(0.5, 0.5, 0.5, 1); }
    static get green(): Color { return new Color(0, 1, 0, 1); }
    static get grey(): Color { return Color.gray; }
    static get magenta(): Color { return new Color(1, 0, 1, 1); }
    static get red(): Color { return new Color(1, 0, 0, 1); }
    static get white(): Color { return new Color(1, 1, 1, 1); }
    static get yellow(): Color { return new Color(1, 0.92, 0.016, 1); }

    // ==================== Properties ====================

    /** Returns grayscale value (perceptual luminance) */
    get grayscale(): number {
        return 0.299 * this.r + 0.587 * this.g + 0.114 * this.b;
    }

    /** Convert to linear color space */
    get linear(): Color {
        return new Color(
            this._gammaToLinear(this.r),
            this._gammaToLinear(this.g),
            this._gammaToLinear(this.b),
            this.a
        );
    }

    /** Convert to gamma color space */
    get gamma(): Color {
        return new Color(
            this._linearToGamma(this.r),
            this._linearToGamma(this.g),
            this._linearToGamma(this.b),
            this.a
        );
    }

    /** Get maximum color component */
    get maxColorComponent(): number {
        return Math.max(this.r, this.g, this.b);
    }

    // ==================== Instance Methods ====================

    private _gammaToLinear(value: number): number {
        return value <= 0.04045
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
    }

    private _linearToGamma(value: number): number {
        return value <= 0.0031308
            ? value * 12.92
            : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }

    setValues(r: number, g: number, b: number, a?: number): this {
        this.r = r;
        this.g = g;
        this.b = b;
        if (a !== undefined) this.a = a;
        return this;
    }

    copy(other: Color): this {
        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;
        return this;
    }

    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    equals(other: Color): boolean {
        return (
            Math.abs(this.r - other.r) < 0.001 &&
            Math.abs(this.g - other.g) < 0.001 &&
            Math.abs(this.b - other.b) < 0.001 &&
            Math.abs(this.a - other.a) < 0.001
        );
    }

    toString(): string {
        return `RGBA(${this.r.toFixed(3)}, ${this.g.toFixed(3)}, ${this.b.toFixed(3)}, ${this.a.toFixed(3)})`;
    }

    toHex(): string {
        const r = Math.round(Mathf.clamp01(this.r) * 255).toString(16).padStart(2, '0');
        const g = Math.round(Mathf.clamp01(this.g) * 255).toString(16).padStart(2, '0');
        const b = Math.round(Mathf.clamp01(this.b) * 255).toString(16).padStart(2, '0');
        const a = Math.round(Mathf.clamp01(this.a) * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}${a}`.toUpperCase();
    }

    toArray(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }

    /** Multiply color by scalar */
    multiply(scalar: number): Color {
        return new Color(this.r * scalar, this.g * scalar, this.b * scalar, this.a);
    }

    /** Add two colors */
    add(other: Color): Color {
        return new Color(this.r + other.r, this.g + other.g, this.b + other.b, this.a + other.a);
    }

    /** Subtract two colors */
    subtract(other: Color): Color {
        return new Color(this.r - other.r, this.g - other.g, this.b - other.b, this.a - other.a);
    }

    // ==================== Static Methods ====================

    /** Linear interpolation */
    static lerp(a: Color, b: Color, t: number): Color {
        t = Mathf.clamp01(t);
        return new Color(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t,
            a.a + (b.a - a.a) * t
        );
    }

    /** Linear interpolation (unclamped) */
    static lerpUnclamped(a: Color, b: Color, t: number): Color {
        return new Color(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t,
            a.a + (b.a - a.a) * t
        );
    }

    /** Create color from HSV */
    static HSVToRGB(h: number, s: number, v: number): Color {
        h = Mathf.repeat(h, 1);
        s = Mathf.clamp01(s);
        v = Mathf.clamp01(v);

        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;

        let r = 0, g = 0, b = 0;
        const hue = h * 6;

        if (hue < 1) { r = c; g = x; b = 0; }
        else if (hue < 2) { r = x; g = c; b = 0; }
        else if (hue < 3) { r = 0; g = c; b = x; }
        else if (hue < 4) { r = 0; g = x; b = c; }
        else if (hue < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return new Color(r + m, g + m, b + m, 1);
    }

    /** Convert color to HSV */
    static RGBToHSV(color: Color): { h: number; s: number; v: number } {
        const max = Math.max(color.r, color.g, color.b);
        const min = Math.min(color.r, color.g, color.b);
        const delta = max - min;

        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;

        if (delta !== 0) {
            if (max === color.r) {
                h = ((color.g - color.b) / delta) % 6;
            } else if (max === color.g) {
                h = (color.b - color.r) / delta + 2;
            } else {
                h = (color.r - color.g) / delta + 4;
            }
            h /= 6;
            if (h < 0) h += 1;
        }

        return { h, s, v };
    }

    /** Create color from hex string */
    static fromHex(hex: string): Color {
        hex = hex.replace('#', '');

        let r = 0, g = 0, b = 0, a = 1;

        if (hex.length === 3 || hex.length === 4) {
            r = parseInt(hex[0] + hex[0], 16) / 255;
            g = parseInt(hex[1] + hex[1], 16) / 255;
            b = parseInt(hex[2] + hex[2], 16) / 255;
            if (hex.length === 4) {
                a = parseInt(hex[3] + hex[3], 16) / 255;
            }
        } else if (hex.length === 6 || hex.length === 8) {
            r = parseInt(hex.substring(0, 2), 16) / 255;
            g = parseInt(hex.substring(2, 4), 16) / 255;
            b = parseInt(hex.substring(4, 6), 16) / 255;
            if (hex.length === 8) {
                a = parseInt(hex.substring(6, 8), 16) / 255;
            }
        }

        return new Color(r, g, b, a);
    }

    /** Create color from 32-bit integer */
    static fromInt(value: number): Color {
        return new Color(
            ((value >> 24) & 0xFF) / 255,
            ((value >> 16) & 0xFF) / 255,
            ((value >> 8) & 0xFF) / 255,
            (value & 0xFF) / 255
        );
    }

    /** Convert to 32-bit integer */
    toInt(): number {
        return (
            (Math.round(Mathf.clamp01(this.r) * 255) << 24) |
            (Math.round(Mathf.clamp01(this.g) * 255) << 16) |
            (Math.round(Mathf.clamp01(this.b) * 255) << 8) |
            Math.round(Mathf.clamp01(this.a) * 255)
        );
    }
}
