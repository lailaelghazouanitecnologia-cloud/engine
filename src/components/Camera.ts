/**
 * Camera component for viewing the scene.
 */

import { Behaviour } from '../core/Behaviour';
import { Vector3 } from '../math/Vector3';
import { Matrix4x4 } from '../math/Matrix4x4';
import { Color } from '../math/Color';
import { Mathf } from '../math/Mathf';
import { ClearFlag } from '../graphics/constants';
import type { RenderTarget } from '../graphics/RenderTarget';

export enum CameraProjection {
    PERSPECTIVE = 0,
    ORTHOGRAPHIC = 1
}

export enum CameraClearFlags {
    SKYBOX = 1,
    SOLID_COLOR = 2,
    DEPTH_ONLY = 3,
    NOTHING = 4
}

/**
 * Camera component for rendering the scene from a specific viewpoint.
 *
 * @example
 * const camera = gameObject.addComponent(Camera);
 * camera.fieldOfView = 60;
 * camera.nearClipPlane = 0.1;
 * camera.farClipPlane = 1000;
 */
export class Camera extends Behaviour {
    /** Background clear color */
    backgroundColor: Color = new Color(0.2, 0.2, 0.2, 1);

    /** Clear flags */
    clearFlags: CameraClearFlags = CameraClearFlags.SOLID_COLOR;

    /** Render target (null = screen) */
    renderTarget: RenderTarget | null = null;

    /** Render priority (lower = rendered first) */
    priority: number = 0;

    /** Layer mask for filtering what to render */
    cullingMask: number = 0xFFFFFFFF;

    private _projection: CameraProjection = CameraProjection.PERSPECTIVE;
    private _fieldOfView: number = 60;
    private _orthographicSize: number = 5;
    private _nearClipPlane: number = 0.1;
    private _farClipPlane: number = 1000;
    private _aspect: number = 16 / 9;
    private _rect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 1, height: 1 };

    private _projectionMatrix: Matrix4x4 = Matrix4x4.identity;
    private _viewMatrix: Matrix4x4 = Matrix4x4.identity;
    private _viewProjectionMatrix: Matrix4x4 = Matrix4x4.identity;
    private _inverseViewMatrix: Matrix4x4 = Matrix4x4.identity;
    private _projectionDirty: boolean = true;

    // Frustum planes for culling
    private _frustumPlanes: Float32Array = new Float32Array(24); // 6 planes * 4 components

    // ==================== Properties ====================

    /** Projection type (perspective or orthographic) */
    get projection(): CameraProjection {
        return this._projection;
    }
    set projection(value: CameraProjection) {
        if (this._projection !== value) {
            this._projection = value;
            this._projectionDirty = true;
        }
    }

    /** Field of view in degrees (perspective mode) */
    get fieldOfView(): number {
        return this._fieldOfView;
    }
    set fieldOfView(value: number) {
        value = Mathf.clamp(value, 1, 179);
        if (this._fieldOfView !== value) {
            this._fieldOfView = value;
            this._projectionDirty = true;
        }
    }

    /** Orthographic size (half-height of the view volume) */
    get orthographicSize(): number {
        return this._orthographicSize;
    }
    set orthographicSize(value: number) {
        value = Math.max(0.01, value);
        if (this._orthographicSize !== value) {
            this._orthographicSize = value;
            this._projectionDirty = true;
        }
    }

    /** Near clipping plane distance */
    get nearClipPlane(): number {
        return this._nearClipPlane;
    }
    set nearClipPlane(value: number) {
        value = Math.max(0.001, value);
        if (this._nearClipPlane !== value) {
            this._nearClipPlane = value;
            this._projectionDirty = true;
        }
    }

    /** Far clipping plane distance */
    get farClipPlane(): number {
        return this._farClipPlane;
    }
    set farClipPlane(value: number) {
        if (this._farClipPlane !== value) {
            this._farClipPlane = value;
            this._projectionDirty = true;
        }
    }

    /** Aspect ratio (width / height) */
    get aspect(): number {
        return this._aspect;
    }
    set aspect(value: number) {
        if (this._aspect !== value) {
            this._aspect = value;
            this._projectionDirty = true;
        }
    }

    /** Viewport rectangle (normalized 0-1) */
    get rect(): { x: number; y: number; width: number; height: number } {
        return { ...this._rect };
    }
    set rect(value: { x: number; y: number; width: number; height: number }) {
        this._rect = { ...value };
    }

    // ==================== Matrices ====================

    /** Get the projection matrix */
    get projectionMatrix(): Matrix4x4 {
        if (this._projectionDirty) {
            this._updateProjectionMatrix();
        }
        return this._projectionMatrix;
    }

    /** Get the view matrix (world to camera) */
    get viewMatrix(): Matrix4x4 {
        this._updateViewMatrix();
        return this._viewMatrix;
    }

    /** Get the combined view-projection matrix */
    get viewProjectionMatrix(): Matrix4x4 {
        if (this._projectionDirty) {
            this._updateProjectionMatrix();
        }
        this._updateViewMatrix();

        // VP = P * V
        this._viewProjectionMatrix = this._projectionMatrix.multiply(this._viewMatrix);
        return this._viewProjectionMatrix;
    }

    /** Get the inverse view matrix (camera to world) */
    get cameraToWorldMatrix(): Matrix4x4 {
        this._updateViewMatrix();
        return this._inverseViewMatrix;
    }

    /** Get the world to camera matrix (same as viewMatrix) */
    get worldToCameraMatrix(): Matrix4x4 {
        return this.viewMatrix;
    }

    // ==================== Coordinate Conversion ====================

    /**
     * Convert a point from world space to viewport space.
     * @param worldPoint - Point in world space
     * @returns Point in viewport space (x, y in [0,1], z is depth)
     */
    worldToViewportPoint(worldPoint: Vector3): Vector3 {
        const vp = this.viewProjectionMatrix;
        const clip = vp.transformPoint(worldPoint);

        // Perspective divide
        const w = vp.data[3] * worldPoint.x + vp.data[7] * worldPoint.y +
                  vp.data[11] * worldPoint.z + vp.data[15];

        return new Vector3(
            (clip.x / w + 1) * 0.5,
            (clip.y / w + 1) * 0.5,
            (clip.z / w + 1) * 0.5
        );
    }

    /**
     * Convert a point from world space to screen space.
     * @param worldPoint - Point in world space
     * @param screenWidth - Screen width in pixels
     * @param screenHeight - Screen height in pixels
     * @returns Point in screen space (pixels)
     */
    worldToScreenPoint(worldPoint: Vector3, screenWidth: number, screenHeight: number): Vector3 {
        const viewport = this.worldToViewportPoint(worldPoint);
        return new Vector3(
            viewport.x * screenWidth,
            viewport.y * screenHeight,
            viewport.z
        );
    }

    /**
     * Convert a point from viewport space to world space.
     * @param viewportPoint - Point in viewport space (x, y in [0,1], z is depth)
     * @returns Point in world space
     */
    viewportToWorldPoint(viewportPoint: Vector3): Vector3 {
        // Convert to clip space
        const clipX = viewportPoint.x * 2 - 1;
        const clipY = viewportPoint.y * 2 - 1;
        const clipZ = viewportPoint.z * 2 - 1;

        // Inverse view-projection
        const invVP = this.viewProjectionMatrix.inverse;
        const world = invVP.transformPoint(new Vector3(clipX, clipY, clipZ));

        return world;
    }

    /**
     * Create a ray from the camera through a screen point.
     * @param screenPoint - Screen coordinates in pixels
     * @param screenWidth - Screen width
     * @param screenHeight - Screen height
     * @returns Ray with origin and direction
     */
    screenPointToRay(
        screenPoint: Vector3,
        screenWidth: number,
        screenHeight: number
    ): { origin: Vector3; direction: Vector3 } {
        const viewportPoint = new Vector3(
            screenPoint.x / screenWidth,
            screenPoint.y / screenHeight,
            0
        );

        const nearPoint = this.viewportToWorldPoint(new Vector3(viewportPoint.x, viewportPoint.y, 0));
        const farPoint = this.viewportToWorldPoint(new Vector3(viewportPoint.x, viewportPoint.y, 1));

        const direction = new Vector3(
            farPoint.x - nearPoint.x,
            farPoint.y - nearPoint.y,
            farPoint.z - nearPoint.z
        ).normalized;

        return {
            origin: nearPoint,
            direction
        };
    }

    // ==================== Frustum Culling ====================

    /**
     * Check if a bounding sphere is visible.
     * @param center - Sphere center in world space
     * @param radius - Sphere radius
     * @returns True if visible
     */
    isSphereVisible(center: Vector3, radius: number): boolean {
        this._updateFrustumPlanes();

        for (let i = 0; i < 6; i++) {
            const nx = this._frustumPlanes[i * 4];
            const ny = this._frustumPlanes[i * 4 + 1];
            const nz = this._frustumPlanes[i * 4 + 2];
            const d = this._frustumPlanes[i * 4 + 3];

            const distance = nx * center.x + ny * center.y + nz * center.z + d;
            if (distance < -radius) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if an axis-aligned bounding box is visible.
     * @param min - Box minimum corner
     * @param max - Box maximum corner
     * @returns True if visible
     */
    isBoxVisible(min: Vector3, max: Vector3): boolean {
        this._updateFrustumPlanes();

        for (let i = 0; i < 6; i++) {
            const nx = this._frustumPlanes[i * 4];
            const ny = this._frustumPlanes[i * 4 + 1];
            const nz = this._frustumPlanes[i * 4 + 2];
            const d = this._frustumPlanes[i * 4 + 3];

            // Find the positive vertex (furthest along plane normal)
            const px = nx > 0 ? max.x : min.x;
            const py = ny > 0 ? max.y : min.y;
            const pz = nz > 0 ? max.z : min.z;

            if (nx * px + ny * py + nz * pz + d < 0) {
                return false;
            }
        }

        return true;
    }

    // ==================== Internal ====================

    private _updateProjectionMatrix(): void {
        if (this._projection === CameraProjection.PERSPECTIVE) {
            this._projectionMatrix = Matrix4x4.perspective(
                this._fieldOfView * Mathf.Deg2Rad,
                this._aspect,
                this._nearClipPlane,
                this._farClipPlane
            );
        } else {
            const halfHeight = this._orthographicSize;
            const halfWidth = halfHeight * this._aspect;
            this._projectionMatrix = Matrix4x4.ortho(
                -halfWidth,
                halfWidth,
                -halfHeight,
                halfHeight,
                this._nearClipPlane,
                this._farClipPlane
            );
        }
        this._projectionDirty = false;
    }

    private _updateViewMatrix(): void {
        if (!this.transform) return;

        // View matrix is inverse of camera's world transform
        this._inverseViewMatrix = this.transform.localToWorldMatrix;
        this._viewMatrix = this._inverseViewMatrix.inverse;
    }

    private _updateFrustumPlanes(): void {
        const vp = this.viewProjectionMatrix;
        const m = vp.data;

        // Extract 6 frustum planes from the view-projection matrix
        // Left
        this._setPlane(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
        // Right
        this._setPlane(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
        // Bottom
        this._setPlane(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
        // Top
        this._setPlane(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
        // Near
        this._setPlane(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
        // Far
        this._setPlane(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
    }

    private _setPlane(index: number, a: number, b: number, c: number, d: number): void {
        const len = Math.sqrt(a * a + b * b + c * c);
        const offset = index * 4;
        this._frustumPlanes[offset] = a / len;
        this._frustumPlanes[offset + 1] = b / len;
        this._frustumPlanes[offset + 2] = c / len;
        this._frustumPlanes[offset + 3] = d / len;
    }

    /**
     * Get clear flags for the graphics device.
     * @internal
     */
    _getClearFlags(): ClearFlag {
        switch (this.clearFlags) {
            case CameraClearFlags.SOLID_COLOR:
            case CameraClearFlags.SKYBOX:
                return ClearFlag.ALL;
            case CameraClearFlags.DEPTH_ONLY:
                return ClearFlag.DEPTH | ClearFlag.STENCIL;
            case CameraClearFlags.NOTHING:
                return 0 as ClearFlag;
            default:
                return ClearFlag.ALL;
        }
    }
}
