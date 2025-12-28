/**
 * Light Component Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Light, LightType, LightShadows } from '../../src/components/Light';
import { GameObject } from '../../src/core/GameObject';
import { Color } from '../../src/math/Color';
import { Vector3 } from '../../src/math/Vector3';

describe('Light', () => {
    let gameObject: GameObject;
    let light: Light;

    beforeEach(() => {
        gameObject = new GameObject('Light');
        light = gameObject.addComponent(Light);
    });

    describe('Constructor', () => {
        it('should have default directional type', () => {
            expect(light.type).toBe(LightType.DIRECTIONAL);
        });

        it('should have default white color', () => {
            expect(light.color.r).toBe(1);
            expect(light.color.g).toBe(1);
            expect(light.color.b).toBe(1);
        });

        it('should have default intensity of 1', () => {
            expect(light.intensity).toBe(1);
        });

        it('should have default range of 10', () => {
            expect(light.range).toBe(10);
        });

        it('should have no shadows by default', () => {
            expect(light.shadows).toBe(LightShadows.NONE);
        });
    });

    describe('Properties', () => {
        it('should clamp intensity to minimum 0', () => {
            light.intensity = -5;
            expect(light.intensity).toBe(0);

            light.intensity = 2.5;
            expect(light.intensity).toBe(2.5);
        });

        it('should clamp range to minimum 0.01', () => {
            light.range = 0;
            expect(light.range).toBe(0.01);

            light.range = 20;
            expect(light.range).toBe(20);
        });

        it('should clamp spot angle between 1 and 179', () => {
            light.spotAngle = 0;
            expect(light.spotAngle).toBe(1);

            light.spotAngle = 200;
            expect(light.spotAngle).toBe(179);

            light.spotAngle = 60;
            expect(light.spotAngle).toBe(60);
        });

        it('should clamp inner spot angle to outer spot angle', () => {
            light.spotAngle = 45;
            light.innerSpotAngle = 60;
            expect(light.innerSpotAngle).toBe(45);
        });

        it('should clamp shadow strength between 0 and 1', () => {
            light.shadowStrength = -1;
            expect(light.shadowStrength).toBe(0);

            light.shadowStrength = 2;
            expect(light.shadowStrength).toBe(1);

            light.shadowStrength = 0.75;
            expect(light.shadowStrength).toBe(0.75);
        });

        it('should clamp shadow resolution between 64 and 4096', () => {
            light.shadowResolution = 16;
            expect(light.shadowResolution).toBe(64);

            light.shadowResolution = 8192;
            expect(light.shadowResolution).toBe(4096);

            light.shadowResolution = 1024;
            expect(light.shadowResolution).toBe(1024);
        });

        it('should set light type', () => {
            light.type = LightType.POINT;
            expect(light.type).toBe(LightType.POINT);

            light.type = LightType.SPOT;
            expect(light.type).toBe(LightType.SPOT);
        });

        it('should set shadow mode', () => {
            light.shadows = LightShadows.HARD;
            expect(light.shadows).toBe(LightShadows.HARD);
            expect(light.castsShadows).toBe(true);
        });
    });

    describe('Computed Properties', () => {
        it('should return direction from transform', () => {
            const direction = light.direction;
            expect(direction).toBeDefined();
            // Default forward direction
            expect(direction.z).toBe(1);
        });

        it('should return position from transform', () => {
            gameObject.transform.position = new Vector3(5, 10, 15);
            const position = light.position;
            expect(position.x).toBe(5);
            expect(position.y).toBe(10);
            expect(position.z).toBe(15);
        });

        it('should return final color with intensity', () => {
            light.color = new Color(1, 0.5, 0.25, 1);
            light.intensity = 2;

            const finalColor = light.finalColor;
            expect(finalColor.r).toBe(2);
            expect(finalColor.g).toBe(1);
            expect(finalColor.b).toBe(0.5);
        });

        it('should report if casts shadows', () => {
            expect(light.castsShadows).toBe(false);

            light.shadows = LightShadows.HARD;
            expect(light.castsShadows).toBe(true);

            light.shadows = LightShadows.SOFT;
            expect(light.castsShadows).toBe(true);

            light.shadows = LightShadows.NONE;
            expect(light.castsShadows).toBe(false);
        });
    });

    describe('Attenuation', () => {
        it('should return 1 for directional light', () => {
            light.type = LightType.DIRECTIONAL;
            expect(light.getAttenuation(0)).toBe(1);
            expect(light.getAttenuation(100)).toBe(1);
            expect(light.getAttenuation(1000)).toBe(1);
        });

        it('should return 0 for distance beyond range', () => {
            light.type = LightType.POINT;
            light.range = 10;

            expect(light.getAttenuation(10)).toBe(0);
            expect(light.getAttenuation(15)).toBe(0);
        });

        it('should return higher value for closer distance', () => {
            light.type = LightType.POINT;
            light.range = 10;

            const nearAttenuation = light.getAttenuation(2);
            const farAttenuation = light.getAttenuation(8);

            expect(nearAttenuation).toBeGreaterThan(farAttenuation);
        });

        it('should return 1 at zero distance for point light', () => {
            light.type = LightType.POINT;
            light.range = 10;

            expect(light.getAttenuation(0)).toBe(1);
        });
    });

    describe('Spot Attenuation', () => {
        it('should return 1 for non-spot lights', () => {
            light.type = LightType.DIRECTIONAL;
            expect(light.getSpotAttenuation(0.5)).toBe(1);

            light.type = LightType.POINT;
            expect(light.getSpotAttenuation(0.5)).toBe(1);
        });

        it('should return 0 for angles outside outer cone', () => {
            light.type = LightType.SPOT;
            light.spotAngle = 45;
            light.innerSpotAngle = 30;

            const outerCos = Math.cos((45 * 0.5) * Math.PI / 180);
            expect(light.getSpotAttenuation(outerCos - 0.1)).toBe(0);
        });

        it('should return 1 for angles inside inner cone', () => {
            light.type = LightType.SPOT;
            light.spotAngle = 45;
            light.innerSpotAngle = 30;

            const innerCos = Math.cos((30 * 0.5) * Math.PI / 180);
            expect(light.getSpotAttenuation(innerCos + 0.01)).toBe(1);
        });
    });

    describe('Shadow Matrices', () => {
        it('should return shadow view matrix', () => {
            const matrix = light.getShadowViewMatrix();
            expect(matrix).toBeDefined();
            expect(matrix.data).toBeDefined();
            expect(matrix.data.length).toBe(16);
        });

        it('should return shadow projection matrix for directional light', () => {
            light.type = LightType.DIRECTIONAL;
            const matrix = light.getShadowProjectionMatrix(50);
            expect(matrix).toBeDefined();
        });

        it('should return shadow projection matrix for spot light', () => {
            light.type = LightType.SPOT;
            light.spotAngle = 60;
            const matrix = light.getShadowProjectionMatrix();
            expect(matrix).toBeDefined();
        });

        it('should return shadow projection matrix for point light', () => {
            light.type = LightType.POINT;
            const matrix = light.getShadowProjectionMatrix();
            expect(matrix).toBeDefined();
        });
    });

    describe('Shader Data', () => {
        it('should return packed shader data', () => {
            light.type = LightType.POINT;
            light.color = new Color(1, 0.5, 0.25, 1);
            light.intensity = 2;
            light.range = 15;
            gameObject.transform.position = new Vector3(1, 2, 3);

            const data = light.getShaderData();

            expect(data).toBeInstanceOf(Float32Array);
            expect(data.length).toBe(16);

            // Position (xyz) + type (w)
            expect(data[0]).toBe(1);
            expect(data[1]).toBe(2);
            expect(data[2]).toBe(3);
            expect(data[3]).toBe(LightType.POINT);

            // Range
            expect(data[7]).toBe(15);

            // Color
            expect(data[8]).toBe(1);
            expect(data[9]).toBe(0.5);
            expect(data[10]).toBe(0.25);

            // Intensity
            expect(data[11]).toBe(2);
        });
    });
});
