/**
 * Index buffer for storing triangle indices on the GPU.
 */

import { BufferUsage } from './constants';
import type { GraphicsDevice } from './GraphicsDevice';

export interface IndexBufferOptions {
    /** Number of indices */
    numIndices: number;
    /** Buffer usage hint */
    usage?: BufferUsage;
    /** Initial data (Uint16Array or Uint32Array) */
    data?: Uint16Array | Uint32Array;
    /** Use 32-bit indices (for large meshes) */
    format32?: boolean;
}

/**
 * An index buffer stores triangle indices on the GPU.
 *
 * @example
 * const ib = new IndexBuffer(device, {
 *     numIndices: 36,
 *     data: new Uint16Array([0, 1, 2, 2, 3, 0, ...])
 * });
 */
export class IndexBuffer {
    /** The graphics device this buffer belongs to */
    readonly device: GraphicsDevice;

    /** Number of indices */
    readonly numIndices: number;

    /** Buffer usage */
    readonly usage: BufferUsage;

    /** Whether using 32-bit indices */
    readonly format32: boolean;

    /** Bytes per index (2 or 4) */
    readonly bytesPerIndex: number;

    /** WebGL buffer handle */
    private _glBuffer: WebGLBuffer | null = null;

    /** Local data copy */
    private _data: Uint16Array | Uint32Array | null = null;

    /** Whether the buffer needs upload */
    private _dirty: boolean = false;

    constructor(device: GraphicsDevice, options: IndexBufferOptions) {
        this.device = device;
        this.numIndices = options.numIndices;
        this.usage = options.usage ?? BufferUsage.STATIC;
        this.format32 = options.format32 ?? false;
        this.bytesPerIndex = this.format32 ? 4 : 2;

        const gl = device.gl;
        if (gl) {
            this._glBuffer = gl.createBuffer();

            if (options.data) {
                this.setData(options.data);
            } else {
                // Allocate empty buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glBuffer);
                gl.bufferData(
                    gl.ELEMENT_ARRAY_BUFFER,
                    this.numIndices * this.bytesPerIndex,
                    this._getGLUsage(gl)
                );
            }
        }
    }

    /** Get the size of the buffer in bytes */
    get byteSize(): number {
        return this.numIndices * this.bytesPerIndex;
    }

    /** Get the WebGL index type */
    get glType(): number {
        const gl = this.device.gl;
        return this.format32 ? gl!.UNSIGNED_INT : gl!.UNSIGNED_SHORT;
    }

    /**
     * Set the buffer data.
     */
    setData(data: Uint16Array | Uint32Array): void {
        const gl = this.device.gl;
        if (!gl || !this._glBuffer) return;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, this._getGLUsage(gl));

        // Keep local copy for dynamic buffers
        if (this.usage !== BufferUsage.STATIC) {
            this._data = data.slice();
        }
    }

    /**
     * Lock the buffer for writing.
     */
    lock(): Uint16Array | Uint32Array {
        if (!this._data) {
            this._data = this.format32
                ? new Uint32Array(this.numIndices)
                : new Uint16Array(this.numIndices);
        }
        this._dirty = true;
        return this._data;
    }

    /**
     * Unlock the buffer and upload changes.
     */
    unlock(): void {
        if (this._dirty && this._data) {
            this.setData(this._data);
            this._dirty = false;
        }
    }

    /**
     * Bind this buffer for rendering.
     * @internal
     */
    _bind(): void {
        const gl = this.device.gl;
        if (gl && this._glBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glBuffer);
        }
    }

    /**
     * Destroy the buffer and release GPU resources.
     */
    destroy(): void {
        const gl = this.device.gl;
        if (gl && this._glBuffer) {
            gl.deleteBuffer(this._glBuffer);
            this._glBuffer = null;
        }
        this._data = null;
    }

    private _getGLUsage(gl: WebGL2RenderingContext): number {
        switch (this.usage) {
            case BufferUsage.STATIC:
                return gl.STATIC_DRAW;
            case BufferUsage.DYNAMIC:
                return gl.DYNAMIC_DRAW;
            case BufferUsage.STREAM:
                return gl.STREAM_DRAW;
            default:
                return gl.STATIC_DRAW;
        }
    }
}
