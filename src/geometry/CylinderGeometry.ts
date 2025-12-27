/**
 * Procedural cylinder geometry.
 */

import { Geometry } from './Geometry';
import { calculateTangents } from './geometry-utils';

export interface CylinderGeometryOptions {
    /** Radius of the cylinder. Defaults to 0.5 */
    radius?: number;
    /** Height of the cylinder. Defaults to 1 */
    height?: number;
    /** Divisions along height. Defaults to 5 */
    heightSegments?: number;
    /** Divisions around circumference. Defaults to 20 */
    capSegments?: number;
    /** Include top cap. Defaults to true */
    capTop?: boolean;
    /** Include bottom cap. Defaults to true */
    capBottom?: boolean;
    /** Calculate tangent vectors. Defaults to false */
    calculateTangents?: boolean;
}

/**
 * A procedural cylinder geometry standing along the Y axis.
 *
 * @example
 * const cylinder = new CylinderGeometry();
 *
 * @example
 * const cylinder = new CylinderGeometry({
 *     radius: 1,
 *     height: 3,
 *     heightSegments: 10,
 *     capSegments: 32
 * });
 */
export class CylinderGeometry extends Geometry {
    constructor(opts: CylinderGeometryOptions = {}) {
        super();

        const radius = opts.radius ?? 0.5;
        const height = opts.height ?? 1;
        const heightSegments = opts.heightSegments ?? 5;
        const capSegments = opts.capSegments ?? 20;
        const capTop = opts.capTop ?? true;
        const capBottom = opts.capBottom ?? true;

        const halfHeight = height / 2;

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // Generate cylinder body
        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const posY = -halfHeight + height * v;

            for (let x = 0; x <= capSegments; x++) {
                const u = x / capSegments;
                const theta = u * Math.PI * 2;

                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                positions.push(
                    radius * cosTheta,
                    posY,
                    radius * sinTheta
                );
                normals.push(cosTheta, 0, sinTheta);
                uvs.push(u, 1 - v);
            }
        }

        // Generate body indices
        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < capSegments; x++) {
                const row1 = y * (capSegments + 1);
                const row2 = (y + 1) * (capSegments + 1);

                indices.push(row1 + x, row2 + x, row2 + x + 1);
                indices.push(row1 + x, row2 + x + 1, row1 + x + 1);
            }
        }

        // Generate caps
        const generateCap = (top: boolean) => {
            const baseVertex = positions.length / 3;
            const y = top ? halfHeight : -halfHeight;
            const normalY = top ? 1 : -1;
            const uvY = top ? 0.5 : 0.5;

            // Center vertex
            positions.push(0, y, 0);
            normals.push(0, normalY, 0);
            uvs.push(0.5, uvY);

            // Edge vertices
            for (let x = 0; x <= capSegments; x++) {
                const u = x / capSegments;
                const theta = u * Math.PI * 2;

                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                positions.push(radius * cosTheta, y, radius * sinTheta);
                normals.push(0, normalY, 0);
                uvs.push(0.5 + 0.5 * cosTheta, 0.5 + 0.5 * sinTheta * (top ? -1 : 1));
            }

            // Cap indices
            for (let x = 0; x < capSegments; x++) {
                if (top) {
                    indices.push(baseVertex, baseVertex + x + 1, baseVertex + x + 2);
                } else {
                    indices.push(baseVertex, baseVertex + x + 2, baseVertex + x + 1);
                }
            }
        };

        if (capTop) generateCap(true);
        if (capBottom) generateCap(false);

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
