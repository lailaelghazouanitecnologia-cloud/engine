/**
 * Texture class for 2D textures.
 */

import { PixelFormat, AddressMode, FilterMode } from './constants';
import type { GraphicsDevice } from './GraphicsDevice';

export interface TextureOptions {
    /** Texture width */
    width?: number;
    /** Texture height */
    height?: number;
    /** Pixel format */
    format?: PixelFormat;
    /** Generate mipmaps */
    mipmaps?: boolean;
    /** Minification filter */
    minFilter?: FilterMode;
    /** Magnification filter */
    magFilter?: FilterMode;
    /** Horizontal address mode */
    addressU?: AddressMode;
    /** Vertical address mode */
    addressV?: AddressMode;
    /** Anisotropic filtering level */
    anisotropy?: number;
    /** Initial data (ImageData, HTMLImageElement, etc.) */
    data?: TexImageSource | ArrayBufferView | null;
    /** Flip Y coordinate on upload */
    flipY?: boolean;
    /** Premultiply alpha */
    premultiplyAlpha?: boolean;
    /** Texture name for debugging */
    name?: string;
}

/**
 * A 2D texture resource.
 *
 * @example
 * const texture = new Texture(device, {
 *     width: 256,
 *     height: 256,
 *     format: PixelFormat.RGBA8,
 *     mipmaps: true
 * });
 *
 * @example
 * // Create from image
 * const image = new Image();
 * image.onload = () => {
 *     const texture = new Texture(device, {
 *         width: image.width,
 *         height: image.height,
 *         data: image,
 *         mipmaps: true
 *     });
 * };
 * image.src = 'texture.png';
 */
export class Texture {
    /** The graphics device */
    readonly device: GraphicsDevice;

    /** Texture name */
    name: string;

    /** Texture width */
    readonly width: number;

    /** Texture height */
    readonly height: number;

    /** Pixel format */
    readonly format: PixelFormat;

    /** Whether mipmaps are enabled */
    readonly mipmaps: boolean;

    /** WebGL texture handle */
    private _glTexture: WebGLTexture | null = null;

    /** Minification filter */
    private _minFilter: FilterMode;

    /** Magnification filter */
    private _magFilter: FilterMode;

    /** Horizontal address mode */
    private _addressU: AddressMode;

    /** Vertical address mode */
    private _addressV: AddressMode;

    /** Anisotropic filtering level */
    private _anisotropy: number;

    /** Whether sampler state needs update */
    private _samplerDirty: boolean = true;

    constructor(device: GraphicsDevice, options: TextureOptions = {}) {
        this.device = device;
        this.name = options.name ?? '';
        this.width = options.width ?? 4;
        this.height = options.height ?? 4;
        this.format = options.format ?? PixelFormat.RGBA8;
        this.mipmaps = options.mipmaps ?? true;

        this._minFilter = options.minFilter ?? (this.mipmaps ? FilterMode.LINEAR_MIPMAP_LINEAR : FilterMode.LINEAR);
        this._magFilter = options.magFilter ?? FilterMode.LINEAR;
        this._addressU = options.addressU ?? AddressMode.REPEAT;
        this._addressV = options.addressV ?? AddressMode.REPEAT;
        this._anisotropy = options.anisotropy ?? 1;

        const gl = device.gl;
        if (gl) {
            this._glTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this._glTexture);

            // Set initial state
            const flipY = options.flipY ?? true;
            const premultiplyAlpha = options.premultiplyAlpha ?? false;

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha);

            if (options.data) {
                this._upload(options.data);
            } else {
                // Allocate empty texture
                const { internalFormat, format: glFormat, type } = this._getGLFormats(gl);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    internalFormat,
                    this.width,
                    this.height,
                    0,
                    glFormat,
                    type,
                    null
                );
            }

            if (this.mipmaps) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }

            this._updateSampler();
        }
    }

    /** Get/set minification filter */
    get minFilter(): FilterMode {
        return this._minFilter;
    }
    set minFilter(value: FilterMode) {
        if (this._minFilter !== value) {
            this._minFilter = value;
            this._samplerDirty = true;
        }
    }

    /** Get/set magnification filter */
    get magFilter(): FilterMode {
        return this._magFilter;
    }
    set magFilter(value: FilterMode) {
        if (this._magFilter !== value) {
            this._magFilter = value;
            this._samplerDirty = true;
        }
    }

    /** Get/set horizontal address mode */
    get addressU(): AddressMode {
        return this._addressU;
    }
    set addressU(value: AddressMode) {
        if (this._addressU !== value) {
            this._addressU = value;
            this._samplerDirty = true;
        }
    }

    /** Get/set vertical address mode */
    get addressV(): AddressMode {
        return this._addressV;
    }
    set addressV(value: AddressMode) {
        if (this._addressV !== value) {
            this._addressV = value;
            this._samplerDirty = true;
        }
    }

    /**
     * Upload image data to the texture.
     */
    setSource(source: TexImageSource): void {
        const gl = this.device.gl;
        if (!gl || !this._glTexture) return;

        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        this._upload(source);

        if (this.mipmaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }

    /**
     * Upload raw pixel data.
     */
    setData(data: ArrayBufferView, level: number = 0): void {
        const gl = this.device.gl;
        if (!gl || !this._glTexture) return;

        const { internalFormat, format: glFormat, type } = this._getGLFormats(gl);
        const width = Math.max(1, this.width >> level);
        const height = Math.max(1, this.height >> level);

        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            0,
            glFormat,
            type,
            data
        );
    }

    /**
     * Bind this texture to a texture unit.
     * @internal
     */
    _bind(unit: number = 0): void {
        const gl = this.device.gl;
        if (!gl || !this._glTexture) return;

        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);

        if (this._samplerDirty) {
            this._updateSampler();
            this._samplerDirty = false;
        }
    }

    /**
     * Destroy the texture and release GPU resources.
     */
    destroy(): void {
        const gl = this.device.gl;
        if (gl && this._glTexture) {
            gl.deleteTexture(this._glTexture);
            this._glTexture = null;
        }
    }

    private _upload(source: TexImageSource | ArrayBufferView): void {
        const gl = this.device.gl!;
        const { internalFormat, format: glFormat, type } = this._getGLFormats(gl);

        if (source instanceof Uint8Array || source instanceof Float32Array || ArrayBuffer.isView(source)) {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                internalFormat,
                this.width,
                this.height,
                0,
                glFormat,
                type,
                source as ArrayBufferView
            );
        } else {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                internalFormat,
                glFormat,
                type,
                source as TexImageSource
            );
        }
    }

    private _updateSampler(): void {
        const gl = this.device.gl;
        if (!gl) return;

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._getGLFilter(this._minFilter));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._getGLFilter(this._magFilter));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this._getGLAddressMode(this._addressU));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this._getGLAddressMode(this._addressV));

        if (this._anisotropy > 1 && this.device.capabilities.supportsAnisotropicFiltering) {
            const ext = gl.getExtension('EXT_texture_filter_anisotropic');
            if (ext) {
                gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this._anisotropy);
            }
        }
    }

    private _getGLFormats(gl: WebGL2RenderingContext): { internalFormat: number; format: number; type: number } {
        switch (this.format) {
            case PixelFormat.RGBA8:
                return { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
            case PixelFormat.RGB8:
                return { internalFormat: gl.RGB8, format: gl.RGB, type: gl.UNSIGNED_BYTE };
            case PixelFormat.RGBA32F:
                return { internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT };
            case PixelFormat.RGBA16F:
                return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
            case PixelFormat.R32F:
                return { internalFormat: gl.R32F, format: gl.RED, type: gl.FLOAT };
            case PixelFormat.DEPTH:
            case PixelFormat.DEPTH24:
                return { internalFormat: gl.DEPTH_COMPONENT24, format: gl.DEPTH_COMPONENT, type: gl.UNSIGNED_INT };
            case PixelFormat.DEPTH32F:
                return { internalFormat: gl.DEPTH_COMPONENT32F, format: gl.DEPTH_COMPONENT, type: gl.FLOAT };
            case PixelFormat.DEPTH_STENCIL:
                return { internalFormat: gl.DEPTH24_STENCIL8, format: gl.DEPTH_STENCIL, type: gl.UNSIGNED_INT_24_8 };
            default:
                return { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
        }
    }

    private _getGLFilter(filter: FilterMode): number {
        const gl = this.device.gl!;
        switch (filter) {
            case FilterMode.NEAREST: return gl.NEAREST;
            case FilterMode.LINEAR: return gl.LINEAR;
            case FilterMode.NEAREST_MIPMAP_NEAREST: return gl.NEAREST_MIPMAP_NEAREST;
            case FilterMode.NEAREST_MIPMAP_LINEAR: return gl.NEAREST_MIPMAP_LINEAR;
            case FilterMode.LINEAR_MIPMAP_NEAREST: return gl.LINEAR_MIPMAP_NEAREST;
            case FilterMode.LINEAR_MIPMAP_LINEAR: return gl.LINEAR_MIPMAP_LINEAR;
            default: return gl.LINEAR;
        }
    }

    private _getGLAddressMode(mode: AddressMode): number {
        const gl = this.device.gl!;
        switch (mode) {
            case AddressMode.REPEAT: return gl.REPEAT;
            case AddressMode.CLAMP_TO_EDGE: return gl.CLAMP_TO_EDGE;
            case AddressMode.MIRRORED_REPEAT: return gl.MIRRORED_REPEAT;
            default: return gl.REPEAT;
        }
    }
}
