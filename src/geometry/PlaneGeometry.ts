/**
 * Procedural plane geometry.
 */

import { Geometry } from './Geometry';
import { calculateTangents } from './geometry-utils';

export interface PlaneGeometryOptions {
    /** Half dimensions of the plane (X, Z). Defaults to (0.5, 0.5) */
    halfExtents?: { x: number; y: number };
    /** Divisions along X axis. Defaults to 5 */
    widthSegments?: number;
    /** Divisions along Z axis. Defaults to 5 */
    lengthSegments?: number;
    /** Calculate tangent vectors. Defaults to false */
    calculateTangents?: boolean;
}

/**
 * A procedural plane geometry lying on the XZ plane with normal pointing up (+Y).
 *
 * @example
 * const plane = new PlaneGeometry();
 *
 * @example
 * const plane = new PlaneGeometry({
 *     halfExtents: { x: 2, y: 2 },
 *     widthSegments: 10,
 *     lengthSegments: 10
 * });
 */
export class PlaneGeometry extends Geometry {
    constructor(opts: PlaneGeometryOptions = {}) {
        super();

        const he = opts.halfExtents ?? { x: 0.5, y: 0.5 };
        const ws = opts.widthSegments ?? 5;
        const ls = opts.lengthSegments ?? 5;

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexCounter = 0;

        for (let i = 0; i <= ws; i++) {
            for (let j = 0; j <= ls; j++) {
                const x = -he.x + (2 * he.x * i) / ws;
                const y = 0;
                const z = -(-he.y + (2 * he.y * j) / ls);

                const u = i / ws;
                const v = j / ls;

                positions.push(x, y, z);
                normals.push(0, 1, 0);
                uvs.push(u, 1 - v);

                if (i < ws && j < ls) {
                    indices.push(
                        vertexCounter + ls + 1,
                        vertexCounter + 1,
                        vertexCounter
                    );
                    indices.push(
                        vertexCounter + ls + 1,
                        vertexCounter + ls + 2,
                        vertexCounter + 1
                    );
                }

                vertexCounter++;
            }
        }

        this.positions = positions;
        this.normals = normals;
        this.uvs = uvs;
        this.uvs1 = uvs;
        this.indices = indices;

        if (opts.calculateTangents) {
            this.tangents = calculateTangents(positions, normals, uvs, indices);
        }
    }
}
