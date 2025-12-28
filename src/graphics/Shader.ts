/**
 * Shader program class.
 */

import { UniformType } from './constants';
import type { GraphicsDevice } from './GraphicsDevice';

export interface ShaderDefinition {
    /** Vertex shader source (GLSL) */
    vertexCode: string;
    /** Fragment shader source (GLSL) */
    fragmentCode: string;
    /** Shader name for debugging */
    name?: string;
    /** Attribute locations to bind */
    attributes?: Record<string, number>;
}

export interface UniformInfo {
    name: string;
    type: UniformType;
    location: WebGLUniformLocation;
    size: number;
    textureUnit?: number;
}

/**
 * A shader program consisting of vertex and fragment shaders.
 *
 * @example
 * const shader = new Shader(device, {
 *     name: 'BasicShader',
 *     vertexCode: `
 *         attribute vec3 aPosition;
 *         uniform mat4 uModelViewProjection;
 *         void main() {
 *             gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
 *         }
 *     `,
 *     fragmentCode: `
 *         precision mediump float;
 *         uniform vec4 uColor;
 *         void main() {
 *             gl_FragColor = uColor;
 *         }
 *     `
 * });
 */
export class Shader {
    /** The graphics device */
    readonly device: GraphicsDevice;

    /** Shader name */
    readonly name: string;

    /** WebGL program handle */
    private _glProgram: WebGLProgram | null = null;

    /** Uniform information cache */
    private _uniforms: Map<string, UniformInfo> = new Map();

    /** Attribute locations */
    private _attributes: Map<string, number> = new Map();

    /** Next texture unit to assign */
    private _nextTextureUnit: number = 0;

    /** Whether shader compiled successfully */
    private _ready: boolean = false;

    constructor(device: GraphicsDevice, definition: ShaderDefinition) {
        this.device = device;
        this.name = definition.name ?? 'Unnamed';

        const gl = device.gl;
        if (!gl) return;

        // Compile vertex shader
        const vertexShader = this._compileShader(gl, gl.VERTEX_SHADER, definition.vertexCode);
        if (!vertexShader) return;

        // Compile fragment shader
        const fragmentShader = this._compileShader(gl, gl.FRAGMENT_SHADER, definition.fragmentCode);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            return;
        }

        // Link program
        const program = gl.createProgram();
        if (!program) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        // Bind attribute locations if specified
        if (definition.attributes) {
            for (const [name, location] of Object.entries(definition.attributes)) {
                gl.bindAttribLocation(program, location, name);
            }
        }

        gl.linkProgram(program);

        // Check link status
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Shader link error (${this.name}):`, gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return;
        }

        // Clean up individual shaders (they're now part of the program)
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        this._glProgram = program;
        this._ready = true;

        // Cache uniform and attribute info
        this._cacheUniforms(gl);
        this._cacheAttributes(gl);
    }

    /** Whether the shader is ready to use */
    get ready(): boolean {
        return this._ready;
    }

    /**
     * Use this shader for rendering.
     */
    bind(): void {
        const gl = this.device.gl;
        if (gl && this._glProgram) {
            gl.useProgram(this._glProgram);
        }
    }

    /**
     * Get a uniform location.
     */
    getUniform(name: string): UniformInfo | undefined {
        return this._uniforms.get(name);
    }

    /**
     * Get an attribute location.
     */
    getAttributeLocation(name: string): number {
        return this._attributes.get(name) ?? -1;
    }

    /**
     * Set a uniform value.
     */
    setUniform(name: string, value: unknown): void {
        const gl = this.device.gl;
        if (!gl || !this._glProgram) return;

        const uniform = this._uniforms.get(name);
        if (!uniform) return;

        switch (uniform.type) {
            case UniformType.FLOAT:
                gl.uniform1f(uniform.location, value as number);
                break;
            case UniformType.VEC2:
                gl.uniform2fv(uniform.location, value as Float32List);
                break;
            case UniformType.VEC3:
                gl.uniform3fv(uniform.location, value as Float32List);
                break;
            case UniformType.VEC4:
                gl.uniform4fv(uniform.location, value as Float32List);
                break;
            case UniformType.INT:
            case UniformType.BOOL:
                gl.uniform1i(uniform.location, value as number);
                break;
            case UniformType.IVEC2:
            case UniformType.BVEC2:
                gl.uniform2iv(uniform.location, value as Int32List);
                break;
            case UniformType.IVEC3:
            case UniformType.BVEC3:
                gl.uniform3iv(uniform.location, value as Int32List);
                break;
            case UniformType.IVEC4:
            case UniformType.BVEC4:
                gl.uniform4iv(uniform.location, value as Int32List);
                break;
            case UniformType.MAT2:
                gl.uniformMatrix2fv(uniform.location, false, value as Float32List);
                break;
            case UniformType.MAT3:
                gl.uniformMatrix3fv(uniform.location, false, value as Float32List);
                break;
            case UniformType.MAT4:
                gl.uniformMatrix4fv(uniform.location, false, value as Float32List);
                break;
            case UniformType.TEXTURE2D:
            case UniformType.TEXTURECUBE:
            case UniformType.TEXTURE3D:
            case UniformType.TEXTURE2D_ARRAY:
                gl.uniform1i(uniform.location, uniform.textureUnit ?? 0);
                break;
        }
    }

    /**
     * Set a matrix uniform.
     */
    setMatrix4(name: string, matrix: Float32Array): void {
        const gl = this.device.gl;
        const uniform = this._uniforms.get(name);
        if (gl && uniform) {
            gl.uniformMatrix4fv(uniform.location, false, matrix);
        }
    }

    /**
     * Destroy the shader and release GPU resources.
     */
    destroy(): void {
        const gl = this.device.gl;
        if (gl && this._glProgram) {
            gl.deleteProgram(this._glProgram);
            this._glProgram = null;
        }
        this._uniforms.clear();
        this._attributes.clear();
        this._ready = false;
    }

    private _compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const typeStr = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            console.error(`Shader compile error (${this.name} ${typeStr}):`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    private _cacheUniforms(gl: WebGL2RenderingContext): void {
        if (!this._glProgram) return;

        const numUniforms = gl.getProgramParameter(this._glProgram, gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(this._glProgram, i);
            if (!info) continue;

            // Remove array suffix if present
            const name = info.name.replace(/\[0\]$/, '');
            const location = gl.getUniformLocation(this._glProgram, info.name);
            if (!location) continue;

            const type = this._glTypeToUniformType(info.type);
            const isTexture = type >= UniformType.TEXTURE2D;

            this._uniforms.set(name, {
                name,
                type,
                location,
                size: info.size,
                textureUnit: isTexture ? this._nextTextureUnit++ : undefined
            });
        }
    }

    private _cacheAttributes(gl: WebGL2RenderingContext): void {
        if (!this._glProgram) return;

        const numAttributes = gl.getProgramParameter(this._glProgram, gl.ACTIVE_ATTRIBUTES);

        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(this._glProgram, i);
            if (!info) continue;

            const location = gl.getAttribLocation(this._glProgram, info.name);
            if (location >= 0) {
                this._attributes.set(info.name, location);
            }
        }
    }

    private _glTypeToUniformType(glType: number): UniformType {
        const gl = this.device.gl!;
        switch (glType) {
            case gl.FLOAT: return UniformType.FLOAT;
            case gl.FLOAT_VEC2: return UniformType.VEC2;
            case gl.FLOAT_VEC3: return UniformType.VEC3;
            case gl.FLOAT_VEC4: return UniformType.VEC4;
            case gl.INT: return UniformType.INT;
            case gl.INT_VEC2: return UniformType.IVEC2;
            case gl.INT_VEC3: return UniformType.IVEC3;
            case gl.INT_VEC4: return UniformType.IVEC4;
            case gl.BOOL: return UniformType.BOOL;
            case gl.BOOL_VEC2: return UniformType.BVEC2;
            case gl.BOOL_VEC3: return UniformType.BVEC3;
            case gl.BOOL_VEC4: return UniformType.BVEC4;
            case gl.FLOAT_MAT2: return UniformType.MAT2;
            case gl.FLOAT_MAT3: return UniformType.MAT3;
            case gl.FLOAT_MAT4: return UniformType.MAT4;
            case gl.SAMPLER_2D: return UniformType.TEXTURE2D;
            case gl.SAMPLER_CUBE: return UniformType.TEXTURECUBE;
            case gl.SAMPLER_3D: return UniformType.TEXTURE3D;
            case gl.SAMPLER_2D_ARRAY: return UniformType.TEXTURE2D_ARRAY;
            default: return UniformType.FLOAT;
        }
    }
}
