/**
 * Matrix4x4 Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Matrix4x4 } from '../../src/math/Matrix4x4';
import { Vector3 } from '../../src/math/Vector3';
import { Quaternion } from '../../src/math/Quaternion';

describe('Matrix4x4', () => {
    describe('Constructor', () => {
        it('should create identity matrix by default', () => {
            const m = new Matrix4x4();
            expect(m.m00).toBe(1);
            expect(m.m11).toBe(1);
            expect(m.m22).toBe(1);
            expect(m.m33).toBe(1);
            expect(m.m01).toBe(0);
            expect(m.m10).toBe(0);
        });
    });

    describe('Static Properties', () => {
        it('should return correct identity matrix', () => {
            const m = Matrix4x4.identity;
            expect(m.isIdentity).toBe(true);
        });

        it('should return correct zero matrix', () => {
            const m = Matrix4x4.zero;
            for (let i = 0; i < 16; i++) {
                expect(m.data[i]).toBe(0);
            }
        });
    });

    describe('TRS', () => {
        it('should create translation matrix', () => {
            const t = new Vector3(10, 20, 30);
            const m = Matrix4x4.TRS(t, Quaternion.identity, Vector3.one);

            expect(m.m03).toBe(10);
            expect(m.m13).toBe(20);
            expect(m.m23).toBe(30);
        });

        it('should create scale matrix', () => {
            const s = new Vector3(2, 3, 4);
            const m = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, s);

            expect(m.m00).toBe(2);
            expect(m.m11).toBe(3);
            expect(m.m22).toBe(4);
        });

        it('should combine translation, rotation, and scale', () => {
            const t = new Vector3(5, 10, 15);
            const r = Quaternion.euler(0, 90, 0);
            const s = new Vector3(2, 2, 2);

            const m = Matrix4x4.TRS(t, r, s);

            // Check translation is preserved
            expect(m.m03).toBe(5);
            expect(m.m13).toBe(10);
            expect(m.m23).toBe(15);
        });
    });

    describe('Instance Methods', () => {
        it('should transpose correctly', () => {
            const m = new Matrix4x4();
            m.data[1] = 5;
            m.data[4] = 10;

            const transposed = m.transpose;
            expect(transposed.data[1]).toBe(10);
            expect(transposed.data[4]).toBe(5);
        });

        it('should calculate determinant correctly', () => {
            const m = Matrix4x4.identity;
            expect(m.determinant).toBe(1);
        });

        it('should invert identity matrix correctly', () => {
            const m = Matrix4x4.identity;
            const inv = m.inverse;

            expect(inv.isIdentity).toBe(true);
        });

        it('should transform point correctly', () => {
            const m = Matrix4x4.TRS(new Vector3(10, 0, 0), Quaternion.identity, Vector3.one);
            const point = new Vector3(5, 0, 0);
            const result = m.multiplyPoint(point);

            expect(result.x).toBeCloseTo(15);
            expect(result.y).toBeCloseTo(0);
            expect(result.z).toBeCloseTo(0);
        });

        it('should transform direction correctly', () => {
            const m = Matrix4x4.TRS(new Vector3(10, 0, 0), Quaternion.identity, Vector3.one);
            const dir = new Vector3(1, 0, 0);
            const result = m.multiplyVector(dir);

            // Direction should not be affected by translation
            expect(result.x).toBeCloseTo(1);
            expect(result.y).toBeCloseTo(0);
            expect(result.z).toBeCloseTo(0);
        });

        it('should clone correctly', () => {
            const m = Matrix4x4.TRS(new Vector3(1, 2, 3), Quaternion.identity, Vector3.one);
            const clone = m.clone();

            expect(clone.m03).toBe(m.m03);
            expect(clone).not.toBe(m);
        });
    });

    describe('Matrix Multiplication', () => {
        it('should multiply with identity correctly', () => {
            const m = Matrix4x4.TRS(new Vector3(5, 10, 15), Quaternion.identity, Vector3.one);
            const result = Matrix4x4.multiply(m, Matrix4x4.identity);

            expect(result.m03).toBe(5);
            expect(result.m13).toBe(10);
            expect(result.m23).toBe(15);
        });

        it('should chain transformations correctly', () => {
            const translate1 = Matrix4x4.translate(new Vector3(10, 0, 0));
            const translate2 = Matrix4x4.translate(new Vector3(5, 0, 0));
            const result = Matrix4x4.multiply(translate1, translate2);

            expect(result.m03).toBeCloseTo(15);
        });
    });

    describe('Projection Matrices', () => {
        it('should create perspective matrix', () => {
            const m = Matrix4x4.perspective(60, 16 / 9, 0.1, 1000);

            // Check that it's not identity
            expect(m.isIdentity).toBe(false);
            // Check m33 is set for perspective
            expect(m.m33).toBe(0);
            expect(m.m32).toBe(-1);
        });

        it('should create ortho matrix', () => {
            const m = Matrix4x4.ortho(-10, 10, -10, 10, 0.1, 100);

            expect(m.isIdentity).toBe(false);
            // Ortho should have m33 = 1
            expect(m.m33).toBe(1);
        });
    });

    describe('LookAt', () => {
        it('should create lookAt matrix', () => {
            const eye = new Vector3(0, 0, 10);
            const target = new Vector3(0, 0, 0);
            const up = Vector3.up;

            const m = Matrix4x4.lookAt(eye, target, up);

            // Transform origin should be at -10 on z
            expect(m.isIdentity).toBe(false);
        });
    });
});
