/**
 * Procedural box geometry.
 */

import { Vector3 } from '../math/Vector3';
import { Geometry } from './Geometry';
import { calculateTangents } from './geometry-utils';

export interface BoxGeometryOptions {
    /** Half dimensions of the box. Defaults to (0.5, 0.5, 0.5) */
    halfExtents?: Vector3;
    /** Divisions along X axis. Defaults to 1 */
    widthSegments?: number;
    /** Divisions along Z axis. Defaults to 1 */
    lengthSegments?: number;
    /** Divisions along Y axis. Defaults to 1 */
    heightSegments?: number;
    /** Calculate tangent vectors. Defaults to false */
    calculateTangents?: boolean;
    /** Vertical offset in local space. Defaults to 0 */
    yOffset?: number;
}

/**
 * A procedural box geometry.
 *
 * @example
 * const box = new BoxGeometry();
 * // box.positions, box.normals, box.uvs, box.indices are ready
 *
 * @example
 * const box = new BoxGeometry({
 *     halfExtents: new Vector3(1, 0.5, 2),
 *     widthSegments: 2,
 *     heightSegments: 2,
 *     lengthSegments: 2
 * });
 */
export class BoxGeometry extends Geometry {
    constructor(opts: BoxGeometryOptions = {}) {
        super();

        const he = opts.halfExtents ?? new Vector3(0.5, 0.5, 0.5);
        const ws = opts.widthSegments ?? 1;
        const ls = opts.lengthSegments ?? 1;
        const hs = opts.heightSegments ?? 1;
        const yOffset = opts.yOffset ?? 0;

        const minY = -he.y + yOffset;
        const maxY = he.y + yOffset;

        // 8 corners of the box
        const corners = [
            new Vector3(-he.x, minY, he.z),
            new Vector3(he.x, minY, he.z),
            new Vector3(he.x, maxY, he.z),
            new Vector3(-he.x, maxY, he.z),
            new Vector3(he.x, minY, -he.z),
            new Vector3(-he.x, minY, -he.z),
            new Vector3(-he.x, maxY, -he.z),
            new Vector3(he.x, maxY, -he.z)
        ];

        // Face corner indices: [origin, uAxis, vAxis]
        const faceAxes = [
            [0, 1, 3], // FRONT (+Z)
            [4, 5, 7], // BACK (-Z)
            [3, 2, 6], // TOP (+Y)
            [1, 0, 4], // BOTTOM (-Y)
            [1, 4, 2], // RIGHT (+X)
            [5, 0, 6]  // LEFT (-X)
        ];

        const faceNormals = [
            [0, 0, 1],   // FRONT
            [0, 0, -1],  // BACK
            [0, 1, 0],   // TOP
            [0, -1, 0],  // BOTTOM
            [1, 0, 0],   // RIGHT
            [-1, 0, 0]   // LEFT
        ];

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexCounter = 0;

        const generateFace = (side: number, uSegments: number, vSegments: number) => {
            const temp1 = new Vector3();
            const temp2 = new Vector3();
            const temp3 = new Vector3();
            const r = new Vector3();

            for (let i = 0; i <= uSegments; i++) {
                for (let j = 0; j <= vSegments; j++) {
                    const uFrac = i / uSegments;
                    const vFrac = j / vSegments;

                    // Lerp along u and v axes
                    const c0 = corners[faceAxes[side][0]];
                    const c1 = corners[faceAxes[side][1]];
                    const c2 = corners[faceAxes[side][2]];

                    temp1.set(
                        c0.x + (c1.x - c0.x) * uFrac,
                        c0.y + (c1.y - c0.y) * uFrac,
                        c0.z + (c1.z - c0.z) * uFrac
                    );
                    temp2.set(
                        c0.x + (c2.x - c0.x) * vFrac,
                        c0.y + (c2.y - c0.y) * vFrac,
                        c0.z + (c2.z - c0.z) * vFrac
                    );
                    temp3.set(temp2.x - c0.x, temp2.y - c0.y, temp2.z - c0.z);
                    r.set(temp1.x + temp3.x, temp1.y + temp3.y, temp1.z + temp3.z);

                    positions.push(r.x, r.y, r.z);
                    normals.push(faceNormals[side][0], faceNormals[side][1], faceNormals[side][2]);
                    uvs.push(uFrac, 1 - vFrac);

                    if (i < uSegments && j < vSegments) {
                        indices.push(
                            vertexCounter + vSegments + 1,
                            vertexCounter + 1,
                            vertexCounter
                        );
                        indices.push(
                            vertexCounter + vSegments + 1,
                            vertexCounter + vSegments + 2,
                            vertexCounter + 1
                        );
                    }

                    vertexCounter++;
                }
            }
        };

        // Generate all 6 faces
        generateFace(0, ws, hs); // FRONT
        generateFace(1, ws, hs); // BACK
        generateFace(2, ws, ls); // TOP
        generateFace(3, ws, ls); // BOTTOM
        generateFace(4, ls, hs); // RIGHT
        generateFace(5, ls, hs); // LEFT

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
