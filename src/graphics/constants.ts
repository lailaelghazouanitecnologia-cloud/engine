/**
 * Graphics constants and enumerations.
 */

// ==================== Primitive Types ====================

export enum PrimitiveType {
    POINTS = 0,
    LINES = 1,
    LINE_LOOP = 2,
    LINE_STRIP = 3,
    TRIANGLES = 4,
    TRIANGLE_STRIP = 5,
    TRIANGLE_FAN = 6
}

// ==================== Blend Modes ====================

export enum BlendMode {
    ZERO = 0,
    ONE = 1,
    SRC_COLOR = 2,
    ONE_MINUS_SRC_COLOR = 3,
    DST_COLOR = 4,
    ONE_MINUS_DST_COLOR = 5,
    SRC_ALPHA = 6,
    ONE_MINUS_SRC_ALPHA = 7,
    DST_ALPHA = 8,
    ONE_MINUS_DST_ALPHA = 9,
    SRC_ALPHA_SATURATE = 10,
    CONSTANT_COLOR = 11,
    ONE_MINUS_CONSTANT_COLOR = 12,
    CONSTANT_ALPHA = 13,
    ONE_MINUS_CONSTANT_ALPHA = 14
}

export enum BlendEquation {
    ADD = 0,
    SUBTRACT = 1,
    REVERSE_SUBTRACT = 2,
    MIN = 3,
    MAX = 4
}

// ==================== Comparison Functions ====================

export enum CompareFunc {
    NEVER = 0,
    LESS = 1,
    EQUAL = 2,
    LESSEQUAL = 3,
    GREATER = 4,
    NOTEQUAL = 5,
    GREATEREQUAL = 6,
    ALWAYS = 7
}

// ==================== Cull Modes ====================

export enum CullFace {
    NONE = 0,
    BACK = 1,
    FRONT = 2,
    FRONT_AND_BACK = 3
}

// ==================== Texture Formats ====================

export enum PixelFormat {
    // 8-bit formats
    A8 = 0,
    L8 = 1,
    LA8 = 2,
    RGB8 = 3,
    RGBA8 = 4,

    // 16-bit formats
    RGB565 = 5,
    RGBA5551 = 6,
    RGBA4 = 7,

    // 32-bit float formats
    R32F = 8,
    RG32F = 9,
    RGB32F = 10,
    RGBA32F = 11,

    // 16-bit float formats
    R16F = 12,
    RG16F = 13,
    RGB16F = 14,
    RGBA16F = 15,

    // Depth formats
    DEPTH = 16,
    DEPTH_STENCIL = 17,
    DEPTH16 = 18,
    DEPTH24 = 19,
    DEPTH32F = 20,

    // Compressed formats
    DXT1 = 21,
    DXT3 = 22,
    DXT5 = 23,
    ETC1 = 24,
    ETC2_RGB = 25,
    ETC2_RGBA = 26,
    PVRTC_2BPP_RGB = 27,
    PVRTC_2BPP_RGBA = 28,
    PVRTC_4BPP_RGB = 29,
    PVRTC_4BPP_RGBA = 30,
    ASTC_4x4 = 31,
    ASTC_6x6 = 32,
    ASTC_8x8 = 33
}

// ==================== Texture Address Modes ====================

export enum AddressMode {
    REPEAT = 0,
    CLAMP_TO_EDGE = 1,
    MIRRORED_REPEAT = 2
}

// ==================== Texture Filter Modes ====================

export enum FilterMode {
    NEAREST = 0,
    LINEAR = 1,
    NEAREST_MIPMAP_NEAREST = 2,
    NEAREST_MIPMAP_LINEAR = 3,
    LINEAR_MIPMAP_NEAREST = 4,
    LINEAR_MIPMAP_LINEAR = 5
}

// ==================== Buffer Usage ====================

export enum BufferUsage {
    STATIC = 0,
    DYNAMIC = 1,
    STREAM = 2
}

// ==================== Vertex Element Types ====================

export enum VertexElementType {
    INT8 = 0,
    UINT8 = 1,
    INT16 = 2,
    UINT16 = 3,
    INT32 = 4,
    UINT32 = 5,
    FLOAT32 = 6
}

// ==================== Vertex Element Semantics ====================

export enum VertexSemantic {
    POSITION = 'POSITION',
    NORMAL = 'NORMAL',
    TANGENT = 'TANGENT',
    BINORMAL = 'BINORMAL',
    COLOR = 'COLOR',
    TEXCOORD0 = 'TEXCOORD0',
    TEXCOORD1 = 'TEXCOORD1',
    TEXCOORD2 = 'TEXCOORD2',
    TEXCOORD3 = 'TEXCOORD3',
    BLENDINDICES = 'BLENDINDICES',
    BLENDWEIGHT = 'BLENDWEIGHT'
}

// ==================== Shader Types ====================

export enum ShaderType {
    VERTEX = 0,
    FRAGMENT = 1
}

// ==================== Uniform Types ====================

export enum UniformType {
    BOOL = 0,
    INT = 1,
    FLOAT = 2,
    VEC2 = 3,
    VEC3 = 4,
    VEC4 = 5,
    IVEC2 = 6,
    IVEC3 = 7,
    IVEC4 = 8,
    BVEC2 = 9,
    BVEC3 = 10,
    BVEC4 = 11,
    MAT2 = 12,
    MAT3 = 13,
    MAT4 = 14,
    TEXTURE2D = 15,
    TEXTURECUBE = 16,
    TEXTURE3D = 17,
    TEXTURE2D_ARRAY = 18
}

// ==================== Clear Flags ====================

export enum ClearFlag {
    COLOR = 1,
    DEPTH = 2,
    STENCIL = 4,
    ALL = 7
}

// ==================== Stencil Operations ====================

export enum StencilOp {
    KEEP = 0,
    ZERO = 1,
    REPLACE = 2,
    INCREMENT = 3,
    INCREMENT_WRAP = 4,
    DECREMENT = 5,
    DECREMENT_WRAP = 6,
    INVERT = 7
}

// ==================== Device Capabilities ====================

export interface DeviceCapabilities {
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxRenderBufferSize: number;
    maxTextures: number;
    maxVertexTextures: number;
    maxTextureAnisotropy: number;
    maxVertexAttributes: number;
    maxVertexUniformVectors: number;
    maxFragmentUniformVectors: number;
    maxVaryingVectors: number;
    maxColorAttachments: number;
    maxDrawBuffers: number;
    supportsInstancing: boolean;
    supportsFloatTextures: boolean;
    supportsHalfFloatTextures: boolean;
    supportsDepthTextures: boolean;
    supportsStencilTextures: boolean;
    supportsAnisotropicFiltering: boolean;
    supportsMultisample: boolean;
    supportsCompressedTextures: boolean;
    webgl2: boolean;
    webgpu: boolean;
}
