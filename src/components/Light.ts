/**
 * Light component for illuminating the scene.
 */

import { Behaviour } from '../core/Behaviour';
import { Vector3 } from '../math/Vector3';
import { Color } from '../math/Color';
import { Matrix4x4 } from '../math/Matrix4x4';

export enum LightType {
    /** Directional light (sun-like, infinite distance) */
    DIRECTIONAL = 0,
    /** Point light (omni-directional, with falloff) */
    POINT = 1,
    /** Spot light (cone-shaped, with falloff) */
    SPOT = 2
}

export enum LightShadows {
    NONE = 0,
    HARD = 1,
    SOFT = 2
}

/**
 * Light component for scene illumination.
 *
 * @example
 * // Directional light (sun)
 * const sun = gameObject.addComponent(Light);
 * sun.type = LightType.DIRECTIONAL;
 * sun.color = new Color(1, 0.95, 0.9, 1);
 * sun.intensity = 1.5;
 *
 * @example
 * // Point light
 * const lamp = gameObject.addComponent(Light);
 * lamp.type = LightType.POINT;
 * lamp.range = 10;
 * lamp.color = Color.yellow;
 */
export class Light extends Behaviour {
    private _type: LightType = LightType.DIRECTIONAL;
    private _color: Color = Color.white;
    private _intensity: number = 1;
    private _range: number = 10;
    private _spotAngle: number = 45;
    private _innerSpotAngle: number = 35;
    private _shadows: LightShadows = LightShadows.NONE;
    private _shadowStrength: number = 1;
    private _shadowBias: number = 0.005;
    private _shadowNormalBias: number = 0.4;
    private _shadowNearPlane: number = 0.1;
    private _shadowResolution: number = 1024;
    // Reserved for future cookie texture support
    // @ts-expect-error - Reserved for future use
    private _cookieTexture: unknown = null;
    // @ts-expect-error - Reserved for future use
    private _cookieSize: number = 1;

    // ==================== Properties ====================

    /** Light type (Directional, Point, Spot) */
    get type(): LightType {
        return this._type;
    }
    set type(value: LightType) {
        this._type = value;
    }

    /** Light color */
    get color(): Color {
        return this._color;
    }
    set color(value: Color) {
        this._color = value;
    }

    /** Light intensity multiplier */
    get intensity(): number {
        return this._intensity;
    }
    set intensity(value: number) {
        this._intensity = Math.max(0, value);
    }

    /** Range for Point and Spot lights */
    get range(): number {
        return this._range;
    }
    set range(value: number) {
        this._range = Math.max(0.01, value);
    }

    /** Outer cone angle for Spot lights (degrees) */
    get spotAngle(): number {
        return this._spotAngle;
    }
    set spotAngle(value: number) {
        this._spotAngle = Math.max(1, Math.min(179, value));
        if (this._innerSpotAngle > this._spotAngle) {
            this._innerSpotAngle = this._spotAngle;
        }
    }

    /** Inner cone angle for Spot lights (degrees) */
    get innerSpotAngle(): number {
        return this._innerSpotAngle;
    }
    set innerSpotAngle(value: number) {
        this._innerSpotAngle = Math.max(0, Math.min(this._spotAngle, value));
    }

    /** Shadow mode */
    get shadows(): LightShadows {
        return this._shadows;
    }
    set shadows(value: LightShadows) {
        this._shadows = value;
    }

    /** Shadow strength (0-1) */
    get shadowStrength(): number {
        return this._shadowStrength;
    }
    set shadowStrength(value: number) {
        this._shadowStrength = Math.max(0, Math.min(1, value));
    }

    /** Shadow depth bias */
    get shadowBias(): number {
        return this._shadowBias;
    }
    set shadowBias(value: number) {
        this._shadowBias = value;
    }

    /** Shadow normal bias */
    get shadowNormalBias(): number {
        return this._shadowNormalBias;
    }
    set shadowNormalBias(value: number) {
        this._shadowNormalBias = value;
    }

    /** Shadow map resolution */
    get shadowResolution(): number {
        return this._shadowResolution;
    }
    set shadowResolution(value: number) {
        this._shadowResolution = Math.max(64, Math.min(4096, value));
    }

    // ==================== Computed Properties ====================

    /** Get the direction the light is pointing (forward in world space) */
    get direction(): Vector3 {
        if (!this.transform) return Vector3.forward;
        return this.transform.forward;
    }

    /** Get the world position of the light */
    get position(): Vector3 {
        if (!this.transform) return Vector3.zero;
        return this.transform.position;
    }

    /** Get the final color (color * intensity) */
    get finalColor(): Color {
        return new Color(
            this._color.r * this._intensity,
            this._color.g * this._intensity,
            this._color.b * this._intensity,
            this._color.a
        );
    }

    /** Check if this light casts shadows */
    get castsShadows(): boolean {
        return this._shadows !== LightShadows.NONE;
    }

    // ==================== Light Calculations ====================

    /**
     * Calculate attenuation factor at a given distance.
     * @param distance - Distance from light
     * @returns Attenuation factor (0-1)
     */
    getAttenuation(distance: number): number {
        if (this._type === LightType.DIRECTIONAL) {
            return 1;
        }

        if (distance >= this._range) {
            return 0;
        }

        // Smooth quadratic falloff
        const ratio = distance / this._range;
        const attenuation = Math.max(0, 1 - ratio * ratio);
        return attenuation * attenuation;
    }

    /**
     * Calculate spot angle attenuation.
     * @param dotProduct - Dot product of light direction and surface-to-light direction
     * @returns Spot attenuation factor (0-1)
     */
    getSpotAttenuation(dotProduct: number): number {
        if (this._type !== LightType.SPOT) {
            return 1;
        }

        const outerCos = Math.cos((this._spotAngle * 0.5) * Math.PI / 180);
        const innerCos = Math.cos((this._innerSpotAngle * 0.5) * Math.PI / 180);

        if (dotProduct <= outerCos) {
            return 0;
        }

        if (dotProduct >= innerCos) {
            return 1;
        }

        // Smooth falloff between inner and outer cone
        const t = (dotProduct - outerCos) / (innerCos - outerCos);
        return t * t;
    }

    /**
     * Get the view matrix for shadow rendering.
     * @returns View matrix from light's perspective
     */
    getShadowViewMatrix(): Matrix4x4 {
        if (!this.transform) return Matrix4x4.identity;

        const pos = this.transform.position;
        const forward = this.transform.forward;
        const up = this.transform.up;

        return Matrix4x4.lookAt(pos, pos.add(forward), up);
    }

    /**
     * Get the projection matrix for shadow rendering.
     * @param shadowDistance - Distance for directional light shadows
     * @returns Projection matrix for shadow mapping
     */
    getShadowProjectionMatrix(shadowDistance: number = 100): Matrix4x4 {
        switch (this._type) {
            case LightType.DIRECTIONAL: {
                const halfSize = shadowDistance * 0.5;
                return Matrix4x4.ortho(
                    -halfSize, halfSize,
                    -halfSize, halfSize,
                    this._shadowNearPlane, shadowDistance * 2
                );
            }
            case LightType.SPOT: {
                return Matrix4x4.perspective(
                    this._spotAngle * Math.PI / 180,
                    1,
                    this._shadowNearPlane,
                    this._range
                );
            }
            case LightType.POINT: {
                // Point lights use cube map shadows
                return Matrix4x4.perspective(
                    Math.PI / 2,
                    1,
                    this._shadowNearPlane,
                    this._range
                );
            }
            default:
                return Matrix4x4.identity;
        }
    }

    /**
     * Get packed light data for shader uniforms.
     * @returns Float32Array with light parameters
     */
    getShaderData(): Float32Array {
        const data = new Float32Array(16);

        // Position (xyz) + type (w)
        const pos = this.position;
        data[0] = pos.x;
        data[1] = pos.y;
        data[2] = pos.z;
        data[3] = this._type;

        // Direction (xyz) + range (w)
        const dir = this.direction;
        data[4] = dir.x;
        data[5] = dir.y;
        data[6] = dir.z;
        data[7] = this._range;

        // Color (rgb) + intensity (a)
        data[8] = this._color.r;
        data[9] = this._color.g;
        data[10] = this._color.b;
        data[11] = this._intensity;

        // Spot angles (cos outer, cos inner) + shadow params
        data[12] = Math.cos((this._spotAngle * 0.5) * Math.PI / 180);
        data[13] = Math.cos((this._innerSpotAngle * 0.5) * Math.PI / 180);
        data[14] = this._shadows !== LightShadows.NONE ? 1 : 0;
        data[15] = this._shadowStrength;

        return data;
    }
}
