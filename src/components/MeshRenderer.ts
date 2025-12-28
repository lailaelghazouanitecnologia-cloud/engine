/**
 * MeshRenderer component for rendering meshes.
 */

import { Behaviour } from '../core/Behaviour';
import { Vector3 } from '../math/Vector3';
import { Matrix4x4 } from '../math/Matrix4x4';
import type { Mesh, BoundingBox, BoundingSphere } from '../graphics/Mesh';
import type { Material } from '../graphics/Material';

export enum ShadowCastingMode {
    OFF = 0,
    ON = 1,
    TWO_SIDED = 2,
    SHADOWS_ONLY = 3
}

/**
 * MeshRenderer component renders a Mesh using Materials.
 *
 * @example
 * const renderer = gameObject.addComponent(MeshRenderer);
 * renderer.mesh = mesh;
 * renderer.material = material;
 */
export class MeshRenderer extends Behaviour {
    /** The mesh to render */
    private _mesh: Mesh | null = null;

    /** Materials for each sub-mesh */
    private _materials: Material[] = [];

    /** Shadow casting mode */
    shadowCastingMode: ShadowCastingMode = ShadowCastingMode.ON;

    /** Receive shadows */
    receiveShadows: boolean = true;

    /** Layer for rendering/culling */
    layer: number = 0;

    /** Rendering order within the same queue */
    sortingOrder: number = 0;

    /** Cached world bounds */
    private _worldBounds: BoundingBox | null = null;
    private _worldBoundingSphere: BoundingSphere | null = null;
    private _lastWorldMatrix: Matrix4x4 | null = null;

    // ==================== Properties ====================

    /** Get/set the mesh */
    get mesh(): Mesh | null {
        return this._mesh;
    }
    set mesh(value: Mesh | null) {
        this._mesh = value;
        this._worldBounds = null;
        this._worldBoundingSphere = null;
    }

    /** Get/set the first material */
    get material(): Material | null {
        return this._materials[0] ?? null;
    }
    set material(value: Material | null) {
        if (value) {
            this._materials[0] = value;
        } else {
            this._materials.splice(0, 1);
        }
    }

    /** Get/set all materials */
    get materials(): Material[] {
        return [...this._materials];
    }
    set materials(value: Material[]) {
        this._materials = [...value];
    }

    /** Get a shared material (same reference as internal) */
    get sharedMaterial(): Material | null {
        return this._materials[0] ?? null;
    }
    set sharedMaterial(value: Material | null) {
        if (value) {
            this._materials[0] = value;
        }
    }

    /** Get all shared materials */
    get sharedMaterials(): Material[] {
        return this._materials;
    }
    set sharedMaterials(value: Material[]) {
        this._materials = value;
    }

    // ==================== Bounds ====================

    /**
     * Get local-space bounding box.
     */
    get localBounds(): BoundingBox | null {
        return this._mesh?.bounds ?? null;
    }

    /**
     * Get world-space bounding box.
     */
    get bounds(): BoundingBox {
        this._updateWorldBounds();
        return this._worldBounds!;
    }

    /**
     * Get world-space bounding sphere.
     */
    get worldBoundingSphere(): BoundingSphere {
        this._updateWorldBounds();
        return this._worldBoundingSphere!;
    }

    private _updateWorldBounds(): void {
        if (!this._mesh || !this.transform) {
            this._worldBounds = {
                min: Vector3.zero,
                max: Vector3.zero,
                center: Vector3.zero,
                extents: Vector3.zero
            };
            this._worldBoundingSphere = { center: Vector3.zero, radius: 0 };
            return;
        }

        const worldMatrix = this.transform.localToWorldMatrix;

        // Check if transform has changed
        if (this._lastWorldMatrix && this._worldBounds) {
            let unchanged = true;
            for (let i = 0; i < 16; i++) {
                if (Math.abs(worldMatrix.data[i] - this._lastWorldMatrix.data[i]) > 0.0001) {
                    unchanged = false;
                    break;
                }
            }
            if (unchanged) return;
        }

        this._lastWorldMatrix = worldMatrix;

        const localBounds = this._mesh.bounds;

        // Transform all 8 corners of the local AABB
        const corners = [
            new Vector3(localBounds.min.x, localBounds.min.y, localBounds.min.z),
            new Vector3(localBounds.max.x, localBounds.min.y, localBounds.min.z),
            new Vector3(localBounds.min.x, localBounds.max.y, localBounds.min.z),
            new Vector3(localBounds.max.x, localBounds.max.y, localBounds.min.z),
            new Vector3(localBounds.min.x, localBounds.min.y, localBounds.max.z),
            new Vector3(localBounds.max.x, localBounds.min.y, localBounds.max.z),
            new Vector3(localBounds.min.x, localBounds.max.y, localBounds.max.z),
            new Vector3(localBounds.max.x, localBounds.max.y, localBounds.max.z)
        ];

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const corner of corners) {
            const transformed = worldMatrix.transformPoint(corner);
            minX = Math.min(minX, transformed.x);
            minY = Math.min(minY, transformed.y);
            minZ = Math.min(minZ, transformed.z);
            maxX = Math.max(maxX, transformed.x);
            maxY = Math.max(maxY, transformed.y);
            maxZ = Math.max(maxZ, transformed.z);
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

        this._worldBounds = { min, max, center, extents };

        // Bounding sphere
        const radius = Math.sqrt(
            extents.x * extents.x +
            extents.y * extents.y +
            extents.z * extents.z
        );
        this._worldBoundingSphere = { center, radius };
    }

    // ==================== Rendering ====================

    /**
     * Get the material for a specific sub-mesh.
     */
    getMaterial(index: number): Material | null {
        return this._materials[index] ?? this._materials[0] ?? null;
    }

    /**
     * Set the material for a specific sub-mesh.
     */
    setMaterial(index: number, material: Material): void {
        while (this._materials.length <= index) {
            this._materials.push(this._materials[0] ?? material);
        }
        this._materials[index] = material;
    }

    /**
     * Render the mesh.
     * Called by the renderer.
     * @internal
     */
    _render(worldMatrix: Matrix4x4, viewMatrix: Matrix4x4, projectionMatrix: Matrix4x4): void {
        if (!this._mesh || this._materials.length === 0) return;

        // Bind mesh
        this._mesh._bind();

        // Draw each sub-mesh
        for (let i = 0; i < this._mesh.subMeshCount; i++) {
            const material = this.getMaterial(i);
            if (!material) continue;

            // Set transform matrices
            material.setMatrix('_ModelMatrix', worldMatrix.data);
            material.setMatrix('_ViewMatrix', viewMatrix.data);
            material.setMatrix('_ProjectionMatrix', projectionMatrix.data);

            // Combined matrices
            const mv = viewMatrix.multiply(worldMatrix);
            const mvp = projectionMatrix.multiply(mv);
            material.setMatrix('_ModelViewMatrix', mv.data);
            material.setMatrix('_ModelViewProjectionMatrix', mvp.data);

            // Normal matrix (inverse transpose of model-view)
            const normalMatrix = mv.inverse.transpose;
            material.setMatrix('_NormalMatrix', new Float32Array([
                normalMatrix.data[0], normalMatrix.data[1], normalMatrix.data[2],
                normalMatrix.data[4], normalMatrix.data[5], normalMatrix.data[6],
                normalMatrix.data[8], normalMatrix.data[9], normalMatrix.data[10]
            ]));

            // Apply material and draw
            material.apply();
            this._mesh._draw(i);
        }
    }

    /**
     * Check if this renderer is visible to a camera.
     */
    isVisibleFrom(_cameraPosition: Vector3, frustumPlanes: Float32Array): boolean {
        const sphere = this.worldBoundingSphere;

        // Check against each frustum plane
        for (let i = 0; i < 6; i++) {
            const nx = frustumPlanes[i * 4];
            const ny = frustumPlanes[i * 4 + 1];
            const nz = frustumPlanes[i * 4 + 2];
            const d = frustumPlanes[i * 4 + 3];

            const distance = nx * sphere.center.x + ny * sphere.center.y + nz * sphere.center.z + d;
            if (distance < -sphere.radius) {
                return false;
            }
        }

        return true;
    }
}
