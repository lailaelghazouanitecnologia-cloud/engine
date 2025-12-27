/**
 * Transform Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameObject } from '../../src/core/GameObject';
import { Transform, Space } from '../../src/core/Transform';
import { Vector3 } from '../../src/math/Vector3';
import { Quaternion } from '../../src/math/Quaternion';

describe('Transform', () => {
    let go: GameObject;
    let transform: Transform;

    beforeEach(() => {
        go = new GameObject('Test');
        transform = go.transform;
    });

    describe('Position', () => {
        it('should have zero local position by default', () => {
            expect(transform.localPosition.x).toBe(0);
            expect(transform.localPosition.y).toBe(0);
            expect(transform.localPosition.z).toBe(0);
        });

        it('should set local position', () => {
            transform.localPosition = new Vector3(10, 20, 30);
            expect(transform.localPosition.x).toBe(10);
            expect(transform.localPosition.y).toBe(20);
            expect(transform.localPosition.z).toBe(30);
        });

        it('should get world position without parent', () => {
            transform.localPosition = new Vector3(5, 10, 15);
            expect(transform.position.x).toBe(5);
            expect(transform.position.y).toBe(10);
            expect(transform.position.z).toBe(15);
        });

        it('should get world position with parent', () => {
            const parent = new GameObject('Parent');
            parent.transform.localPosition = new Vector3(100, 0, 0);

            transform.setParent(parent.transform);
            transform.localPosition = new Vector3(10, 0, 0);

            expect(transform.position.x).toBeCloseTo(110);
        });

        it('should set world position', () => {
            const parent = new GameObject('Parent');
            parent.transform.localPosition = new Vector3(100, 0, 0);

            transform.setParent(parent.transform);
            transform.position = new Vector3(150, 0, 0);

            expect(transform.localPosition.x).toBeCloseTo(50);
        });
    });

    describe('Rotation', () => {
        it('should have identity rotation by default', () => {
            const rot = transform.localRotation;
            expect(rot.x).toBe(0);
            expect(rot.y).toBe(0);
            expect(rot.z).toBe(0);
            expect(rot.w).toBe(1);
        });

        it('should set local euler angles', () => {
            transform.localEulerAngles = new Vector3(0, 90, 0);
            const euler = transform.localEulerAngles;
            expect(euler.y).toBeCloseTo(90, 0);
        });

        it('should rotate around axis', () => {
            transform.rotate(new Vector3(0, 90, 0));
            const euler = transform.localEulerAngles;
            expect(euler.y).toBeCloseTo(90, 0);
        });

        it('should rotate around world axis', () => {
            transform.rotate(new Vector3(0, 90, 0), Space.World);
            const euler = transform.eulerAngles;
            expect(euler.y).toBeCloseTo(90, 0);
        });

        it('should rotate around custom axis', () => {
            transform.rotateAround(Vector3.zero, Vector3.up, 90);
            // Object should be rotated and potentially translated
        });
    });

    describe('Scale', () => {
        it('should have unit scale by default', () => {
            expect(transform.localScale.x).toBe(1);
            expect(transform.localScale.y).toBe(1);
            expect(transform.localScale.z).toBe(1);
        });

        it('should set local scale', () => {
            transform.localScale = new Vector3(2, 3, 4);
            expect(transform.localScale.x).toBe(2);
            expect(transform.localScale.y).toBe(3);
            expect(transform.localScale.z).toBe(4);
        });

        it('should get lossy scale', () => {
            const parent = new GameObject('Parent');
            parent.transform.localScale = new Vector3(2, 2, 2);

            transform.setParent(parent.transform);
            transform.localScale = new Vector3(3, 3, 3);

            const lossy = transform.lossyScale;
            expect(lossy.x).toBeCloseTo(6);
            expect(lossy.y).toBeCloseTo(6);
            expect(lossy.z).toBeCloseTo(6);
        });
    });

    describe('Direction Vectors', () => {
        it('should get correct forward vector', () => {
            expect(transform.forward.x).toBeCloseTo(0);
            expect(transform.forward.y).toBeCloseTo(0);
            expect(transform.forward.z).toBeCloseTo(1);
        });

        it('should get correct up vector', () => {
            expect(transform.up.x).toBeCloseTo(0);
            expect(transform.up.y).toBeCloseTo(1);
            expect(transform.up.z).toBeCloseTo(0);
        });

        it('should get correct right vector', () => {
            expect(transform.right.x).toBeCloseTo(1);
            expect(transform.right.y).toBeCloseTo(0);
            expect(transform.right.z).toBeCloseTo(0);
        });

        it('should update forward after rotation', () => {
            transform.rotate(new Vector3(0, 90, 0));
            expect(transform.forward.x).toBeCloseTo(1);
            expect(transform.forward.z).toBeCloseTo(0);
        });
    });

    describe('Hierarchy', () => {
        it('should set parent', () => {
            const parent = new GameObject('Parent');
            transform.setParent(parent.transform);

            expect(transform.parent).toBe(parent.transform);
            expect(parent.transform.childCount).toBe(1);
        });

        it('should remove from previous parent', () => {
            const parent1 = new GameObject('Parent1');
            const parent2 = new GameObject('Parent2');

            transform.setParent(parent1.transform);
            expect(parent1.transform.childCount).toBe(1);

            transform.setParent(parent2.transform);
            expect(parent1.transform.childCount).toBe(0);
            expect(parent2.transform.childCount).toBe(1);
        });

        it('should get child by index', () => {
            const child1 = new GameObject('Child1');
            const child2 = new GameObject('Child2');

            child1.transform.setParent(transform);
            child2.transform.setParent(transform);

            expect(transform.getChild(0)).toBe(child1.transform);
            expect(transform.getChild(1)).toBe(child2.transform);
        });

        it('should find child by name', () => {
            const child = new GameObject('ChildName');
            child.transform.setParent(transform);

            const found = transform.find('ChildName');
            expect(found).toBe(child.transform);
        });

        it('should find nested child by path', () => {
            const child = new GameObject('Child');
            const grandchild = new GameObject('Grandchild');

            child.transform.setParent(transform);
            grandchild.transform.setParent(child.transform);

            const found = transform.find('Child/Grandchild');
            expect(found).toBe(grandchild.transform);
        });

        it('should check if child of', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');
            const grandchild = new GameObject('Grandchild');

            child.transform.setParent(parent.transform);
            grandchild.transform.setParent(child.transform);

            expect(grandchild.transform.isChildOf(child.transform)).toBe(true);
            expect(grandchild.transform.isChildOf(parent.transform)).toBe(true);
            expect(parent.transform.isChildOf(grandchild.transform)).toBe(false);
        });

        it('should get root', () => {
            const root = new GameObject('Root');
            const child = new GameObject('Child');
            const grandchild = new GameObject('Grandchild');

            child.transform.setParent(root.transform);
            grandchild.transform.setParent(child.transform);

            expect(grandchild.transform.root).toBe(root.transform);
        });

        it('should detach children', () => {
            const child1 = new GameObject('Child1');
            const child2 = new GameObject('Child2');

            child1.transform.setParent(transform);
            child2.transform.setParent(transform);

            transform.detachChildren();

            expect(transform.childCount).toBe(0);
            expect(child1.transform.parent).toBeNull();
            expect(child2.transform.parent).toBeNull();
        });

        it('should set sibling index', () => {
            const child1 = new GameObject('Child1');
            const child2 = new GameObject('Child2');
            const child3 = new GameObject('Child3');

            child1.transform.setParent(transform);
            child2.transform.setParent(transform);
            child3.transform.setParent(transform);

            child3.transform.setSiblingIndex(0);

            expect(transform.getChild(0)).toBe(child3.transform);
            expect(child3.transform.getSiblingIndex()).toBe(0);
        });
    });

    describe('Point Transformation', () => {
        it('should transform point to world space', () => {
            transform.localPosition = new Vector3(10, 0, 0);
            const local = new Vector3(5, 0, 0);
            const world = transform.transformPoint(local);

            expect(world.x).toBeCloseTo(15);
        });

        it('should transform point to local space', () => {
            transform.localPosition = new Vector3(10, 0, 0);
            const world = new Vector3(15, 0, 0);
            const local = transform.inverseTransformPoint(world);

            expect(local.x).toBeCloseTo(5);
        });

        it('should transform direction to world space', () => {
            transform.rotate(new Vector3(0, 90, 0));
            const local = new Vector3(0, 0, 1);
            const world = transform.transformDirection(local);

            expect(world.x).toBeCloseTo(1);
            expect(world.z).toBeCloseTo(0);
        });

        it('should transform direction to local space', () => {
            transform.rotate(new Vector3(0, 90, 0));
            const world = new Vector3(1, 0, 0);
            const local = transform.inverseTransformDirection(world);

            expect(local.x).toBeCloseTo(0);
            expect(local.z).toBeCloseTo(1);
        });
    });

    describe('LookAt', () => {
        it('should look at target position', () => {
            transform.lookAt(new Vector3(0, 0, 10));
            expect(transform.forward.z).toBeCloseTo(1);
        });

        it('should look at target transform', () => {
            const target = new GameObject('Target');
            target.transform.localPosition = new Vector3(10, 0, 0);

            transform.lookAt(target.transform);
            expect(transform.forward.x).toBeCloseTo(1);
        });
    });

    describe('Translate', () => {
        it('should translate in local space', () => {
            transform.translate(new Vector3(10, 0, 0));
            expect(transform.localPosition.x).toBe(10);
        });

        it('should translate in world space', () => {
            transform.rotate(new Vector3(0, 90, 0));
            transform.translate(new Vector3(10, 0, 0), Space.World);

            expect(transform.localPosition.x).toBeCloseTo(10);
        });

        it('should translate relative to self', () => {
            transform.rotate(new Vector3(0, 90, 0));
            transform.translate(new Vector3(0, 0, 10), Space.Self);

            expect(transform.localPosition.x).toBeCloseTo(10);
            expect(transform.localPosition.z).toBeCloseTo(0);
        });
    });
});
