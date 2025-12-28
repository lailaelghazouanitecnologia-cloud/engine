/**
 * Vertex format definition.
 * Describes the layout of vertex data in a vertex buffer.
 */

import { VertexElementType, VertexSemantic } from './constants';

/**
 * Describes a single vertex attribute element.
 */
export interface VertexElement {
    /** Semantic name of the element */
    semantic: VertexSemantic | string;
    /** Number of components (1-4) */
    components: number;
    /** Data type of each component */
    type: VertexElementType;
    /** Whether integer values should be normalized to [0,1] or [-1,1] */
    normalize?: boolean;
    /** Byte offset within the vertex (computed if not provided) */
    offset?: number;
}

/**
 * Get the byte size of a vertex element type.
 */
function getTypeSize(type: VertexElementType): number {
    switch (type) {
        case VertexElementType.INT8:
        case VertexElementType.UINT8:
            return 1;
        case VertexElementType.INT16:
        case VertexElementType.UINT16:
            return 2;
        case VertexElementType.INT32:
        case VertexElementType.UINT32:
        case VertexElementType.FLOAT32:
            return 4;
        default:
            return 4;
    }
}

/**
 * Describes the format/layout of vertices in a vertex buffer.
 *
 * @example
 * const format = new VertexFormat([
 *     { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 },
 *     { semantic: VertexSemantic.NORMAL, components: 3, type: VertexElementType.FLOAT32 },
 *     { semantic: VertexSemantic.TEXCOORD0, components: 2, type: VertexElementType.FLOAT32 }
 * ]);
 */
export class VertexFormat {
    /** Array of vertex elements */
    readonly elements: ReadonlyArray<VertexElement>;

    /** Total byte stride of a single vertex */
    readonly stride: number;

    /** Whether this format has positions */
    readonly hasPosition: boolean;

    /** Whether this format has normals */
    readonly hasNormal: boolean;

    /** Whether this format has tangents */
    readonly hasTangent: boolean;

    /** Whether this format has colors */
    readonly hasColor: boolean;

    /** Whether this format has UV coordinates */
    readonly hasUv: boolean;

    /** Cached element lookup by semantic */
    private _elementMap: Map<string, VertexElement>;

    constructor(elements: VertexElement[]) {
        // Calculate offsets and stride
        let offset = 0;
        const processedElements: VertexElement[] = [];

        for (const element of elements) {
            const size = element.components * getTypeSize(element.type);
            processedElements.push({
                ...element,
                offset: element.offset ?? offset,
                normalize: element.normalize ?? false
            });
            offset = (element.offset ?? offset) + size;
        }

        this.elements = Object.freeze(processedElements);
        this.stride = offset;

        // Build element map and check for common semantics
        this._elementMap = new Map();
        for (const element of this.elements) {
            this._elementMap.set(element.semantic, element);
        }

        this.hasPosition = this._elementMap.has(VertexSemantic.POSITION);
        this.hasNormal = this._elementMap.has(VertexSemantic.NORMAL);
        this.hasTangent = this._elementMap.has(VertexSemantic.TANGENT);
        this.hasColor = this._elementMap.has(VertexSemantic.COLOR);
        this.hasUv = this._elementMap.has(VertexSemantic.TEXCOORD0);
    }

    /**
     * Get an element by semantic.
     */
    getElement(semantic: string): VertexElement | undefined {
        return this._elementMap.get(semantic);
    }

    /**
     * Check if the format contains an element with the given semantic.
     */
    hasElement(semantic: string): boolean {
        return this._elementMap.has(semantic);
    }

    // ==================== Common Preset Formats ====================

    /** Position only (3 floats) */
    static readonly POSITION = new VertexFormat([
        { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 }
    ]);

    /** Position + Normal (6 floats) */
    static readonly POSITION_NORMAL = new VertexFormat([
        { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.NORMAL, components: 3, type: VertexElementType.FLOAT32 }
    ]);

    /** Position + UV (5 floats) */
    static readonly POSITION_UV = new VertexFormat([
        { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.TEXCOORD0, components: 2, type: VertexElementType.FLOAT32 }
    ]);

    /** Position + Normal + UV (8 floats) */
    static readonly POSITION_NORMAL_UV = new VertexFormat([
        { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.NORMAL, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.TEXCOORD0, components: 2, type: VertexElementType.FLOAT32 }
    ]);

    /** Position + Normal + UV + Tangent (12 floats) */
    static readonly POSITION_NORMAL_UV_TANGENT = new VertexFormat([
        { semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.NORMAL, components: 3, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.TEXCOORD0, components: 2, type: VertexElementType.FLOAT32 },
        { semantic: VertexSemantic.TANGENT, components: 4, type: VertexElementType.FLOAT32 }
    ]);
}
