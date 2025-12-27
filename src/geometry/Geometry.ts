/**
 * Base Geometry class for storing vertex data.
 * Holds positions, normals, UVs, and indices for mesh creation.
 */

import { calculateNormals, calculateTangents } from './geometry-utils';

/**
 * The Geometry class is a container for storing geometric vertex data.
 *
 * @example
 * const geometry = new Geometry();
 * geometry.positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
 * geometry.indices = [0, 1, 2];
 * geometry.calculateNormals();
 */
export class Geometry {
    /** Vertex positions (x, y, z per vertex) */
    positions?: number[];

    /** Vertex normals (x, y, z per vertex) */
    normals?: number[];

    /** Vertex colors (r, g, b, a per vertex) */
    colors?: number[];

    /** Texture coordinates (u, v per vertex) */
    uvs?: number[];

    /** Secondary texture coordinates */
    uvs1?: number[];

    /** Blend indices for skinning */
    blendIndices?: number[];

    /** Blend weights for skinning */
    blendWeights?: number[];

    /** Tangent vectors (x, y, z, w per vertex) */
    tangents?: number[];

    /** Triangle indices */
    indices?: number[];

    /**
     * Generate normals from positions and indices.
     * Requires positions and indices to be set.
     */
    calculateNormals(): void {
        if (!this.positions || !this.indices) {
            console.warn('Geometry must have positions and indices set to calculate normals');
            return;
        }
        this.normals = calculateNormals(this.positions, this.indices);
    }

    /**
     * Generate tangents from positions, normals, UVs and indices.
     * Requires positions, normals, uvs and indices to be set.
     */
    calculateTangents(): void {
        if (!this.positions || !this.normals || !this.uvs || !this.indices) {
            console.warn('Geometry must have positions, normals, uvs and indices set to calculate tangents');
            return;
        }
        this.tangents = calculateTangents(this.positions, this.normals, this.uvs, this.indices);
    }

    /**
     * Get the number of vertices.
     */
    get vertexCount(): number {
        return this.positions ? this.positions.length / 3 : 0;
    }

    /**
     * Get the number of triangles.
     */
    get triangleCount(): number {
        return this.indices ? this.indices.length / 3 : 0;
    }
}
