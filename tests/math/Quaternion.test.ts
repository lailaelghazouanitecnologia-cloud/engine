/**
 * Quaternion Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quaternion } from '../../src/math/Quaternion';
import { Vector3 } from '../../src/math/Vector3';

describe('Quaternion', () => {
    describe('Constructor', () => {
        it('should create identity quaternion by default', () => {
            const q = new Quaternion();
            expect(q.x).toBe(0);
            expect(q.y).toBe(0);
            expect(q.z).toBe(0);
            expect(q.w).toBe(1);
        });

        it('should create quaternion with given values', () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.x).toBe(1);
            expect(q.y).toBe(2);
            expect(q.z).toBe(3);
            expect(q.w).toBe(4);
        });
    });

    describe('Static Properties', () => {
        it('should return correct identity quaternion', () => {
            const q = Quaternion.identity;
            expect(q.x).toBe(0);
            expect(q.y).toBe(0);
            expect(q.z).toBe(0);
            expect(q.w).toBe(1);
        });
    });

    describe('Euler Conversion', () => {
        it('should convert euler angles to quaternion and back', () => {
            const euler = new Vector3(30, 45, 60);
            const q = Quaternion.euler(euler.x, euler.y, euler.z);
            const backToEuler = q.eulerAngles;

            // Allow some floating point tolerance
            expect(backToEuler.x).toBeCloseTo(euler.x, 0);
            expect(backToEuler.y).toBeCloseTo(euler.y, 0);
            expect(backToEuler.z).toBeCloseTo(euler.z, 0);
        });

        it('should handle zero rotation', () => {
            const q = Quaternion.euler(0, 0, 0);
            expect(q.x).toBeCloseTo(0);
            expect(q.y).toBeCloseTo(0);
            expect(q.z).toBeCloseTo(0);
            expect(q.w).toBeCloseTo(1);
        });
    });

    describe('Instance Methods', () => {
        let q: Quaternion;

        beforeEach(() => {
            q = Quaternion.euler(0, 90, 0);
        });

        it('should normalize correctly', () => {
            const unnormalized = new Quaternion(1, 2, 3, 4);
            const normalized = unnormalized.normalized;
            const magnitude = Math.sqrt(
                normalized.x ** 2 +
                normalized.y ** 2 +
                normalized.z ** 2 +
                normalized.w ** 2
            );
            expect(magnitude).toBeCloseTo(1);
        });

        it('should calculate inverse correctly', () => {
            const inverse = q.inverse;
            const result = Quaternion.multiply(q, inverse);

            // Result should be identity
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(0);
            expect(result.z).toBeCloseTo(0);
            expect(result.w).toBeCloseTo(1);
        });

        it('should clone correctly', () => {
            const clone = q.clone();
            expect(clone.x).toBe(q.x);
            expect(clone.y).toBe(q.y);
            expect(clone.z).toBe(q.z);
            expect(clone.w).toBe(q.w);
            expect(clone).not.toBe(q);
        });
    });

    describe('Static Methods', () => {
        it('should multiply quaternions correctly', () => {
            const q1 = Quaternion.euler(90, 0, 0);
            const q2 = Quaternion.euler(0, 90, 0);
            const result = Quaternion.multiply(q1, q2);

            // Result should be normalized
            const magnitude = Math.sqrt(
                result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2
            );
            expect(magnitude).toBeCloseTo(1);
        });

        it('should slerp correctly at t=0', () => {
            const q1 = Quaternion.identity;
            const q2 = Quaternion.euler(0, 90, 0);
            const result = Quaternion.slerp(q1, q2, 0);

            expect(result.x).toBeCloseTo(q1.x);
            expect(result.y).toBeCloseTo(q1.y);
            expect(result.z).toBeCloseTo(q1.z);
            expect(result.w).toBeCloseTo(q1.w);
        });

        it('should slerp correctly at t=1', () => {
            const q1 = Quaternion.identity;
            const q2 = Quaternion.euler(0, 90, 0);
            const result = Quaternion.slerp(q1, q2, 1);

            expect(result.x).toBeCloseTo(q2.x);
            expect(result.y).toBeCloseTo(q2.y);
            expect(result.z).toBeCloseTo(q2.z);
            expect(result.w).toBeCloseTo(q2.w);
        });

        it('should slerp correctly at t=0.5', () => {
            const q1 = Quaternion.identity;
            const q2 = Quaternion.euler(0, 90, 0);
            const result = Quaternion.slerp(q1, q2, 0.5);

            // At t=0.5, should be halfway rotation (45 degrees)
            const euler = result.eulerAngles;
            expect(euler.y).toBeCloseTo(45, 0);
        });

        it('should create rotation from axis angle', () => {
            const axis = new Vector3(0, 1, 0);
            const angle = 90;
            const q = Quaternion.angleAxis(angle, axis);

            const euler = q.eulerAngles;
            expect(euler.y).toBeCloseTo(90, 0);
        });

        it('should rotate vector correctly', () => {
            const q = Quaternion.euler(0, 90, 0);
            const v = new Vector3(1, 0, 0);
            const rotated = Quaternion.rotateVector(q, v);

            expect(rotated.x).toBeCloseTo(0);
            expect(rotated.y).toBeCloseTo(0);
            expect(rotated.z).toBeCloseTo(-1);
        });

        it('should calculate angle between quaternions', () => {
            const q1 = Quaternion.identity;
            const q2 = Quaternion.euler(0, 90, 0);
            const angle = Quaternion.angle(q1, q2);

            expect(angle).toBeCloseTo(90, 0);
        });
    });
});
