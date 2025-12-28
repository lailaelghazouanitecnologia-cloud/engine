/**
 * Graphics Device - WebGL2 abstraction layer.
 * Main interface for GPU operations.
 */

import { Color } from '../math/Color';
import {
    PrimitiveType,
    BlendMode,
    BlendEquation,
    CompareFunc,
    CullFace,
    ClearFlag,
    StencilOp,
    DeviceCapabilities,
    VertexElementType
} from './constants';
import { VertexFormat } from './VertexFormat';
import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { RenderTarget } from './RenderTarget';

export interface GraphicsDeviceOptions {
    /** Canvas element to render to */
    canvas: HTMLCanvasElement;
    /** Request alpha channel in the backbuffer */
    alpha?: boolean;
    /** Request depth buffer */
    depth?: boolean;
    /** Request stencil buffer */
    stencil?: boolean;
    /** Request antialiasing */
    antialias?: boolean;
    /** Request premultiplied alpha */
    premultipliedAlpha?: boolean;
    /** Preserve the drawing buffer */
    preserveDrawingBuffer?: boolean;
    /** Power preference (low-power, high-performance, default) */
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    /** Fail if requirements not met */
    failIfMajorPerformanceCaveat?: boolean;
}

export interface BlendState {
    enabled: boolean;
    srcRgb: BlendMode;
    dstRgb: BlendMode;
    srcAlpha: BlendMode;
    dstAlpha: BlendMode;
    equationRgb: BlendEquation;
    equationAlpha: BlendEquation;
}

export interface DepthState {
    write: boolean;
    test: boolean;
    func: CompareFunc;
}

export interface StencilState {
    enabled: boolean;
    func: CompareFunc;
    ref: number;
    readMask: number;
    writeMask: number;
    failOp: StencilOp;
    zfailOp: StencilOp;
    passOp: StencilOp;
}

/**
 * The GraphicsDevice provides a WebGL2 abstraction for rendering.
 *
 * @example
 * const canvas = document.getElementById('canvas');
 * const device = new GraphicsDevice({ canvas, antialias: true });
 *
 * // Main render loop
 * function render() {
 *     device.clear(Color.black, 1.0);
 *     // ... render commands ...
 *     requestAnimationFrame(render);
 * }
 */
export class GraphicsDevice {
    /** Canvas element */
    readonly canvas: HTMLCanvasElement;

    /** WebGL2 rendering context */
    readonly gl: WebGL2RenderingContext | null;

    /** Device capabilities */
    readonly capabilities: DeviceCapabilities;

    /** Current render target (null = screen) */
    private _renderTarget: RenderTarget | null = null;

    /** Current shader */
    private _shader: Shader | null = null;

    /** Current blend state */
    private _blendState: BlendState;

    /** Current depth state */
    private _depthState: DepthState;

    /** Current cull mode */
    private _cullFace: CullFace = CullFace.BACK;

    /** Bound vertex buffers */
    private _vertexBuffers: (VertexBuffer | null)[] = [];

    /** Bound index buffer */
    private _indexBuffer: IndexBuffer | null = null;

    /** Bound textures */
    private _textures: (Texture | null)[] = [];

    /** Viewport dimensions */
    private _viewport: { x: number; y: number; width: number; height: number };

    /** Scissor rect */
    private _scissor: { x: number; y: number; width: number; height: number } | null = null;

    /** Color write mask */
    private _colorWrite: [boolean, boolean, boolean, boolean] = [true, true, true, true];

    constructor(options: GraphicsDeviceOptions) {
        this.canvas = options.canvas;

        // Create WebGL2 context
        const contextOptions: WebGLContextAttributes = {
            alpha: options.alpha ?? true,
            depth: options.depth ?? true,
            stencil: options.stencil ?? false,
            antialias: options.antialias ?? true,
            premultipliedAlpha: options.premultipliedAlpha ?? true,
            preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
            powerPreference: options.powerPreference ?? 'default',
            failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat ?? false
        };

        this.gl = this.canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;

        if (!this.gl) {
            console.error('WebGL2 not supported');
            this.capabilities = this._getEmptyCapabilities();
            this._viewport = { x: 0, y: 0, width: 0, height: 0 };
            this._blendState = this._getDefaultBlendState();
            this._depthState = this._getDefaultDepthState();
            return;
        }

        // Query capabilities
        this.capabilities = this._queryCapabilities();

        // Initialize viewport
        this._viewport = {
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        };

        // Initialize states
        this._blendState = this._getDefaultBlendState();
        this._depthState = this._getDefaultDepthState();

        // Set initial GL state
        this._initializeState();

        console.log('[GraphicsDevice] Initialized WebGL2');
    }

    /** Get canvas width */
    get width(): number {
        return this.canvas.width;
    }

    /** Get canvas height */
    get height(): number {
        return this.canvas.height;
    }

    /**
     * Resize the canvas and viewport.
     */
    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;

        if (!this._renderTarget) {
            this.setViewport(0, 0, width, height);
        }
    }

    /**
     * Set the current render target.
     * @param target - Render target or null for screen
     */
    setRenderTarget(target: RenderTarget | null): void {
        this._renderTarget = target;

        if (target) {
            target._bind();
        } else {
            const gl = this.gl;
            if (gl) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    /**
     * Set the viewport.
     */
    setViewport(x: number, y: number, width: number, height: number): void {
        this._viewport = { x, y, width, height };
        if (this.gl) {
            this.gl.viewport(x, y, width, height);
        }
    }

    /**
     * Enable or disable scissor test.
     */
    setScissor(x: number, y: number, width: number, height: number): void {
        const gl = this.gl;
        if (!gl) return;

        if (width > 0 && height > 0) {
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(x, y, width, height);
            this._scissor = { x, y, width, height };
        } else {
            gl.disable(gl.SCISSOR_TEST);
            this._scissor = null;
        }
    }

    /**
     * Clear the current render target.
     */
    clear(
        color?: Color | null,
        depth?: number,
        stencil?: number,
        flags: ClearFlag = ClearFlag.ALL
    ): void {
        const gl = this.gl;
        if (!gl) return;

        let glFlags = 0;

        if ((flags & ClearFlag.COLOR) && color) {
            gl.clearColor(color.r, color.g, color.b, color.a);
            glFlags |= gl.COLOR_BUFFER_BIT;
        }

        if ((flags & ClearFlag.DEPTH) && depth !== undefined) {
            gl.clearDepth(depth);
            glFlags |= gl.DEPTH_BUFFER_BIT;
        }

        if ((flags & ClearFlag.STENCIL) && stencil !== undefined) {
            gl.clearStencil(stencil);
            glFlags |= gl.STENCIL_BUFFER_BIT;
        }

        if (glFlags !== 0) {
            gl.clear(glFlags);
        }
    }

    /**
     * Set the active shader.
     */
    setShader(shader: Shader): void {
        if (this._shader !== shader) {
            this._shader = shader;
            shader.bind();
        }
    }

    /**
     * Set blend state.
     */
    setBlendState(state: Partial<BlendState>): void {
        const gl = this.gl;
        if (!gl) return;

        if (state.enabled !== undefined && state.enabled !== this._blendState.enabled) {
            this._blendState.enabled = state.enabled;
            if (state.enabled) {
                gl.enable(gl.BLEND);
            } else {
                gl.disable(gl.BLEND);
            }
        }

        if (state.srcRgb !== undefined || state.dstRgb !== undefined ||
            state.srcAlpha !== undefined || state.dstAlpha !== undefined) {
            this._blendState.srcRgb = state.srcRgb ?? this._blendState.srcRgb;
            this._blendState.dstRgb = state.dstRgb ?? this._blendState.dstRgb;
            this._blendState.srcAlpha = state.srcAlpha ?? this._blendState.srcAlpha;
            this._blendState.dstAlpha = state.dstAlpha ?? this._blendState.dstAlpha;

            gl.blendFuncSeparate(
                this._blendModeToGL(this._blendState.srcRgb),
                this._blendModeToGL(this._blendState.dstRgb),
                this._blendModeToGL(this._blendState.srcAlpha),
                this._blendModeToGL(this._blendState.dstAlpha)
            );
        }

        if (state.equationRgb !== undefined || state.equationAlpha !== undefined) {
            this._blendState.equationRgb = state.equationRgb ?? this._blendState.equationRgb;
            this._blendState.equationAlpha = state.equationAlpha ?? this._blendState.equationAlpha;

            gl.blendEquationSeparate(
                this._blendEquationToGL(this._blendState.equationRgb),
                this._blendEquationToGL(this._blendState.equationAlpha)
            );
        }
    }

    /**
     * Set depth state.
     */
    setDepthState(state: Partial<DepthState>): void {
        const gl = this.gl;
        if (!gl) return;

        if (state.test !== undefined && state.test !== this._depthState.test) {
            this._depthState.test = state.test;
            if (state.test) {
                gl.enable(gl.DEPTH_TEST);
            } else {
                gl.disable(gl.DEPTH_TEST);
            }
        }

        if (state.write !== undefined && state.write !== this._depthState.write) {
            this._depthState.write = state.write;
            gl.depthMask(state.write);
        }

        if (state.func !== undefined && state.func !== this._depthState.func) {
            this._depthState.func = state.func;
            gl.depthFunc(this._compareFuncToGL(state.func));
        }
    }

    /**
     * Set cull face mode.
     */
    setCullFace(mode: CullFace): void {
        const gl = this.gl;
        if (!gl || mode === this._cullFace) return;

        this._cullFace = mode;

        if (mode === CullFace.NONE) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(mode === CullFace.FRONT ? gl.FRONT : gl.BACK);
        }
    }

    /**
     * Bind a vertex buffer.
     */
    setVertexBuffer(buffer: VertexBuffer, slot: number = 0): void {
        this._vertexBuffers[slot] = buffer;
    }

    /**
     * Bind an index buffer.
     */
    setIndexBuffer(buffer: IndexBuffer): void {
        this._indexBuffer = buffer;
        buffer._bind();
    }

    /**
     * Bind a texture to a slot.
     */
    setTexture(texture: Texture, slot: number = 0): void {
        this._textures[slot] = texture;
        texture._bind(slot);
    }

    /**
     * Draw primitives using bound buffers.
     */
    draw(primitiveType: PrimitiveType, numVertices: number, startVertex: number = 0): void {
        const gl = this.gl;
        if (!gl) return;

        this._setupVertexAttributes();
        gl.drawArrays(this._primitiveTypeToGL(primitiveType), startVertex, numVertices);
    }

    /**
     * Draw indexed primitives.
     */
    drawIndexed(
        primitiveType: PrimitiveType,
        numIndices: number,
        startIndex: number = 0
    ): void {
        const gl = this.gl;
        if (!gl || !this._indexBuffer) return;

        this._setupVertexAttributes();

        const offset = startIndex * this._indexBuffer.bytesPerIndex;
        gl.drawElements(
            this._primitiveTypeToGL(primitiveType),
            numIndices,
            this._indexBuffer.glType,
            offset
        );
    }

    /**
     * Draw instanced primitives.
     */
    drawInstanced(
        primitiveType: PrimitiveType,
        numVertices: number,
        numInstances: number,
        startVertex: number = 0
    ): void {
        const gl = this.gl;
        if (!gl) return;

        this._setupVertexAttributes();
        gl.drawArraysInstanced(
            this._primitiveTypeToGL(primitiveType),
            startVertex,
            numVertices,
            numInstances
        );
    }

    /**
     * Draw indexed instanced primitives.
     */
    drawIndexedInstanced(
        primitiveType: PrimitiveType,
        numIndices: number,
        numInstances: number,
        startIndex: number = 0
    ): void {
        const gl = this.gl;
        if (!gl || !this._indexBuffer) return;

        this._setupVertexAttributes();

        const offset = startIndex * this._indexBuffer.bytesPerIndex;
        gl.drawElementsInstanced(
            this._primitiveTypeToGL(primitiveType),
            numIndices,
            this._indexBuffer.glType,
            offset,
            numInstances
        );
    }

    private _setupVertexAttributes(): void {
        const gl = this.gl;
        if (!gl || !this._shader) return;

        for (const vb of this._vertexBuffers) {
            if (!vb) continue;

            vb._bind();

            for (const element of vb.format.elements) {
                const location = this._shader.getAttributeLocation('a' + element.semantic);
                if (location < 0) continue;

                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(
                    location,
                    element.components,
                    this._vertexTypeToGL(element.type),
                    element.normalize ?? false,
                    vb.format.stride,
                    element.offset ?? 0
                );
            }
        }
    }

    private _initializeState(): void {
        const gl = this.gl;
        if (!gl) return;

        // Enable depth test by default
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Enable back-face culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Disable blending by default
        gl.disable(gl.BLEND);
    }

    private _queryCapabilities(): DeviceCapabilities {
        const gl = this.gl!;

        return {
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
            maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
            maxVertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
            maxTextureAnisotropy: this._getMaxAnisotropy(),
            maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
            maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
            supportsInstancing: true, // WebGL2 always supports this
            supportsFloatTextures: true, // WebGL2 always supports this
            supportsHalfFloatTextures: true,
            supportsDepthTextures: true,
            supportsStencilTextures: true,
            supportsAnisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic'),
            supportsMultisample: true,
            supportsCompressedTextures: true,
            webgl2: true,
            webgpu: false
        };
    }

    private _getMaxAnisotropy(): number {
        const gl = this.gl!;
        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        return ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
    }

    private _getEmptyCapabilities(): DeviceCapabilities {
        return {
            maxTextureSize: 0,
            maxCubeMapSize: 0,
            maxRenderBufferSize: 0,
            maxTextures: 0,
            maxVertexTextures: 0,
            maxTextureAnisotropy: 1,
            maxVertexAttributes: 0,
            maxVertexUniformVectors: 0,
            maxFragmentUniformVectors: 0,
            maxVaryingVectors: 0,
            maxColorAttachments: 0,
            maxDrawBuffers: 0,
            supportsInstancing: false,
            supportsFloatTextures: false,
            supportsHalfFloatTextures: false,
            supportsDepthTextures: false,
            supportsStencilTextures: false,
            supportsAnisotropicFiltering: false,
            supportsMultisample: false,
            supportsCompressedTextures: false,
            webgl2: false,
            webgpu: false
        };
    }

    private _getDefaultBlendState(): BlendState {
        return {
            enabled: false,
            srcRgb: BlendMode.ONE,
            dstRgb: BlendMode.ZERO,
            srcAlpha: BlendMode.ONE,
            dstAlpha: BlendMode.ZERO,
            equationRgb: BlendEquation.ADD,
            equationAlpha: BlendEquation.ADD
        };
    }

    private _getDefaultDepthState(): DepthState {
        return {
            write: true,
            test: true,
            func: CompareFunc.LESSEQUAL
        };
    }

    private _primitiveTypeToGL(type: PrimitiveType): number {
        const gl = this.gl!;
        switch (type) {
            case PrimitiveType.POINTS: return gl.POINTS;
            case PrimitiveType.LINES: return gl.LINES;
            case PrimitiveType.LINE_LOOP: return gl.LINE_LOOP;
            case PrimitiveType.LINE_STRIP: return gl.LINE_STRIP;
            case PrimitiveType.TRIANGLES: return gl.TRIANGLES;
            case PrimitiveType.TRIANGLE_STRIP: return gl.TRIANGLE_STRIP;
            case PrimitiveType.TRIANGLE_FAN: return gl.TRIANGLE_FAN;
            default: return gl.TRIANGLES;
        }
    }

    private _blendModeToGL(mode: BlendMode): number {
        const gl = this.gl!;
        switch (mode) {
            case BlendMode.ZERO: return gl.ZERO;
            case BlendMode.ONE: return gl.ONE;
            case BlendMode.SRC_COLOR: return gl.SRC_COLOR;
            case BlendMode.ONE_MINUS_SRC_COLOR: return gl.ONE_MINUS_SRC_COLOR;
            case BlendMode.DST_COLOR: return gl.DST_COLOR;
            case BlendMode.ONE_MINUS_DST_COLOR: return gl.ONE_MINUS_DST_COLOR;
            case BlendMode.SRC_ALPHA: return gl.SRC_ALPHA;
            case BlendMode.ONE_MINUS_SRC_ALPHA: return gl.ONE_MINUS_SRC_ALPHA;
            case BlendMode.DST_ALPHA: return gl.DST_ALPHA;
            case BlendMode.ONE_MINUS_DST_ALPHA: return gl.ONE_MINUS_DST_ALPHA;
            case BlendMode.SRC_ALPHA_SATURATE: return gl.SRC_ALPHA_SATURATE;
            case BlendMode.CONSTANT_COLOR: return gl.CONSTANT_COLOR;
            case BlendMode.ONE_MINUS_CONSTANT_COLOR: return gl.ONE_MINUS_CONSTANT_COLOR;
            case BlendMode.CONSTANT_ALPHA: return gl.CONSTANT_ALPHA;
            case BlendMode.ONE_MINUS_CONSTANT_ALPHA: return gl.ONE_MINUS_CONSTANT_ALPHA;
            default: return gl.ONE;
        }
    }

    private _blendEquationToGL(eq: BlendEquation): number {
        const gl = this.gl!;
        switch (eq) {
            case BlendEquation.ADD: return gl.FUNC_ADD;
            case BlendEquation.SUBTRACT: return gl.FUNC_SUBTRACT;
            case BlendEquation.REVERSE_SUBTRACT: return gl.FUNC_REVERSE_SUBTRACT;
            case BlendEquation.MIN: return gl.MIN;
            case BlendEquation.MAX: return gl.MAX;
            default: return gl.FUNC_ADD;
        }
    }

    private _compareFuncToGL(func: CompareFunc): number {
        const gl = this.gl!;
        switch (func) {
            case CompareFunc.NEVER: return gl.NEVER;
            case CompareFunc.LESS: return gl.LESS;
            case CompareFunc.EQUAL: return gl.EQUAL;
            case CompareFunc.LESSEQUAL: return gl.LEQUAL;
            case CompareFunc.GREATER: return gl.GREATER;
            case CompareFunc.NOTEQUAL: return gl.NOTEQUAL;
            case CompareFunc.GREATEREQUAL: return gl.GEQUAL;
            case CompareFunc.ALWAYS: return gl.ALWAYS;
            default: return gl.LEQUAL;
        }
    }

    private _vertexTypeToGL(type: VertexElementType): number {
        const gl = this.gl!;
        switch (type) {
            case VertexElementType.INT8: return gl.BYTE;
            case VertexElementType.UINT8: return gl.UNSIGNED_BYTE;
            case VertexElementType.INT16: return gl.SHORT;
            case VertexElementType.UINT16: return gl.UNSIGNED_SHORT;
            case VertexElementType.INT32: return gl.INT;
            case VertexElementType.UINT32: return gl.UNSIGNED_INT;
            case VertexElementType.FLOAT32: return gl.FLOAT;
            default: return gl.FLOAT;
        }
    }

    /**
     * Destroy the graphics device and release resources.
     */
    destroy(): void {
        // Clear all state
        this._shader = null;
        this._vertexBuffers = [];
        this._indexBuffer = null;
        this._renderTarget = null;

        // WebGL context is automatically released when canvas is garbage collected
        // We could explicitly lose context for immediate cleanup:
        const gl = this.gl;
        if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) {
                ext.loseContext();
            }
        }
    }
}
