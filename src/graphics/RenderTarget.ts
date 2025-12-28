/**
 * Render target for off-screen rendering.
 */

import { PixelFormat } from './constants';
import { Texture } from './Texture';
import type { GraphicsDevice } from './GraphicsDevice';

export interface RenderTargetOptions {
    /** Color texture or null for no color attachment */
    colorBuffer?: Texture | null;
    /** Depth texture or null for no depth attachment */
    depthBuffer?: Texture | null;
    /** Width (required if no color buffer) */
    width?: number;
    /** Height (required if no color buffer) */
    height?: number;
    /** Create a depth renderbuffer instead of texture */
    depth?: boolean;
    /** Create a stencil renderbuffer */
    stencil?: boolean;
    /** Number of samples for MSAA */
    samples?: number;
    /** Name for debugging */
    name?: string;
}

/**
 * A render target allows rendering to off-screen textures.
 *
 * @example
 * const colorTexture = new Texture(device, { width: 512, height: 512 });
 * const rt = new RenderTarget(device, {
 *     colorBuffer: colorTexture,
 *     depth: true
 * });
 *
 * // Render to the target
 * device.setRenderTarget(rt);
 * // ... draw commands ...
 * device.setRenderTarget(null); // Back to screen
 */
export class RenderTarget {
    /** The graphics device */
    readonly device: GraphicsDevice;

    /** Name for debugging */
    name: string;

    /** Width in pixels */
    readonly width: number;

    /** Height in pixels */
    readonly height: number;

    /** Color buffer texture */
    readonly colorBuffer: Texture | null;

    /** Depth buffer texture */
    readonly depthBuffer: Texture | null;

    /** WebGL framebuffer handle */
    private _glFramebuffer: WebGLFramebuffer | null = null;

    /** Depth renderbuffer (if no depth texture) */
    private _glDepthBuffer: WebGLRenderbuffer | null = null;

    /** Stencil renderbuffer */
    private _glStencilBuffer: WebGLRenderbuffer | null = null;

    /** Whether the framebuffer is complete */
    private _complete: boolean = false;

    constructor(device: GraphicsDevice, options: RenderTargetOptions = {}) {
        this.device = device;
        this.name = options.name ?? '';
        this.colorBuffer = options.colorBuffer ?? null;
        this.depthBuffer = options.depthBuffer ?? null;

        // Determine dimensions
        if (this.colorBuffer) {
            this.width = this.colorBuffer.width;
            this.height = this.colorBuffer.height;
        } else if (this.depthBuffer) {
            this.width = this.depthBuffer.width;
            this.height = this.depthBuffer.height;
        } else {
            this.width = options.width ?? 256;
            this.height = options.height ?? 256;
        }

        const gl = device.gl;
        if (!gl) return;

        this._glFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);

        // Attach color buffer
        if (this.colorBuffer) {
            (this.colorBuffer as any)._bind(0);
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D,
                (this.colorBuffer as any)._glTexture,
                0
            );
        } else {
            // No color buffer - disable color writes
            gl.drawBuffers([gl.NONE]);
            gl.readBuffer(gl.NONE);
        }

        // Attach depth buffer
        if (this.depthBuffer) {
            (this.depthBuffer as any)._bind(0);
            const attachment = this._getDepthAttachment(gl, this.depthBuffer.format);
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                attachment,
                gl.TEXTURE_2D,
                (this.depthBuffer as any)._glTexture,
                0
            );
        } else if (options.depth || options.stencil) {
            // Create renderbuffer for depth/stencil
            this._glDepthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._glDepthBuffer);

            if (options.stencil) {
                gl.renderbufferStorage(
                    gl.RENDERBUFFER,
                    gl.DEPTH24_STENCIL8,
                    this.width,
                    this.height
                );
                gl.framebufferRenderbuffer(
                    gl.FRAMEBUFFER,
                    gl.DEPTH_STENCIL_ATTACHMENT,
                    gl.RENDERBUFFER,
                    this._glDepthBuffer
                );
            } else {
                gl.renderbufferStorage(
                    gl.RENDERBUFFER,
                    gl.DEPTH_COMPONENT24,
                    this.width,
                    this.height
                );
                gl.framebufferRenderbuffer(
                    gl.FRAMEBUFFER,
                    gl.DEPTH_ATTACHMENT,
                    gl.RENDERBUFFER,
                    this._glDepthBuffer
                );
            }
        }

        // Check framebuffer completeness
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error(`RenderTarget '${this.name}' incomplete:`, this._getFramebufferStatusString(status));
        } else {
            this._complete = true;
        }

        // Unbind
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /** Whether the render target is valid */
    get complete(): boolean {
        return this._complete;
    }

    /**
     * Bind this render target for rendering.
     * @internal
     */
    _bind(): void {
        const gl = this.device.gl;
        if (gl && this._glFramebuffer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
            gl.viewport(0, 0, this.width, this.height);
        }
    }

    /**
     * Unbind and return to default framebuffer.
     * @internal
     */
    _unbind(): void {
        const gl = this.device.gl;
        if (gl) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    /**
     * Destroy the render target and release resources.
     */
    destroy(): void {
        const gl = this.device.gl;
        if (!gl) return;

        if (this._glFramebuffer) {
            gl.deleteFramebuffer(this._glFramebuffer);
            this._glFramebuffer = null;
        }

        if (this._glDepthBuffer) {
            gl.deleteRenderbuffer(this._glDepthBuffer);
            this._glDepthBuffer = null;
        }

        if (this._glStencilBuffer) {
            gl.deleteRenderbuffer(this._glStencilBuffer);
            this._glStencilBuffer = null;
        }

        this._complete = false;
    }

    private _getDepthAttachment(gl: WebGL2RenderingContext, format: PixelFormat): number {
        switch (format) {
            case PixelFormat.DEPTH_STENCIL:
                return gl.DEPTH_STENCIL_ATTACHMENT;
            default:
                return gl.DEPTH_ATTACHMENT;
        }
    }

    private _getFramebufferStatusString(status: number): string {
        const gl = this.device.gl!;
        switch (status) {
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                return 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT';
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                return 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT';
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                return 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS';
            case gl.FRAMEBUFFER_UNSUPPORTED:
                return 'FRAMEBUFFER_UNSUPPORTED';
            case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
                return 'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE';
            default:
                return `Unknown (${status})`;
        }
    }
}
