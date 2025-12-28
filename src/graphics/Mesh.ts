/**
 * Mesh class for storing renderable geometry data.
 */

import { Vector3 } from '../math/Vector3';
import { PrimitiveType, BufferUsage, VertexElementType, VertexSemantic } from './constants';
import { VertexFormat } from './VertexFormat';
import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';
import type { GraphicsDevice } from './GraphicsDevice';
import type { Geometry } from '../geometry/Geometry';

export interface SubMesh {
    /** Starting index in the index buffer */
    indexStart: number;
    /** Number of indices */
    indexCount: number;
    /** Primitive type */
    primitiveType: PrimitiveType;
    /** Material index */
    materialIndex: number;
}

export interface BoundingBox {
    min: Vector3;
    max: Vector3;
    center: Vector3;
    extents: Vector3;
}

export interface BoundingSphere {
    center: Vector3;
    radius: number;
}

/**
 * A Mesh stores geometry data for rendering.
 *
 * @example
 * // Create from geometry
 * const geometry = new BoxGeometry();
 * const mesh = Mesh.fromGeometry(device, geometry);
 *
 * @example
 * // Create manually
 * const mesh = new Mesh(device);
 * mesh.setVertices(positions);
 * mesh.setNormals(normals);
 * mesh.setUVs(uvs);
 * mesh.setIndices(indices);
 * mesh.uploadMeshData();
 */
export class Mesh {
    /** The graphics device */
    readonly device: GraphicsDevice;

    /** Mesh name */
    name: string = '';

    /** Vertex buffer */
    private _vertexBuffer: VertexBuffer | null = null;

    /** Index buffer */
    private _indexBuffer: IndexBuffer | null = null;

    /** Sub-meshes (sections with different materials) */
    private _subMeshes: SubMesh[] = [];

    /** Vertex format */
    private _vertexFormat: VertexFormat | null = null;

    /** Raw vertex data */
    private _positions: number[] = [];
    private _normals: number[] = [];
    private _tangents: number[] = [];
    private _colors: number[] = [];
    private _uvs: number[] = [];
    private _uvs2: number[] = [];
    private _indices: number[] = [];

    /** Bounds */
    private _bounds: BoundingBox | null = null;
    private _boundingSphere: BoundingSphere | null = null;

    /** Whether data has changed and needs upload */
    private _dirty: boolean = true;

    constructor(device: GraphicsDevice) {
        this.device = device;
    }

    // ==================== Data Setters ====================

    /**
     * Set vertex positions.
     * @param positions - Array of positions [x,y,z, x,y,z, ...]
     */
    setVertices(positions: number[] | Float32Array): void {
        this._positions = Array.from(positions);
        this._dirty = true;
        this._bounds = null;
        this._boundingSphere = null;
    }

    /**
     * Set vertex normals.
     */
    setNormals(normals: number[] | Float32Array): void {
        this._normals = Array.from(normals);
        this._dirty = true;
    }

    /**
     * Set vertex tangents.
     */
    setTangents(tangents: number[] | Float32Array): void {
        this._tangents = Array.from(tangents);
        this._dirty = true;
    }

    /**
     * Set vertex colors.
     */
    setColors(colors: number[] | Float32Array): void {
        this._colors = Array.from(colors);
        this._dirty = true;
    }

    /**
     * Set UV coordinates (channel 0).
     */
    setUVs(uvs: number[] | Float32Array): void {
        this._uvs = Array.from(uvs);
        this._dirty = true;
    }

    /**
     * Set UV coordinates (channel 1).
     */
    setUVs2(uvs: number[] | Float32Array): void {
        this._uvs2 = Array.from(uvs);
        this._dirty = true;
    }

    /**
     * Set triangle indices.
     */
    setIndices(indices: number[] | Uint16Array | Uint32Array): void {
        this._indices = Array.from(indices);
        this._dirty = true;
    }

    /**
     * Set sub-mesh information.
     */
    setSubMeshes(subMeshes: SubMesh[]): void {
        this._subMeshes = subMeshes;
    }

    // ==================== Data Getters ====================

    get vertexCount(): number {
        return this._positions.length / 3;
    }

    get triangleCount(): number {
        return this._indices.length / 3;
    }

    get subMeshCount(): number {
        return Math.max(1, this._subMeshes.length);
    }

    getSubMesh(index: number): SubMesh {
        if (index < this._subMeshes.length) {
            return this._subMeshes[index];
        }
        // Default sub-mesh covers all indices
        return {
            indexStart: 0,
            indexCount: this._indices.length,
            primitiveType: PrimitiveType.TRIANGLES,
            materialIndex: 0
        };
    }

    // ==================== Bounds ====================

    /**
     * Get the axis-aligned bounding box.
     */
    get bounds(): BoundingBox {
        if (!this._bounds) {
            this._calculateBounds();
        }
        return this._bounds!;
    }

    /**
     * Get the bounding sphere.
     */
    get boundingSphere(): BoundingSphere {
        if (!this._boundingSphere) {
            this._calculateBounds();
        }
        return this._boundingSphere!;
    }

    /**
     * Recalculate mesh bounds.
     */
    recalculateBounds(): void {
        this._bounds = null;
        this._boundingSphere = null;
        this._calculateBounds();
    }

    private _calculateBounds(): void {
        if (this._positions.length === 0) {
            this._bounds = {
                min: Vector3.zero,
                max: Vector3.zero,
                center: Vector3.zero,
                extents: Vector3.zero
            };
            this._boundingSphere = { center: Vector3.zero, radius: 0 };
            return;
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < this._positions.length; i += 3) {
            const x = this._positions[i];
            const y = this._positions[i + 1];
            const z = this._positions[i + 2];

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        const min = new Vector3(minX, minY, minZ);
        const max = new Vector3(maxX, maxY, maxZ);
        const center = new Vector3(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5,
            (minZ + maxZ) * 0.5
        );
        const extents = new Vector3(
            (maxX - minX) * 0.5,
            (maxY - minY) * 0.5,
            (maxZ - minZ) * 0.5
        );

        this._bounds = { min, max, center, extents };

        // Calculate bounding sphere radius
        let maxRadiusSq = 0;
        for (let i = 0; i < this._positions.length; i += 3) {
            const dx = this._positions[i] - center.x;
            const dy = this._positions[i + 1] - center.y;
            const dz = this._positions[i + 2] - center.z;
            maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
        }

        this._boundingSphere = {
            center,
            radius: Math.sqrt(maxRadiusSq)
        };
    }

    // ==================== GPU Upload ====================

    /**
     * Upload mesh data to GPU buffers.
     */
    uploadMeshData(): void {
        if (!this._dirty) return;

        // Build vertex format based on available data
        const elements = [];
        let stride = 0;

        if (this._positions.length > 0) {
            elements.push({ semantic: VertexSemantic.POSITION, components: 3, type: VertexElementType.FLOAT32, offset: stride });
            stride += 12;
        }
        if (this._normals.length > 0) {
            elements.push({ semantic: VertexSemantic.NORMAL, components: 3, type: VertexElementType.FLOAT32, offset: stride });
            stride += 12;
        }
        if (this._uvs.length > 0) {
            elements.push({ semantic: VertexSemantic.TEXCOORD0, components: 2, type: VertexElementType.FLOAT32, offset: stride });
            stride += 8;
        }
        if (this._tangents.length > 0) {
            elements.push({ semantic: VertexSemantic.TANGENT, components: 4, type: VertexElementType.FLOAT32, offset: stride });
            stride += 16;
        }
        if (this._colors.length > 0) {
            elements.push({ semantic: VertexSemantic.COLOR, components: 4, type: VertexElementType.FLOAT32, offset: stride });
            stride += 16;
        }
        if (this._uvs2.length > 0) {
            elements.push({ semantic: VertexSemantic.TEXCOORD1, components: 2, type: VertexElementType.FLOAT32, offset: stride });
            stride += 8;
        }

        this._vertexFormat = new VertexFormat(elements);

        // Interleave vertex data
        const vertexCount = this._positions.length / 3;
        const vertexData = new Float32Array(vertexCount * (stride / 4));

        for (let i = 0; i < vertexCount; i++) {
            let offset = i * (stride / 4);

            if (this._positions.length > 0) {
                vertexData[offset++] = this._positions[i * 3];
                vertexData[offset++] = this._positions[i * 3 + 1];
                vertexData[offset++] = this._positions[i * 3 + 2];
            }
            if (this._normals.length > 0) {
                vertexData[offset++] = this._normals[i * 3];
                vertexData[offset++] = this._normals[i * 3 + 1];
                vertexData[offset++] = this._normals[i * 3 + 2];
            }
            if (this._uvs.length > 0) {
                vertexData[offset++] = this._uvs[i * 2];
                vertexData[offset++] = this._uvs[i * 2 + 1];
            }
            if (this._tangents.length > 0) {
                vertexData[offset++] = this._tangents[i * 4];
                vertexData[offset++] = this._tangents[i * 4 + 1];
                vertexData[offset++] = this._tangents[i * 4 + 2];
                vertexData[offset++] = this._tangents[i * 4 + 3];
            }
            if (this._colors.length > 0) {
                vertexData[offset++] = this._colors[i * 4];
                vertexData[offset++] = this._colors[i * 4 + 1];
                vertexData[offset++] = this._colors[i * 4 + 2];
                vertexData[offset++] = this._colors[i * 4 + 3];
            }
            if (this._uvs2.length > 0) {
                vertexData[offset++] = this._uvs2[i * 2];
                vertexData[offset++] = this._uvs2[i * 2 + 1];
            }
        }

        // Destroy existing buffers
        this._vertexBuffer?.destroy();
        this._indexBuffer?.destroy();

        // Create vertex buffer
        this._vertexBuffer = new VertexBuffer(this.device, {
            format: this._vertexFormat,
            numVertices: vertexCount,
            usage: BufferUsage.STATIC,
            data: vertexData
        });

        // Create index buffer
        const use32bit = vertexCount > 65535;
        const indexData = use32bit
            ? new Uint32Array(this._indices)
            : new Uint16Array(this._indices);

        this._indexBuffer = new IndexBuffer(this.device, {
            numIndices: this._indices.length,
            usage: BufferUsage.STATIC,
            data: indexData,
            format32: use32bit
        });

        this._dirty = false;
    }

    /**
     * Bind mesh buffers for rendering.
     * @internal
     */
    _bind(): void {
        if (this._dirty) {
            this.uploadMeshData();
        }

        if (this._vertexBuffer) {
            this.device.setVertexBuffer(this._vertexBuffer);
        }
        if (this._indexBuffer) {
            this.device.setIndexBuffer(this._indexBuffer);
        }
    }

    /**
     * Draw the mesh.
     * @internal
     */
    _draw(subMeshIndex: number = 0): void {
        const subMesh = this.getSubMesh(subMeshIndex);
        this.device.drawIndexed(
            subMesh.primitiveType,
            subMesh.indexCount,
            subMesh.indexStart
        );
    }

    /**
     * Destroy the mesh and release GPU resources.
     */
    destroy(): void {
        this._vertexBuffer?.destroy();
        this._indexBuffer?.destroy();
        this._vertexBuffer = null;
        this._indexBuffer = null;
    }

    // ==================== Factory Methods ====================

    /**
     * Create a Mesh from a Geometry object.
     */
    static fromGeometry(device: GraphicsDevice, geometry: Geometry): Mesh {
        const mesh = new Mesh(device);

        if (geometry.positions) {
            mesh.setVertices(geometry.positions);
        }
        if (geometry.normals) {
            mesh.setNormals(geometry.normals);
        }
        if (geometry.uvs) {
            mesh.setUVs(geometry.uvs);
        }
        if (geometry.tangents) {
            mesh.setTangents(geometry.tangents);
        }
        if (geometry.colors) {
            mesh.setColors(geometry.colors);
        }
        if (geometry.indices) {
            mesh.setIndices(geometry.indices);
        }

        mesh.uploadMeshData();
        return mesh;
    }
}
