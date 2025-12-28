/**
 * Material class for defining surface appearance.
 */

import { Color } from '../math/Color';
import { Vector4 } from '../math/Vector4';
import { BlendMode, CullFace, CompareFunc } from './constants';
import type { Shader } from './Shader';
import type { Texture } from './Texture';
import type { GraphicsDevice } from './GraphicsDevice';

export enum RenderQueue {
    BACKGROUND = 1000,
    GEOMETRY = 2000,
    ALPHA_TEST = 2450,
    TRANSPARENT = 3000,
    OVERLAY = 4000
}

export interface MaterialPropertyValue {
    type: 'float' | 'int' | 'color' | 'vector' | 'matrix' | 'texture';
    value: number | number[] | Float32Array | Color | Vector4 | Texture;
}

/**
 * Base material class for defining surface rendering properties.
 *
 * @example
 * const material = new Material(device, shader);
 * material.setColor('_Color', Color.red);
 * material.setFloat('_Metallic', 0.8);
 * material.setTexture('_MainTex', texture);
 */
export class Material {
    /** The graphics device */
    readonly device: GraphicsDevice;

    /** Material name */
    name: string = '';

    /** Shader used by this material */
    shader: Shader | null = null;

    /** Render queue for sorting */
    renderQueue: number = RenderQueue.GEOMETRY;

    /** Cull mode */
    cullFace: CullFace = CullFace.BACK;

    /** Depth write enabled */
    depthWrite: boolean = true;

    /** Depth test enabled */
    depthTest: boolean = true;

    /** Depth comparison function */
    depthFunc: CompareFunc = CompareFunc.LESSEQUAL;

    /** Blend enabled */
    blend: boolean = false;

    /** Source blend factor */
    srcBlend: BlendMode = BlendMode.ONE;

    /** Destination blend factor */
    dstBlend: BlendMode = BlendMode.ZERO;

    /** Property storage */
    private _properties: Map<string, MaterialPropertyValue> = new Map();

    /** Textures bound to this material */
    private _textures: Map<string, Texture> = new Map();

    constructor(device: GraphicsDevice, shader?: Shader) {
        this.device = device;
        this.shader = shader ?? null;
    }

    // ==================== Property Setters ====================

    /**
     * Set a float property.
     */
    setFloat(name: string, value: number): void {
        this._properties.set(name, { type: 'float', value });
    }

    /**
     * Set an integer property.
     */
    setInt(name: string, value: number): void {
        this._properties.set(name, { type: 'int', value: Math.floor(value) });
    }

    /**
     * Set a color property.
     */
    setColor(name: string, value: Color): void {
        this._properties.set(name, { type: 'color', value });
    }

    /**
     * Set a vector property.
     */
    setVector(name: string, value: Vector4 | number[]): void {
        const v = value instanceof Vector4 ? [value.x, value.y, value.z, value.w] : value;
        this._properties.set(name, { type: 'vector', value: v });
    }

    /**
     * Set a matrix property.
     */
    setMatrix(name: string, value: Float32Array): void {
        this._properties.set(name, { type: 'matrix', value });
    }

    /**
     * Set a texture property.
     */
    setTexture(name: string, value: Texture): void {
        this._properties.set(name, { type: 'texture', value });
        this._textures.set(name, value);
    }

    // ==================== Property Getters ====================

    /**
     * Get a float property.
     */
    getFloat(name: string): number {
        const prop = this._properties.get(name);
        return prop?.type === 'float' ? prop.value as number : 0;
    }

    /**
     * Get an integer property.
     */
    getInt(name: string): number {
        const prop = this._properties.get(name);
        return prop?.type === 'int' ? prop.value as number : 0;
    }

    /**
     * Get a color property.
     */
    getColor(name: string): Color | null {
        const prop = this._properties.get(name);
        return prop?.type === 'color' ? prop.value as Color : null;
    }

    /**
     * Get a vector property.
     */
    getVector(name: string): number[] | null {
        const prop = this._properties.get(name);
        return prop?.type === 'vector' ? prop.value as number[] : null;
    }

    /**
     * Get a texture property.
     */
    getTexture(name: string): Texture | null {
        return this._textures.get(name) ?? null;
    }

    /**
     * Check if a property exists.
     */
    hasProperty(name: string): boolean {
        return this._properties.has(name);
    }

    // ==================== Rendering ====================

    /**
     * Apply the material state and uniforms for rendering.
     */
    apply(): void {
        if (!this.shader) return;

        // Bind shader
        this.shader.bind();

        // Set render state
        this.device.setCullFace(this.cullFace);
        this.device.setDepthState({
            write: this.depthWrite,
            test: this.depthTest,
            func: this.depthFunc
        });
        this.device.setBlendState({
            enabled: this.blend,
            srcRgb: this.srcBlend,
            dstRgb: this.dstBlend,
            srcAlpha: this.srcBlend,
            dstAlpha: this.dstBlend
        });

        // Set uniforms
        let textureUnit = 0;
        for (const [name, prop] of this._properties) {
            switch (prop.type) {
                case 'float':
                    this.shader.setUniform(name, prop.value as number);
                    break;
                case 'int':
                    this.shader.setUniform(name, prop.value as number);
                    break;
                case 'color': {
                    const c = prop.value as Color;
                    this.shader.setUniform(name, [c.r, c.g, c.b, c.a]);
                    break;
                }
                case 'vector':
                    this.shader.setUniform(name, prop.value as number[]);
                    break;
                case 'matrix':
                    this.shader.setUniform(name, prop.value as Float32Array);
                    break;
                case 'texture': {
                    const texture = prop.value as Texture;
                    this.device.setTexture(texture, textureUnit);
                    this.shader.setUniform(name, textureUnit);
                    textureUnit++;
                    break;
                }
            }
        }
    }

    /**
     * Create a copy of this material.
     */
    clone(): Material {
        const copy = new Material(this.device, this.shader ?? undefined);
        copy.name = this.name + ' (Clone)';
        copy.renderQueue = this.renderQueue;
        copy.cullFace = this.cullFace;
        copy.depthWrite = this.depthWrite;
        copy.depthTest = this.depthTest;
        copy.depthFunc = this.depthFunc;
        copy.blend = this.blend;
        copy.srcBlend = this.srcBlend;
        copy.dstBlend = this.dstBlend;

        // Copy properties
        for (const [name, prop] of this._properties) {
            copy._properties.set(name, { ...prop });
        }
        for (const [name, tex] of this._textures) {
            copy._textures.set(name, tex);
        }

        return copy;
    }

    /**
     * Dispose of material resources.
     */
    dispose(): void {
        this._properties.clear();
        this._textures.clear();
    }
}

/**
 * Standard PBR material with common properties.
 */
export class StandardMaterial extends Material {
    constructor(device: GraphicsDevice, shader?: Shader) {
        super(device, shader);

        // Set default PBR properties
        this.setColor('_Color', Color.white);
        this.setFloat('_Metallic', 0);
        this.setFloat('_Smoothness', 0.5);
        this.setFloat('_Emission', 0);
        this.setColor('_EmissionColor', Color.black);
    }

    // Convenience getters/setters for common properties

    get color(): Color {
        return this.getColor('_Color') ?? Color.white;
    }
    set color(value: Color) {
        this.setColor('_Color', value);
    }

    get metallic(): number {
        return this.getFloat('_Metallic');
    }
    set metallic(value: number) {
        this.setFloat('_Metallic', Math.max(0, Math.min(1, value)));
    }

    get smoothness(): number {
        return this.getFloat('_Smoothness');
    }
    set smoothness(value: number) {
        this.setFloat('_Smoothness', Math.max(0, Math.min(1, value)));
    }

    get mainTexture(): Texture | null {
        return this.getTexture('_MainTex');
    }
    set mainTexture(value: Texture | null) {
        if (value) {
            this.setTexture('_MainTex', value);
        }
    }

    get normalMap(): Texture | null {
        return this.getTexture('_BumpMap');
    }
    set normalMap(value: Texture | null) {
        if (value) {
            this.setTexture('_BumpMap', value);
        }
    }

    get emissionColor(): Color {
        return this.getColor('_EmissionColor') ?? Color.black;
    }
    set emissionColor(value: Color) {
        this.setColor('_EmissionColor', value);
    }
}

/**
 * Unlit material that ignores lighting.
 */
export class UnlitMaterial extends Material {
    constructor(device: GraphicsDevice, shader?: Shader) {
        super(device, shader);

        this.setColor('_Color', Color.white);
    }

    get color(): Color {
        return this.getColor('_Color') ?? Color.white;
    }
    set color(value: Color) {
        this.setColor('_Color', value);
    }

    get mainTexture(): Texture | null {
        return this.getTexture('_MainTex');
    }
    set mainTexture(value: Texture | null) {
        if (value) {
            this.setTexture('_MainTex', value);
        }
    }
}
