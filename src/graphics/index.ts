/**
 * Graphics module exports
 * Unified WebGL2/WebGPU rendering abstraction
 */

// Constants and enums
export {
    DeviceType,
    PrimitiveType,
    BlendMode,
    BlendEquation,
    CompareFunc,
    CullFace,
    PixelFormat,
    AddressMode,
    FilterMode,
    BufferUsage,
    VertexElementType,
    VertexSemantic,
    ShaderType,
    UniformType,
    ClearFlag,
    StencilOp
} from './constants';

export type { DeviceCapabilities } from './constants';

// Device factory
export {
    createGraphicsDevice,
    isWebGPUSupported,
    isWebGL2Supported,
    getBestDeviceType,
    getSupportedDeviceTypes,
} from './createDevice';
export type { CreateDeviceOptions } from './createDevice';

// Core classes
export { GraphicsDevice, GraphicsDeviceOptions, BlendState, DepthState, StencilState } from './GraphicsDevice';
export { VertexFormat, VertexElement } from './VertexFormat';
export { VertexBuffer, VertexBufferOptions } from './VertexBuffer';
export { IndexBuffer, IndexBufferOptions } from './IndexBuffer';
export { Texture, TextureOptions } from './Texture';
export { Shader, ShaderDefinition, UniformInfo } from './Shader';
export { RenderTarget, RenderTargetOptions } from './RenderTarget';
export { Material } from './Material';
export { StandardMaterial } from './Material';
export { UnlitMaterial } from './Material';
export type { MaterialPropertyValue } from './Material';
export { Mesh } from './Mesh';
export type { BoundingBox, BoundingSphere } from './Mesh';
