/**
 * Camera Component Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Camera, CameraProjection, CameraClearFlags } from '../../src/components/Camera';
import { GameObject } from '../../src/core/GameObject';
import { Vector3 } from '../../src/math/Vector3';
import { Color } from '../../src/math/Color';

describe('Camera', () => {
    let gameObject: GameObject;
    let camera: Camera;

    beforeEach(() => {
        gameObject = new GameObject('Camera');
        camera = gameObject.addComponent(Camera);
    });

    describe('Constructor', () => {
        it('should have default perspective projection', () => {
            expect(camera.projection).toBe(CameraProjection.PERSPECTIVE);
        });

        it('should have default field of view of 60', () => {
            expect(camera.fieldOfView).toBe(60);
        });

        it('should have default near clip plane of 0.1', () => {
            expect(camera.nearClipPlane).toBe(0.1);
        });

        it('should have default far clip plane of 1000', () => {
            expect(camera.farClipPlane).toBe(1000);
        });

        it('should have solid color clear flags by default', () => {
            expect(camera.clearFlags).toBe(CameraClearFlags.SOLID_COLOR);
        });

        it('should have default background color', () => {
            expect(camera.backgroundColor).toBeDefined();
        });
    });

    describe('Properties', () => {
        it('should clamp field of view between 1 and 179', () => {
            camera.fieldOfView = 0;
            expect(camera.fieldOfView).toBe(1);

            camera.fieldOfView = 200;
            expect(camera.fieldOfView).toBe(179);

            camera.fieldOfView = 90;
            expect(camera.fieldOfView).toBe(90);
        });

        it('should clamp near clip plane to minimum 0.001', () => {
            camera.nearClipPlane = 0;
            expect(camera.nearClipPlane).toBe(0.001);

            camera.nearClipPlane = 0.5;
            expect(camera.nearClipPlane).toBe(0.5);
        });

        it('should set orthographic size with minimum 0.01', () => {
            camera.orthographicSize = 0;
            expect(camera.orthographicSize).toBe(0.01);

            camera.orthographicSize = 10;
            expect(camera.orthographicSize).toBe(10);
        });

        it('should set aspect ratio', () => {
            camera.aspect = 1.5;
            expect(camera.aspect).toBe(1.5);
        });

        it('should set projection type', () => {
            camera.projection = CameraProjection.ORTHOGRAPHIC;
            expect(camera.projection).toBe(CameraProjection.ORTHOGRAPHIC);
        });

        it('should set viewport rect', () => {
            camera.rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
            const rect = camera.rect;
            expect(rect.x).toBe(0.25);
            expect(rect.y).toBe(0.25);
            expect(rect.width).toBe(0.5);
            expect(rect.height).toBe(0.5);
        });
    });

    describe('Matrices', () => {
        it('should return projection matrix', () => {
            const projMatrix = camera.projectionMatrix;
            expect(projMatrix).toBeDefined();
            expect(projMatrix.data).toBeDefined();
            expect(projMatrix.data.length).toBe(16);
        });

        it('should return view matrix', () => {
            const viewMatrix = camera.viewMatrix;
            expect(viewMatrix).toBeDefined();
            expect(viewMatrix.data).toBeDefined();
            expect(viewMatrix.data.length).toBe(16);
        });

        it('should return view-projection matrix', () => {
            const vpMatrix = camera.viewProjectionMatrix;
            expect(vpMatrix).toBeDefined();
            expect(vpMatrix.data).toBeDefined();
            expect(vpMatrix.data.length).toBe(16);
        });

        it('should update projection matrix when settings change', () => {
            const matrix1 = camera.projectionMatrix;
            camera.fieldOfView = 90;
            const matrix2 = camera.projectionMatrix;

            // Matrices should be different
            let different = false;
            for (let i = 0; i < 16; i++) {
                if (Math.abs(matrix1.data[i] - matrix2.data[i]) > 0.0001) {
                    different = true;
                    break;
                }
            }
            expect(different).toBe(true);
        });
    });

    describe('Coordinate Conversion', () => {
        it('should convert world point to viewport point', () => {
            const worldPoint = new Vector3(0, 0, -10);
            const viewportPoint = camera.worldToViewportPoint(worldPoint);

            expect(viewportPoint).toBeDefined();
            // Center of screen should be around 0.5, 0.5
            expect(viewportPoint.x).toBeCloseTo(0.5, 1);
            expect(viewportPoint.y).toBeCloseTo(0.5, 1);
        });

        it('should convert world point to screen point', () => {
            const worldPoint = new Vector3(0, 0, -10);
            const screenPoint = camera.worldToScreenPoint(worldPoint, 800, 600);

            expect(screenPoint).toBeDefined();
            // Center should be around 400, 300
            expect(screenPoint.x).toBeCloseTo(400, 0);
            expect(screenPoint.y).toBeCloseTo(300, 0);
        });

        it('should create ray from screen point', () => {
            const screenPoint = new Vector3(400, 300, 0);
            const ray = camera.screenPointToRay(screenPoint, 800, 600);

            expect(ray).toBeDefined();
            expect(ray.origin).toBeDefined();
            expect(ray.direction).toBeDefined();
        });
    });

    describe('Frustum Culling', () => {
        it('should return true for visible sphere', () => {
            const center = new Vector3(0, 0, -10);
            const radius = 1;

            expect(camera.isSphereVisible(center, radius)).toBe(true);
        });

        it('should return false for sphere behind camera', () => {
            const center = new Vector3(0, 0, 10);
            const radius = 1;

            expect(camera.isSphereVisible(center, radius)).toBe(false);
        });

        it('should return true for visible box', () => {
            const min = new Vector3(-1, -1, -11);
            const max = new Vector3(1, 1, -9);

            expect(camera.isBoxVisible(min, max)).toBe(true);
        });

        it('should return false for box behind camera', () => {
            const min = new Vector3(-1, -1, 9);
            const max = new Vector3(1, 1, 11);

            expect(camera.isBoxVisible(min, max)).toBe(false);
        });
    });
});
