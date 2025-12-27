/**
 * WasmBridge Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WasmBridge } from '../../src/wasm/WasmBridge';

describe('WasmBridge', () => {
    describe('Singleton', () => {
        it('should return the same instance', () => {
            const instance1 = WasmBridge.instance;
            const instance2 = WasmBridge.instance;
            expect(instance1).toBe(instance2);
        });
    });

    describe('Fallback Mode', () => {
        it('should use fallback when WASM not available', async () => {
            // Mock fetch to fail
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            try {
                const bridge = await WasmBridge.init('/nonexistent.wasm');
                expect(bridge.isReady).toBe(true);
                expect(bridge.usingFallback).toBe(true);
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe('Math Fallback Operations', () => {
        let bridge: WasmBridge;

        beforeEach(async () => {
            // Force fallback mode for testing
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            bridge = await WasmBridge.init('/test.wasm');

            global.fetch = originalFetch;
        });

        describe('Vector3 Operations', () => {
            it('should add vectors correctly', () => {
                const result = bridge.module.math.vec3_add(1, 2, 3, 4, 5, 6);
                expect(result[0]).toBe(5);
                expect(result[1]).toBe(7);
                expect(result[2]).toBe(9);
            });

            it('should subtract vectors correctly', () => {
                const result = bridge.module.math.vec3_sub(4, 5, 6, 1, 2, 3);
                expect(result[0]).toBe(3);
                expect(result[1]).toBe(3);
                expect(result[2]).toBe(3);
            });

            it('should scale vector correctly', () => {
                const result = bridge.module.math.vec3_scale(1, 2, 3, 2);
                expect(result[0]).toBe(2);
                expect(result[1]).toBe(4);
                expect(result[2]).toBe(6);
            });

            it('should calculate dot product correctly', () => {
                const result = bridge.module.math.vec3_dot(1, 0, 0, 0, 1, 0);
                expect(result).toBe(0);

                const result2 = bridge.module.math.vec3_dot(1, 2, 3, 4, 5, 6);
                expect(result2).toBe(32);
            });

            it('should calculate cross product correctly', () => {
                const result = bridge.module.math.vec3_cross(1, 0, 0, 0, 1, 0);
                expect(result[0]).toBeCloseTo(0);
                expect(result[1]).toBeCloseTo(0);
                expect(result[2]).toBeCloseTo(1);
            });

            it('should normalize vector correctly', () => {
                const result = bridge.module.math.vec3_normalize(3, 0, 0);
                expect(result[0]).toBeCloseTo(1);
                expect(result[1]).toBeCloseTo(0);
                expect(result[2]).toBeCloseTo(0);
            });

            it('should calculate length correctly', () => {
                const result = bridge.module.math.vec3_length(3, 4, 0);
                expect(result).toBe(5);
            });

            it('should lerp correctly', () => {
                const result = bridge.module.math.vec3_lerp(0, 0, 0, 10, 10, 10, 0.5);
                expect(result[0]).toBe(5);
                expect(result[1]).toBe(5);
                expect(result[2]).toBe(5);
            });
        });

        describe('Quaternion Operations', () => {
            it('should normalize quaternion correctly', () => {
                const result = bridge.module.math.quat_normalize(0, 0, 0, 2);
                const length = Math.sqrt(
                    result[0] ** 2 + result[1] ** 2 + result[2] ** 2 + result[3] ** 2
                );
                expect(length).toBeCloseTo(1);
            });

            it('should calculate inverse correctly', () => {
                const result = bridge.module.math.quat_inverse(0, 0, 0, 1);
                expect(result[0]).toBeCloseTo(0);
                expect(result[1]).toBeCloseTo(0);
                expect(result[2]).toBeCloseTo(0);
                expect(result[3]).toBeCloseTo(1);
            });

            it('should slerp at t=0 correctly', () => {
                const result = bridge.module.math.quat_slerp(
                    0, 0, 0, 1,
                    0.707, 0, 0, 0.707,
                    0
                );
                expect(result[0]).toBeCloseTo(0);
                expect(result[3]).toBeCloseTo(1);
            });

            it('should slerp at t=1 correctly', () => {
                const result = bridge.module.math.quat_slerp(
                    0, 0, 0, 1,
                    0.707, 0, 0, 0.707,
                    1
                );
                expect(result[0]).toBeCloseTo(0.707, 2);
                expect(result[3]).toBeCloseTo(0.707, 2);
            });
        });

        describe('Matrix4 Operations', () => {
            it('should multiply with identity correctly', () => {
                const identity = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                ]);
                const result = bridge.module.math.mat4_multiply(identity, identity);
                expect(result[0]).toBe(1);
                expect(result[5]).toBe(1);
                expect(result[10]).toBe(1);
                expect(result[15]).toBe(1);
            });

            it('should transpose correctly', () => {
                const m = new Float32Array([
                    1, 2, 3, 4,
                    5, 6, 7, 8,
                    9, 10, 11, 12,
                    13, 14, 15, 16
                ]);
                const result = bridge.module.math.mat4_transpose(m);
                expect(result[1]).toBe(5);
                expect(result[4]).toBe(2);
            });

            it('should create TRS matrix', () => {
                const result = bridge.module.math.mat4_trs(
                    10, 20, 30, // translation
                    0, 0, 0, 1, // rotation (identity)
                    1, 1, 1 // scale
                );
                expect(result[12]).toBe(10);
                expect(result[13]).toBe(20);
                expect(result[14]).toBe(30);
            });

            it('should create perspective matrix', () => {
                const result = bridge.module.math.mat4_perspective(
                    Math.PI / 4, // 45 degrees FOV
                    16 / 9, // aspect
                    0.1, // near
                    1000 // far
                );
                expect(result[15]).toBe(0);
                expect(result[11]).toBe(-1);
            });

            it('should transform point correctly', () => {
                const translate = bridge.module.math.mat4_trs(
                    10, 0, 0,
                    0, 0, 0, 1,
                    1, 1, 1
                );
                const result = bridge.module.math.mat4_transform_point(translate, 5, 0, 0);
                expect(result[0]).toBeCloseTo(15);
            });
        });

        describe('Batch Operations', () => {
            it('should batch transform points', () => {
                const identity = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    10, 0, 0, 1 // translation
                ]);
                const points = new Float32Array([
                    1, 2, 3,
                    4, 5, 6
                ]);
                const result = bridge.module.math.batch_transform_points(identity, points);
                expect(result.length).toBe(6);
            });
        });
    });

    describe('Culling Fallback', () => {
        let bridge: WasmBridge;

        beforeEach(async () => {
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            bridge = await WasmBridge.init('/test.wasm');
            global.fetch = originalFetch;
        });

        it('should return all visible in fallback mode', () => {
            const frustum = new Float32Array(24); // 6 planes
            const aabbs = new Float32Array(12); // 2 AABBs (min/max pairs)
            const result = bridge.module.culling.frustum_cull_aabbs(frustum, aabbs);
            expect(result.length).toBe(2);
        });
    });
});
