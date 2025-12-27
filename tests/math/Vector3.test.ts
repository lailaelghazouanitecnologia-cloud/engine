/**
 * Vector3 Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from '../../src/math/Vector3';

describe('Vector3', () => {
    describe('Constructor', () => {
        it('should create zero vector by default', () => {
            const v = new Vector3();
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
            expect(v.z).toBe(0);
        });

        it('should create vector with given values', () => {
            const v = new Vector3(1, 2, 3);
            expect(v.x).toBe(1);
            expect(v.y).toBe(2);
            expect(v.z).toBe(3);
        });
    });

    describe('Static Properties', () => {
        it('should return correct zero vector', () => {
            const v = Vector3.zero;
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
            expect(v.z).toBe(0);
        });

        it('should return correct one vector', () => {
            const v = Vector3.one;
            expect(v.x).toBe(1);
            expect(v.y).toBe(1);
            expect(v.z).toBe(1);
        });

        it('should return correct up vector', () => {
            const v = Vector3.up;
            expect(v.x).toBe(0);
            expect(v.y).toBe(1);
            expect(v.z).toBe(0);
        });

        it('should return correct forward vector', () => {
            const v = Vector3.forward;
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
            expect(v.z).toBe(1);
        });

        it('should return correct right vector', () => {
            const v = Vector3.right;
            expect(v.x).toBe(1);
            expect(v.y).toBe(0);
            expect(v.z).toBe(0);
        });
    });

    describe('Instance Methods', () => {
        let v1: Vector3;
        let v2: Vector3;

        beforeEach(() => {
            v1 = new Vector3(1, 2, 3);
            v2 = new Vector3(4, 5, 6);
        });

        it('should calculate magnitude correctly', () => {
            const v = new Vector3(3, 4, 0);
            expect(v.magnitude).toBe(5);
        });

        it('should calculate sqrMagnitude correctly', () => {
            const v = new Vector3(3, 4, 0);
            expect(v.sqrMagnitude).toBe(25);
        });

        it('should normalize correctly', () => {
            const v = new Vector3(3, 0, 0);
            const normalized = v.normalized;
            expect(normalized.x).toBeCloseTo(1);
            expect(normalized.y).toBeCloseTo(0);
            expect(normalized.z).toBeCloseTo(0);
        });

        it('should add vectors correctly', () => {
            const result = v1.add(v2);
            expect(result.x).toBe(5);
            expect(result.y).toBe(7);
            expect(result.z).toBe(9);
        });

        it('should subtract vectors correctly', () => {
            const result = v2.subtract(v1);
            expect(result.x).toBe(3);
            expect(result.y).toBe(3);
            expect(result.z).toBe(3);
        });

        it('should scale correctly', () => {
            const result = v1.multiply(2);
            expect(result.x).toBe(2);
            expect(result.y).toBe(4);
            expect(result.z).toBe(6);
        });

        it('should clone correctly', () => {
            const clone = v1.clone();
            expect(clone.x).toBe(v1.x);
            expect(clone.y).toBe(v1.y);
            expect(clone.z).toBe(v1.z);
            expect(clone).not.toBe(v1);
        });

        it('should check equality correctly', () => {
            const v3 = new Vector3(1, 2, 3);
            expect(v1.equals(v3)).toBe(true);
            expect(v1.equals(v2)).toBe(false);
        });

        it('should set values correctly', () => {
            v1.set(10, 20, 30);
            expect(v1.x).toBe(10);
            expect(v1.y).toBe(20);
            expect(v1.z).toBe(30);
        });
    });

    describe('Static Methods', () => {
        it('should calculate dot product correctly', () => {
            const v1 = new Vector3(1, 2, 3);
            const v2 = new Vector3(4, 5, 6);
            expect(Vector3.dot(v1, v2)).toBe(32);
        });

        it('should calculate cross product correctly', () => {
            const v1 = new Vector3(1, 0, 0);
            const v2 = new Vector3(0, 1, 0);
            const result = Vector3.cross(v1, v2);
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(0);
            expect(result.z).toBeCloseTo(1);
        });

        it('should calculate distance correctly', () => {
            const v1 = new Vector3(0, 0, 0);
            const v2 = new Vector3(3, 4, 0);
            expect(Vector3.distance(v1, v2)).toBe(5);
        });

        it('should lerp correctly', () => {
            const v1 = new Vector3(0, 0, 0);
            const v2 = new Vector3(10, 10, 10);
            const result = Vector3.lerp(v1, v2, 0.5);
            expect(result.x).toBe(5);
            expect(result.y).toBe(5);
            expect(result.z).toBe(5);
        });

        it('should lerp clamp t to 0-1', () => {
            const v1 = new Vector3(0, 0, 0);
            const v2 = new Vector3(10, 10, 10);

            const resultNeg = Vector3.lerp(v1, v2, -0.5);
            expect(resultNeg.x).toBe(0);

            const resultOver = Vector3.lerp(v1, v2, 1.5);
            expect(resultOver.x).toBe(10);
        });

        it('should project correctly', () => {
            const v = new Vector3(3, 4, 0);
            const onto = new Vector3(1, 0, 0);
            const result = Vector3.project(v, onto);
            expect(result.x).toBeCloseTo(3);
            expect(result.y).toBeCloseTo(0);
            expect(result.z).toBeCloseTo(0);
        });

        it('should reflect correctly', () => {
            const v = new Vector3(1, -1, 0);
            const normal = new Vector3(0, 1, 0);
            const result = Vector3.reflect(v, normal);
            expect(result.x).toBeCloseTo(1);
            expect(result.y).toBeCloseTo(1);
            expect(result.z).toBeCloseTo(0);
        });

        it('should calculate angle correctly', () => {
            const v1 = new Vector3(1, 0, 0);
            const v2 = new Vector3(0, 1, 0);
            const angle = Vector3.angle(v1, v2);
            expect(angle).toBeCloseTo(90);
        });
    });
});
