/**
 * Forward Renderer - renders the scene using forward rendering technique.
 * Iterates through each object and applies all lights in a single pass.
 */

import { GraphicsDevice } from '../graphics/GraphicsDevice';
import { CullFace, BlendMode } from '../graphics/constants';
import type { Camera } from '../components/Camera';
import type { Light } from '../components/Light';
import type { MeshRenderer } from '../components/MeshRenderer';
import type { Material } from '../graphics/Material';
import { Color } from '../math/Color';
import { Vector3 } from '../math/Vector3';
import { Matrix4x4 } from '../math/Matrix4x4';

export interface RenderSettings {
    /** Ambient light color */
    ambientLight: Color;
    /** Fog enabled */
    fogEnabled: boolean;
    /** Fog color */
    fogColor: Color;
    /** Fog start distance */
    fogStart: number;
    /** Fog end distance */
    fogEnd: number;
    /** Maximum lights per object */
    maxLightsPerObject: number;
}

export interface RenderStats {
    drawCalls: number;
    triangles: number;
    vertices: number;
    visibleObjects: number;
    culledObjects: number;
    activeLights: number;
    frameTime: number;
}

interface RenderItem {
    renderer: MeshRenderer;
    distance: number;
    sortKey: number;
}

/**
 * Forward Renderer implementation.
 *
 * @example
 * const renderer = new ForwardRenderer(device);
 *
 * // In game loop
 * renderer.render(cameras, lights, meshRenderers);
 */
export class ForwardRenderer {
    private _device: GraphicsDevice;
    private _settings: RenderSettings;
    private _stats: RenderStats;

    // Light data for shader
    private _lightDataBuffer: Float32Array;
    private _maxLights: number = 8;

    // Sorting
    private _opaqueQueue: RenderItem[] = [];
    private _transparentQueue: RenderItem[] = [];

    // Cached matrices
    private _viewMatrix: Matrix4x4 = Matrix4x4.identity;
    private _projectionMatrix: Matrix4x4 = Matrix4x4.identity;

    constructor(device: GraphicsDevice, settings?: Partial<RenderSettings>) {
        this._device = device;
        this._settings = {
            ambientLight: new Color(0.1, 0.1, 0.1, 1),
            fogEnabled: false,
            fogColor: new Color(0.5, 0.5, 0.5, 1),
            fogStart: 10,
            fogEnd: 100,
            maxLightsPerObject: 4,
            ...settings
        };

        this._stats = {
            drawCalls: 0,
            triangles: 0,
            vertices: 0,
            visibleObjects: 0,
            culledObjects: 0,
            activeLights: 0,
            frameTime: 0
        };

        // Pre-allocate light data buffer (16 floats per light)
        this._lightDataBuffer = new Float32Array(this._maxLights * 16);
    }

    /** Get current render settings */
    get settings(): RenderSettings {
        return this._settings;
    }

    /** Get render statistics from last frame */
    get stats(): RenderStats {
        return { ...this._stats };
    }

    /**
     * Render the scene.
     * @param cameras - Active cameras to render from
     * @param lights - Active lights in the scene
     * @param renderers - MeshRenderers to render
     */
    render(cameras: Camera[], lights: Light[], renderers: MeshRenderer[]): void {
        const startTime = performance.now();

        // Reset stats
        this._stats.drawCalls = 0;
        this._stats.triangles = 0;
        this._stats.vertices = 0;
        this._stats.visibleObjects = 0;
        this._stats.culledObjects = 0;
        this._stats.activeLights = lights.length;

        // Sort cameras by priority
        const sortedCameras = [...cameras].sort((a, b) => a.priority - b.priority);

        // Render from each camera
        for (const camera of sortedCameras) {
            this._renderCamera(camera, lights, renderers);
        }

        this._stats.frameTime = performance.now() - startTime;
    }

    private _renderCamera(camera: Camera, lights: Light[], renderers: MeshRenderer[]): void {
        const gl = this._device.gl;
        if (!gl) return;

        // Set render target
        if (camera.renderTarget) {
            this._device.setRenderTarget(camera.renderTarget);
        } else {
            this._device.setRenderTarget(null);
        }

        // Get canvas dimensions
        const canvas = this._device.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Set viewport from camera rect
        const rect = camera.rect;
        const vpX = Math.floor(rect.x * width);
        const vpY = Math.floor(rect.y * height);
        const vpWidth = Math.floor(rect.width * width);
        const vpHeight = Math.floor(rect.height * height);
        gl.viewport(vpX, vpY, vpWidth, vpHeight);
        gl.scissor(vpX, vpY, vpWidth, vpHeight);
        gl.enable(gl.SCISSOR_TEST);

        // Update camera aspect ratio
        camera.aspect = vpWidth / vpHeight;

        // Clear
        const clearFlags = camera._getClearFlags();
        if (clearFlags) {
            const bg = camera.backgroundColor;
            this._device.clear(bg, 1, 0);
        }

        // Get camera matrices
        this._viewMatrix = camera.viewMatrix;
        this._projectionMatrix = camera.projectionMatrix;

        // Prepare light data
        this._prepareLightData(lights, camera);

        // Cull and sort renderers
        this._cullAndSort(renderers, camera);

        // Render opaque objects (front to back)
        this._device.setDepthState({ write: true, test: true });
        this._device.setBlendState({ enabled: false });
        this._device.setCullFace(CullFace.BACK);

        for (const item of this._opaqueQueue) {
            this._renderItem(item.renderer, lights);
        }

        // Render transparent objects (back to front)
        this._device.setDepthState({ write: false, test: true });
        this._device.setBlendState({
            enabled: true,
            srcRgb: BlendMode.SRC_ALPHA,
            dstRgb: BlendMode.ONE_MINUS_SRC_ALPHA,
        });

        for (const item of this._transparentQueue) {
            this._renderItem(item.renderer, lights);
        }

        gl.disable(gl.SCISSOR_TEST);
    }

    private _prepareLightData(lights: Light[], _camera: Camera): void {
        // Sort lights by importance (distance to camera, type priority)
        const sortedLights = [...lights]
            .filter(l => l.enabled && l.gameObject?.activeSelf)
            .sort((a, b) => {
                // Directional lights first
                if (a.type !== b.type) {
                    return a.type - b.type;
                }
                // Then by intensity
                return b.intensity - a.intensity;
            })
            .slice(0, this._maxLights);

        // Pack light data
        for (let i = 0; i < this._maxLights; i++) {
            const offset = i * 16;
            if (i < sortedLights.length) {
                const lightData = sortedLights[i].getShaderData();
                this._lightDataBuffer.set(lightData, offset);
            } else {
                // Disable unused light slots
                this._lightDataBuffer[offset + 11] = 0; // intensity = 0
            }
        }
    }

    private _cullAndSort(renderers: MeshRenderer[], camera: Camera): void {
        this._opaqueQueue.length = 0;
        this._transparentQueue.length = 0;

        const cameraPos = camera.transform?.position ?? Vector3.zero;
        const frustumPlanes = camera['_frustumPlanes'] as Float32Array;

        for (const renderer of renderers) {
            if (!renderer.enabled || !renderer.gameObject?.activeSelf || !renderer.mesh) {
                continue;
            }

            // Frustum culling
            if (!renderer.isVisibleFrom(cameraPos, frustumPlanes)) {
                this._stats.culledObjects++;
                continue;
            }

            this._stats.visibleObjects++;

            // Calculate distance for sorting
            const bounds = renderer.worldBoundingSphere;
            const dx = bounds.center.x - cameraPos.x;
            const dy = bounds.center.y - cameraPos.y;
            const dz = bounds.center.z - cameraPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Create sort key (material ID + sorting order)
            const material = renderer.material;
            const materialId = material ? (material as unknown as { _id?: number })._id ?? 0 : 0;
            const sortKey = (renderer.sortingOrder << 16) | (materialId & 0xFFFF);

            const item: RenderItem = { renderer, distance, sortKey };

            // Check if transparent
            if (this._isTransparent(material)) {
                this._transparentQueue.push(item);
            } else {
                this._opaqueQueue.push(item);
            }
        }

        // Sort opaque: by material, then front-to-back
        this._opaqueQueue.sort((a, b) => {
            if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
            return a.distance - b.distance;
        });

        // Sort transparent: back-to-front
        this._transparentQueue.sort((a, b) => b.distance - a.distance);
    }

    private _isTransparent(material: Material | null): boolean {
        if (!material) return false;
        const opacity = material.getFloat('_Opacity') ?? 1;
        return opacity < 1;
    }

    private _renderItem(renderer: MeshRenderer, lights: Light[]): void {
        const mesh = renderer.mesh;
        if (!mesh) return;

        const worldMatrix = renderer.transform?.localToWorldMatrix ?? Matrix4x4.identity;

        // Set common uniforms for all materials
        for (let i = 0; i < mesh.subMeshCount; i++) {
            const material = renderer.getMaterial(i);
            if (!material) continue;

            // Transform matrices
            material.setMatrix('_ModelMatrix', worldMatrix.data);
            material.setMatrix('_ViewMatrix', this._viewMatrix.data);
            material.setMatrix('_ProjectionMatrix', this._projectionMatrix.data);

            // Combined matrices
            const mv = this._viewMatrix.multiply(worldMatrix);
            const mvp = this._projectionMatrix.multiply(mv);
            material.setMatrix('_ModelViewMatrix', mv.data);
            material.setMatrix('_ModelViewProjectionMatrix', mvp.data);

            // Normal matrix
            const normalMatrix = mv.inverse.transpose;
            material.setMatrix('_NormalMatrix', new Float32Array([
                normalMatrix.data[0], normalMatrix.data[1], normalMatrix.data[2],
                normalMatrix.data[4], normalMatrix.data[5], normalMatrix.data[6],
                normalMatrix.data[8], normalMatrix.data[9], normalMatrix.data[10]
            ]));

            // Lighting
            material.setVector('_AmbientLight', [
                this._settings.ambientLight.r,
                this._settings.ambientLight.g,
                this._settings.ambientLight.b,
                this._settings.ambientLight.a
            ]);

            // Pass light data as individual uniforms (for simplicity)
            for (let l = 0; l < Math.min(lights.length, this._settings.maxLightsPerObject); l++) {
                const offset = l * 16;
                material.setVector(`_Light${l}_PosType`, Array.from(this._lightDataBuffer.subarray(offset, offset + 4)));
                material.setVector(`_Light${l}_DirRange`, Array.from(this._lightDataBuffer.subarray(offset + 4, offset + 8)));
                material.setVector(`_Light${l}_ColorIntensity`, Array.from(this._lightDataBuffer.subarray(offset + 8, offset + 12)));
                material.setVector(`_Light${l}_SpotShadow`, Array.from(this._lightDataBuffer.subarray(offset + 12, offset + 16)));
            }
            material.setFloat('_LightCount', Math.min(lights.length, this._settings.maxLightsPerObject));

            // Fog
            if (this._settings.fogEnabled) {
                material.setFloat('_FogEnabled', 1);
                material.setVector('_FogColor', [
                    this._settings.fogColor.r,
                    this._settings.fogColor.g,
                    this._settings.fogColor.b,
                    this._settings.fogColor.a
                ]);
                material.setFloat('_FogStart', this._settings.fogStart);
                material.setFloat('_FogEnd', this._settings.fogEnd);
            } else {
                material.setFloat('_FogEnabled', 0);
            }

            // Apply material (binds shader and sets uniforms)
            material.apply();
        }

        // Render mesh
        renderer._render(worldMatrix, this._viewMatrix, this._projectionMatrix);

        // Update stats
        this._stats.drawCalls += mesh.subMeshCount;
        // Approximate triangle/vertex counts
        const vCount = mesh.vertexCount;
        this._stats.vertices += vCount;
        this._stats.triangles += Math.floor(vCount / 3);
    }

    /**
     * Resize the renderer for a new canvas size.
     */
    resize(_width: number, _height: number): void {
        // The GraphicsDevice handles canvas resizing
        // This method is for any renderer-specific resize logic
    }

    /**
     * Dispose the renderer and release resources.
     */
    dispose(): void {
        this._lightDataBuffer = new Float32Array(0);
        this._opaqueQueue.length = 0;
        this._transparentQueue.length = 0;
    }
}
