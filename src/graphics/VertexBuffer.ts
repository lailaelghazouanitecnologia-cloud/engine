/**
 * Vertex buffer for storing vertex data on the GPU.
 */

import { BufferUsage } from './constants';
import { VertexFormat } from './VertexFormat';
import type { GraphicsDevice } from './GraphicsDevice';

export interface VertexBufferOptions {
    /** Vertex format describing the data layout */
    format: VertexFormat;
    /** Number of vertices */
    numVertices: number;
    /** Buffer usage hint */
    usage?: BufferUsage;
    /** Initial data */
    data?: ArrayBuffer | ArrayBufferView;
}

/**
 * A vertex buffer stores vertex attribute data on the GPU.
 *
 * @example
 * const vb = new VertexBuffer(device, {
 *     format: VertexFormat.POSITION_NORMAL_UV,
 *     numVertices: 100,
 *     usage: BufferUsage.STATIC,
 *     data: vertexData
 * });
 */
export class VertexBuffer {
    /** The graphics device this buffer belongs to */
    readonly device: GraphicsDevice;

    /** Vertex format */
    readonly format: VertexFormat;

    /** Number of vertices */
    readonly numVertices: number;

    /** Buffer usage */
    readonly usage: BufferUsage;

    /** WebGL buffer handle */
    private _glBuffer: WebGLBuffer | null = null;

    /** Whether the buffer needs to be uploaded */
    private _dirty: boolean = false;

    /** Local data copy */
    private _data: ArrayBuffer | null = null;

    constructor(device: GraphicsDevice, options: VertexBufferOptions) {
        this.device = device;
        this.format = options.format;
        this.numVertices = options.numVertices;
        this.usage = options.usage ?? BufferUsage.STATIC;

        const gl = device.gl;
        if (gl) {
            this._glBuffer = gl.createBuffer();

            if (options.data) {
                this.setData(options.data);
            } else {
                // Allocate empty buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
                gl.bufferData(
                    gl.ARRAY_BUFFER,
                    this.numVertices * this.format.stride,
                    this._getGLUsage(gl)
                );
            }
        }
    }

    /** Get the size of the buffer in bytes */
    get byteSize(): number {
        return this.numVertices * this.format.stride;
    }

    /**
     * Set the buffer data.
     * @param data - The vertex data
     * @param offset - Byte offset to start writing at
     */
    setData(data: ArrayBuffer | ArrayBufferView, offset: number = 0): void {
        const gl = this.device.gl;
        if (!gl || !this._glBuffer) return;

        const buffer = data instanceof ArrayBuffer ? data : data.buffer;
        const byteOffset = data instanceof ArrayBuffer ? 0 : data.byteOffset;
        const byteLength = data instanceof ArrayBuffer ? data.byteLength : data.byteLength;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);

        if (offset === 0 && byteLength === this.byteSize) {
            gl.bufferData(gl.ARRAY_BUFFER, data, this._getGLUsage(gl));
        } else {
            gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
        }

        // Keep local copy for dynamic buffers
        if (this.usage !== BufferUsage.STATIC) {
            if (!this._data || this._data.byteLength !== this.byteSize) {
                this._data = new ArrayBuffer(this.byteSize);
            }
            new Uint8Array(this._data).set(
                new Uint8Array(buffer, byteOffset, byteLength),
                offset
            );
        }
    }

    /**
     * Lock the buffer for writing and return a typed array view.
     */
    lock(): Float32Array {
        if (!this._data) {
            this._data = new ArrayBuffer(this.byteSize);
        }
        this._dirty = true;
        return new Float32Array(this._data);
    }

    /**
     * Unlock the buffer and upload changes to GPU.
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
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
