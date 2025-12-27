/**
 * Procedural sphere geometry.
 */

import { Geometry } from './Geometry';
import { calculateTangents } from './geometry-utils';

export interface SphereGeometryOptions {
    /** Radius of the sphere. Defaults to 0.5 */
    radius?: number;
    /** Divisions along latitude. Defaults to 16 */
    latitudeBands?: number;
    /** Divisions along longitude. Defaults to 16 */
    longitudeBands?: number;
    /** Calculate tangent vectors. Defaults to false */
    calculateTangents?: boolean;
}

/**
 * A procedural sphere geometry using latitude/longitude tessellation.
 *
 * @example
 * const sphere = new SphereGeometry();
 *
 * @example
 * const sphere = new SphereGeometry({
 *     radius: 2,
 *     latitudeBands: 32,
 *     longitudeBands: 32
 * });
 */
export class SphereGeometry extends Geometry {
    constructor(opts: SphereGeometryOptions = {}) {
        super();

        const radius = opts.radius ?? 0.5;
        const latitudeBands = opts.latitudeBands ?? 16;
        const longitudeBands = opts.longitudeBands ?? 16;

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // Generate vertices
        for (let lat = 0; lat <= latitudeBands; lat++) {
            const theta = (lat * Math.PI) / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= longitudeBands; lon++) {
                // Sweep from +Z to match common conventions
                const phi = (lon * 2 * Math.PI) / longitudeBands - Math.PI / 2;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                const u = 1 - lon / longitudeBands;
                const v = 1 - lat / latitudeBands;

                positions.push(x * radius, y * radius, z * radius);
                normals.push(x, y, z);
                uvs.push(u, 1 - v);
            }
        }

        // Generate indices
        for (let lat = 0; lat < latitudeBands; lat++) {
            for (let lon = 0; lon < longitudeBands; lon++) {
                const first = lat * (longitudeBands + 1) + lon;
                const second = first + longitudeBands + 1;

                indices.push(first + 1, second, first);
                indices.push(first + 1, second + 1, second);
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
