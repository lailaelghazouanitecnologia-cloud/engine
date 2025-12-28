/**
 * MeshRenderer Component Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MeshRenderer, ShadowCastingMode } from '../../src/components/MeshRenderer';
import { GameObject } from '../../src/core/GameObject';
import { Vector3 } from '../../src/math/Vector3';

// Mock Material
const createMockMaterial = () => ({
    setMatrix: () => {},
    setVector: () => {},
    setFloat: () => {},
    apply: () => {},
    getFloat: () => 1,
} as any);

// Mock Mesh with proper structure
const createMockMesh = () => ({
    bounds: {
        min: new Vector3(-1, -1, -1),
        max: new Vector3(1, 1, 1),
        center: new Vector3(0, 0, 0),
        extents: new Vector3(1, 1, 1)
    },
    subMeshCount: 1,
    vertexCount: 100,
    _bind: () => {},
    _draw: () => {},
} as any);

describe('MeshRenderer', () => {
    let gameObject: GameObject;
    let meshRenderer: MeshRenderer;

    beforeEach(() => {
        gameObject = new GameObject('TestObject');
        meshRenderer = gameObject.addComponent(MeshRenderer);
    });

    describe('Constructor', () => {
        it('should have null mesh by default', () => {
            expect(meshRenderer.mesh).toBeNull();
        });

        it('should have null material by default', () => {
            expect(meshRenderer.material).toBeNull();
        });

        it('should have shadow casting ON by default', () => {
            expect(meshRenderer.shadowCastingMode).toBe(ShadowCastingMode.ON);
        });

        it('should receive shadows by default', () => {
            expect(meshRenderer.receiveShadows).toBe(true);
        });

        it('should have layer 0 by default', () => {
            expect(meshRenderer.layer).toBe(0);
        });

        it('should have sorting order 0 by default', () => {
            expect(meshRenderer.sortingOrder).toBe(0);
        });
    });

    describe('Mesh Property', () => {
        it('should set mesh', () => {
            const mesh = createMockMesh();
            meshRenderer.mesh = mesh;
            expect(meshRenderer.mesh).toBe(mesh);
        });

        it('should clear mesh', () => {
            meshRenderer.mesh = createMockMesh();
            meshRenderer.mesh = null;
            expect(meshRenderer.mesh).toBeNull();
        });

        it('should invalidate bounds when mesh changes', () => {
            meshRenderer.mesh = createMockMesh();
            const bounds1 = meshRenderer.bounds;

            meshRenderer.mesh = null;
            const bounds2 = meshRenderer.bounds;

            // Null mesh should return zero bounds
            expect(bounds2.center.x).toBe(0);
            expect(bounds2.center.y).toBe(0);
            expect(bounds2.center.z).toBe(0);
        });
    });

    describe('Material Property', () => {
        it('should set material', () => {
            const material = createMockMaterial();
            meshRenderer.material = material;
            expect(meshRenderer.material).toBe(material);
        });

        it('should clear material', () => {
            meshRenderer.material = createMockMaterial();
            meshRenderer.material = null;
            expect(meshRenderer.material).toBeNull();
        });
    });

    describe('Materials Array', () => {
        it('should return empty array by default', () => {
            expect(meshRenderer.materials).toEqual([]);
        });

        it('should set materials array', () => {
            const mat1 = createMockMaterial();
            const mat2 = createMockMaterial();
            meshRenderer.materials = [mat1, mat2];

            const materials = meshRenderer.materials;
            expect(materials.length).toBe(2);
            expect(materials[0]).toBe(mat1);
            expect(materials[1]).toBe(mat2);
        });

        it('should return copy of materials array', () => {
            const mat = createMockMaterial();
            meshRenderer.materials = [mat];

            const materials1 = meshRenderer.materials;
            const materials2 = meshRenderer.materials;

            expect(materials1).not.toBe(materials2);
        });
    });

    describe('Shared Materials', () => {
        it('should set shared material', () => {
            const material = createMockMaterial();
            meshRenderer.sharedMaterial = material;
            expect(meshRenderer.sharedMaterial).toBe(material);
        });

        it('should return shared materials array directly', () => {
            const mat = createMockMaterial();
            meshRenderer.sharedMaterials = [mat];

            const mats1 = meshRenderer.sharedMaterials;
            const mats2 = meshRenderer.sharedMaterials;

            // sharedMaterials returns same reference
            expect(mats1).toBe(mats2);
        });
    });

    describe('Get/Set Material by Index', () => {
        it('should get material by index', () => {
            const mat1 = createMockMaterial();
            const mat2 = createMockMaterial();
            meshRenderer.materials = [mat1, mat2];

            expect(meshRenderer.getMaterial(0)).toBe(mat1);
            expect(meshRenderer.getMaterial(1)).toBe(mat2);
        });

        it('should fall back to first material for out of range index', () => {
            const mat = createMockMaterial();
            meshRenderer.materials = [mat];

            expect(meshRenderer.getMaterial(5)).toBe(mat);
        });

        it('should return null when no materials', () => {
            expect(meshRenderer.getMaterial(0)).toBeNull();
        });

        it('should set material by index', () => {
            const mat1 = createMockMaterial();
            const mat2 = createMockMaterial();
            meshRenderer.material = mat1;

            meshRenderer.setMaterial(1, mat2);

            expect(meshRenderer.getMaterial(0)).toBe(mat1);
            expect(meshRenderer.getMaterial(1)).toBe(mat2);
        });
    });

    describe('Bounds', () => {
        it('should return local bounds from mesh', () => {
            meshRenderer.mesh = createMockMesh();
            const localBounds = meshRenderer.localBounds;

            expect(localBounds).not.toBeNull();
            expect(localBounds!.min.x).toBe(-1);
            expect(localBounds!.max.x).toBe(1);
        });

        it('should return null local bounds when no mesh', () => {
            expect(meshRenderer.localBounds).toBeNull();
        });

        it('should compute world bounds', () => {
            meshRenderer.mesh = createMockMesh();
            gameObject.transform.position = new Vector3(5, 5, 5);

            const bounds = meshRenderer.bounds;

            expect(bounds.center.x).toBeCloseTo(5, 1);
            expect(bounds.center.y).toBeCloseTo(5, 1);
            expect(bounds.center.z).toBeCloseTo(5, 1);
        });

        it('should compute world bounding sphere', () => {
            meshRenderer.mesh = createMockMesh();
            gameObject.transform.position = new Vector3(0, 0, 0);

            const sphere = meshRenderer.worldBoundingSphere;

            expect(sphere.center.x).toBeCloseTo(0, 1);
            expect(sphere.center.y).toBeCloseTo(0, 1);
            expect(sphere.center.z).toBeCloseTo(0, 1);
            expect(sphere.radius).toBeGreaterThan(0);
        });

        it('should update bounds when transform changes', () => {
            meshRenderer.mesh = createMockMesh();

            gameObject.transform.position = new Vector3(0, 0, 0);
            const bounds1 = meshRenderer.bounds;

            gameObject.transform.position = new Vector3(10, 10, 10);
            const bounds2 = meshRenderer.bounds;

            expect(bounds2.center.x).not.toBe(bounds1.center.x);
        });
    });

    describe('Visibility Testing', () => {
        it('should test visibility from camera frustum planes', () => {
            meshRenderer.mesh = createMockMesh();

            // Create frustum planes that include origin
            const frustumPlanes = new Float32Array(24);
            // Left plane: x >= -100
            frustumPlanes[0] = 1; frustumPlanes[1] = 0; frustumPlanes[2] = 0; frustumPlanes[3] = 100;
            // Right plane: x <= 100
            frustumPlanes[4] = -1; frustumPlanes[5] = 0; frustumPlanes[6] = 0; frustumPlanes[7] = 100;
            // Bottom plane: y >= -100
            frustumPlanes[8] = 0; frustumPlanes[9] = 1; frustumPlanes[10] = 0; frustumPlanes[11] = 100;
            // Top plane: y <= 100
            frustumPlanes[12] = 0; frustumPlanes[13] = -1; frustumPlanes[14] = 0; frustumPlanes[15] = 100;
            // Near plane: z >= -100
            frustumPlanes[16] = 0; frustumPlanes[17] = 0; frustumPlanes[18] = 1; frustumPlanes[19] = 100;
            // Far plane: z <= 100
            frustumPlanes[20] = 0; frustumPlanes[21] = 0; frustumPlanes[22] = -1; frustumPlanes[23] = 100;

            const cameraPos = new Vector3(0, 0, 0);
            expect(meshRenderer.isVisibleFrom(cameraPos, frustumPlanes)).toBe(true);
        });

        it('should be invisible when outside frustum', () => {
            meshRenderer.mesh = createMockMesh();
            gameObject.transform.position = new Vector3(1000, 0, 0);

            // Create tight frustum that excludes the object
            const frustumPlanes = new Float32Array(24);
            // Left plane: x >= -10
            frustumPlanes[0] = 1; frustumPlanes[1] = 0; frustumPlanes[2] = 0; frustumPlanes[3] = 10;
            // Right plane: x <= 10
            frustumPlanes[4] = -1; frustumPlanes[5] = 0; frustumPlanes[6] = 0; frustumPlanes[7] = 10;
            // Bottom plane: y >= -10
            frustumPlanes[8] = 0; frustumPlanes[9] = 1; frustumPlanes[10] = 0; frustumPlanes[11] = 10;
            // Top plane: y <= 10
            frustumPlanes[12] = 0; frustumPlanes[13] = -1; frustumPlanes[14] = 0; frustumPlanes[15] = 10;
            // Near plane: z >= -10
            frustumPlanes[16] = 0; frustumPlanes[17] = 0; frustumPlanes[18] = 1; frustumPlanes[19] = 10;
            // Far plane: z <= 10
            frustumPlanes[20] = 0; frustumPlanes[21] = 0; frustumPlanes[22] = -1; frustumPlanes[23] = 10;

            const cameraPos = new Vector3(0, 0, 0);
            expect(meshRenderer.isVisibleFrom(cameraPos, frustumPlanes)).toBe(false);
        });
    });
});
