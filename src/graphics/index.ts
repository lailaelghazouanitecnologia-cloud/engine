/**
 * Graphics module exports
 * WebGL2 rendering abstraction
 */

// Constants and enums
export {
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
