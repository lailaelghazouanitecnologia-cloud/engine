/**
 * Simple quad geometry (2 triangles).
 */

import { Geometry } from './Geometry';
import { calculateTangents } from './geometry-utils';

export interface QuadGeometryOptions {
    /** Width of the quad. Defaults to 1 */
    width?: number;
    /** Height of the quad. Defaults to 1 */
    height?: number;
    /** Calculate tangent vectors. Defaults to false */
    calculateTangents?: boolean;
}

/**
 * A simple quad geometry consisting of 2 triangles.
 * Faces along the +Z axis by default.
 *
 * @example
 * const quad = new QuadGeometry();
 *
 * @example
 * const quad = new QuadGeometry({ width: 2, height: 2 });
 */
export class QuadGeometry extends Geometry {
    constructor(opts: QuadGeometryOptions = {}) {
        super();

        const w = (opts.width ?? 1) / 2;
        const h = (opts.height ?? 1) / 2;

        // 4 vertices: TL, TR, BR, BL (facing +Z)
        this.positions = [
            -w, h, 0,   // 0: top-left
            w, h, 0,    // 1: top-right
            w, -h, 0,   // 2: bottom-right
            -w, -h, 0   // 3: bottom-left
        ];

        this.normals = [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ];

        this.uvs = [
            0, 0,  // TL
            1, 0,  // TR
            1, 1,  // BR
            0, 1   // BL
        ];

        this.uvs1 = this.uvs;

        // Two triangles: TL-TR-BR, TL-BR-BL
        this.indices = [
            0, 1, 2,
            0, 2, 3
        ];

        if (opts.calculateTangents) {
            this.tangents = calculateTangents(
                this.positions,
                this.normals,
                this.uvs,
                this.indices
            );
        }
    }
}
