/**
 * Geometry utility functions for calculating normals and tangents.
 */

import { Vector3 } from '../math/Vector3';

/**
 * Calculate normals from positions and triangle indices.
 *
 * @param positions - Array of vertex positions (x, y, z per vertex)
 * @param indices - Array of triangle indices
 * @returns Array of normals (x, y, z per vertex)
 */
export function calculateNormals(positions: number[], indices: number[]): number[] {
    const triangleCount = indices.length / 3;
    const vertexCount = positions.length / 3;

    const p1 = new Vector3();
    const p2 = new Vector3();
    const p3 = new Vector3();
    const p1p2 = new Vector3();
    const p1p3 = new Vector3();
    const faceNormal = new Vector3();

    const normals: number[] = new Array(positions.length).fill(0);

    // Accumulate face normals for each vertex
    for (let i = 0; i < triangleCount; i++) {
        const i1 = indices[i * 3];
        const i2 = indices[i * 3 + 1];
        const i3 = indices[i * 3 + 2];

        p1.set(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
        p2.set(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
        p3.set(positions[i3 * 3], positions[i3 * 3 + 1], positions[i3 * 3 + 2]);

        // Calculate edge vectors
        p1p2.set(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
        p1p3.set(p3.x - p1.x, p3.y - p1.y, p3.z - p1.z);

        // Calculate face normal via cross product
        faceNormal.set(
            p1p2.y * p1p3.z - p1p2.z * p1p3.y,
            p1p2.z * p1p3.x - p1p2.x * p1p3.z,
            p1p2.x * p1p3.y - p1p2.y * p1p3.x
        );

        // Normalize
        const len = Math.sqrt(faceNormal.x ** 2 + faceNormal.y ** 2 + faceNormal.z ** 2);
        if (len > 0) {
            faceNormal.set(faceNormal.x / len, faceNormal.y / len, faceNormal.z / len);
        }

        // Accumulate to each vertex
        normals[i1 * 3] += faceNormal.x;
        normals[i1 * 3 + 1] += faceNormal.y;
        normals[i1 * 3 + 2] += faceNormal.z;
        normals[i2 * 3] += faceNormal.x;
        normals[i2 * 3 + 1] += faceNormal.y;
        normals[i2 * 3 + 2] += faceNormal.z;
        normals[i3 * 3] += faceNormal.x;
        normals[i3 * 3 + 1] += faceNormal.y;
        normals[i3 * 3 + 2] += faceNormal.z;
    }

    // Normalize all vertex normals
    for (let i = 0; i < vertexCount; i++) {
        const nx = normals[i * 3];
        const ny = normals[i * 3 + 1];
        const nz = normals[i * 3 + 2];
        const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals[i * 3] *= invLen;
        normals[i * 3 + 1] *= invLen;
        normals[i * 3 + 2] *= invLen;
    }

    return normals;
}

/**
 * Calculate tangents from positions, normals, UVs and triangle indices.
 * Uses Lengyel's method for robust tangent space calculation.
 *
 * @param positions - Array of vertex positions
 * @param normals - Array of vertex normals
 * @param uvs - Array of texture coordinates
 * @param indices - Array of triangle indices
 * @returns Array of tangents (x, y, z, w per vertex where w is handedness)
 */
export function calculateTangents(
    positions: number[],
    normals: number[],
    uvs: number[],
    indices: number[]
): number[] {
    const triangleCount = indices.length / 3;
    const vertexCount = positions.length / 3;

    const tan1 = new Float32Array(vertexCount * 3);
    const tan2 = new Float32Array(vertexCount * 3);
    const tangents: number[] = [];

    for (let i = 0; i < triangleCount; i++) {
        const i1 = indices[i * 3];
        const i2 = indices[i * 3 + 1];
        const i3 = indices[i * 3 + 2];

        const v1x = positions[i1 * 3], v1y = positions[i1 * 3 + 1], v1z = positions[i1 * 3 + 2];
        const v2x = positions[i2 * 3], v2y = positions[i2 * 3 + 1], v2z = positions[i2 * 3 + 2];
        const v3x = positions[i3 * 3], v3y = positions[i3 * 3 + 1], v3z = positions[i3 * 3 + 2];

        const w1u = uvs[i1 * 2], w1v = uvs[i1 * 2 + 1];
        const w2u = uvs[i2 * 2], w2v = uvs[i2 * 2 + 1];
        const w3u = uvs[i3 * 2], w3v = uvs[i3 * 2 + 1];

        const x1 = v2x - v1x, x2 = v3x - v1x;
        const y1 = v2y - v1y, y2 = v3y - v1y;
        const z1 = v2z - v1z, z2 = v3z - v1z;

        const s1 = w2u - w1u, s2 = w3u - w1u;
        const t1 = w2v - w1v, t2 = w3v - w1v;

        const area = s1 * t2 - s2 * t1;

        let sdirX: number, sdirY: number, sdirZ: number;
        let tdirX: number, tdirY: number, tdirZ: number;

        if (area === 0) {
            // Degenerate - use fallback
            sdirX = 0; sdirY = 1; sdirZ = 0;
            tdirX = 1; tdirY = 0; tdirZ = 0;
        } else {
            const r = 1 / area;
            sdirX = (t2 * x1 - t1 * x2) * r;
            sdirY = (t2 * y1 - t1 * y2) * r;
            sdirZ = (t2 * z1 - t1 * z2) * r;
            tdirX = (s1 * x2 - s2 * x1) * r;
            tdirY = (s1 * y2 - s2 * y1) * r;
            tdirZ = (s1 * z2 - s2 * z1) * r;
        }

        tan1[i1 * 3] += sdirX; tan1[i1 * 3 + 1] += sdirY; tan1[i1 * 3 + 2] += sdirZ;
        tan1[i2 * 3] += sdirX; tan1[i2 * 3 + 1] += sdirY; tan1[i2 * 3 + 2] += sdirZ;
        tan1[i3 * 3] += sdirX; tan1[i3 * 3 + 1] += sdirY; tan1[i3 * 3 + 2] += sdirZ;

        tan2[i1 * 3] += tdirX; tan2[i1 * 3 + 1] += tdirY; tan2[i1 * 3 + 2] += tdirZ;
        tan2[i2 * 3] += tdirX; tan2[i2 * 3 + 1] += tdirY; tan2[i2 * 3 + 2] += tdirZ;
        tan2[i3 * 3] += tdirX; tan2[i3 * 3 + 1] += tdirY; tan2[i3 * 3 + 2] += tdirZ;
    }

    // Gram-Schmidt orthogonalize and calculate handedness
    for (let i = 0; i < vertexCount; i++) {
        const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
        const t1x = tan1[i * 3], t1y = tan1[i * 3 + 1], t1z = tan1[i * 3 + 2];
        const t2x = tan2[i * 3], t2y = tan2[i * 3 + 1], t2z = tan2[i * 3 + 2];

        // Gram-Schmidt: tangent = normalize(t1 - n * dot(n, t1))
        const ndott = nx * t1x + ny * t1y + nz * t1z;
        let tx = t1x - nx * ndott;
        let ty = t1y - ny * ndott;
        let tz = t1z - nz * ndott;

        const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (len > 0) {
            tx /= len;
            ty /= len;
            tz /= len;
        }

        // Calculate handedness: sign of dot(cross(n, t1), t2)
        const crossX = ny * t1z - nz * t1y;
        const crossY = nz * t1x - nx * t1z;
        const crossZ = nx * t1y - ny * t1x;
        const handedness = (crossX * t2x + crossY * t2y + crossZ * t2z) < 0 ? -1 : 1;

        tangents[i * 4] = tx;
        tangents[i * 4 + 1] = ty;
        tangents[i * 4 + 2] = tz;
        tangents[i * 4 + 3] = handedness;
    }

    return tangents;
}
