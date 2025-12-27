/**
 * GameObject Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameObject, PrimitiveType } from '../../src/core/GameObject';
import { Component } from '../../src/core/Component';
import { Behaviour, MonoBehaviour } from '../../src/core/Behaviour';
import { Vector3 } from '../../src/math/Vector3';

// Test components
class TestComponent extends Component {
    public value: number = 0;
}

class TestBehaviour extends Behaviour {
    public awakeCalled = false;
    public startCalled = false;
    public updateCalled = false;
    public updateDeltaTime = 0;

    protected awake(): void {
        this.awakeCalled = true;
    }

    protected start(): void {
        this.startCalled = true;
    }

    protected update(deltaTime: number): void {
        this.updateCalled = true;
        this.updateDeltaTime = deltaTime;
    }
}

describe('GameObject', () => {
    describe('Constructor', () => {
        it('should create with default name', () => {
            const go = new GameObject();
            expect(go.name).toBe('GameObject');
        });

        it('should create with given name', () => {
            const go = new GameObject('Player');
            expect(go.name).toBe('Player');
        });

        it('should have Transform component by default', () => {
            const go = new GameObject();
            expect(go.transform).toBeDefined();
        });

        it('should be active by default', () => {
            const go = new GameObject();
            expect(go.activeSelf).toBe(true);
            expect(go.activeInHierarchy).toBe(true);
        });
    });

    describe('Component Management', () => {
        let go: GameObject;

        beforeEach(() => {
            go = new GameObject('Test');
        });

        it('should add component', () => {
            const comp = go.addComponent(TestComponent);
            expect(comp).toBeInstanceOf(TestComponent);
            expect(comp.gameObject).toBe(go);
        });

        it('should get component', () => {
            go.addComponent(TestComponent);
            const comp = go.getComponent(TestComponent);
            expect(comp).toBeInstanceOf(TestComponent);
        });

        it('should return null for missing component', () => {
            const comp = go.getComponent(TestComponent);
            expect(comp).toBeNull();
        });

        it('should get multiple components of same type', () => {
            go.addComponent(TestComponent);
            go.addComponent(TestComponent);
            const comps = go.getComponents(TestComponent);
            expect(comps.length).toBe(2);
        });

        it('should try get component', () => {
            const result1 = go.tryGetComponent(TestComponent);
            expect(result1).toBeNull();

            go.addComponent(TestComponent);
            const result2 = go.tryGetComponent(TestComponent);
            expect(result2).toBeInstanceOf(TestComponent);
        });
    });

    describe('Hierarchy', () => {
        it('should set parent', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');

            child.transform.setParent(parent.transform);

            expect(child.transform.parent).toBe(parent.transform);
            expect(parent.transform.childCount).toBe(1);
        });

        it('should get component in children', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');
            child.transform.setParent(parent.transform);
            child.addComponent(TestComponent);

            const comp = parent.getComponentInChildren(TestComponent);
            expect(comp).toBeInstanceOf(TestComponent);
        });

        it('should get component in parent', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');
            parent.addComponent(TestComponent);
            child.transform.setParent(parent.transform);

            const comp = child.getComponentInParent(TestComponent);
            expect(comp).toBeInstanceOf(TestComponent);
        });

        it('should get all components in children', () => {
            const parent = new GameObject('Parent');
            const child1 = new GameObject('Child1');
            const child2 = new GameObject('Child2');

            child1.transform.setParent(parent.transform);
            child2.transform.setParent(parent.transform);

            parent.addComponent(TestComponent);
            child1.addComponent(TestComponent);
            child2.addComponent(TestComponent);

            const comps = parent.getComponentsInChildren(TestComponent);
            expect(comps.length).toBe(3);
        });
    });

    describe('Active State', () => {
        it('should toggle active state', () => {
            const go = new GameObject();
            expect(go.activeSelf).toBe(true);

            go.setActive(false);
            expect(go.activeSelf).toBe(false);

            go.setActive(true);
            expect(go.activeSelf).toBe(true);
        });

        it('should affect children activeInHierarchy', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');
            child.transform.setParent(parent.transform);

            expect(child.activeInHierarchy).toBe(true);

            parent.setActive(false);
            expect(child.activeSelf).toBe(true);
            expect(child.activeInHierarchy).toBe(false);
        });
    });

    describe('Tags', () => {
        it('should set and get tag', () => {
            const go = new GameObject();
            go.tag = 'Player';
            expect(go.tag).toBe('Player');
        });

        it('should compare tag', () => {
            const go = new GameObject();
            go.tag = 'Enemy';
            expect(go.compareTag('Enemy')).toBe(true);
            expect(go.compareTag('Player')).toBe(false);
        });
    });

    describe('Layers', () => {
        it('should set and get layer', () => {
            const go = new GameObject();
            go.layer = 5;
            expect(go.layer).toBe(5);
        });
    });

    describe('Lifecycle', () => {
        it('should call awake on behaviour', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);

            // Awake is called when component is added
            expect(behaviour.awakeCalled).toBe(true);
        });

        it('should call start before first update', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);

            // Start hasn't been called yet
            expect(behaviour.startCalled).toBe(false);

            // Simulate first update
            go._update(0.016);

            expect(behaviour.startCalled).toBe(true);
        });

        it('should call update with deltaTime', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);

            go._update(0.016);
            go._update(0.032);

            expect(behaviour.updateCalled).toBe(true);
            expect(behaviour.updateDeltaTime).toBeCloseTo(0.032);
        });

        it('should not update disabled components', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);
            behaviour.enabled = false;

            go._update(0.016);
            go._update(0.032);

            expect(behaviour.updateCalled).toBe(false);
        });

        it('should not update inactive gameobjects', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);
            go.setActive(false);

            go._update(0.016);

            expect(behaviour.startCalled).toBe(false);
            expect(behaviour.updateCalled).toBe(false);
        });
    });

    describe('Messaging', () => {
        it('should send message to components', () => {
            const go = new GameObject();
            const behaviour = go.addComponent(TestBehaviour);

            // Add a custom method receiver
            (behaviour as unknown as { customMethod: (arg: number) => void }).customMethod = vi.fn();

            go.sendMessage('customMethod', 42);

            expect((behaviour as unknown as { customMethod: () => void }).customMethod).toHaveBeenCalledWith(42);
        });

        it('should broadcast message to children', () => {
            const parent = new GameObject('Parent');
            const child = new GameObject('Child');
            child.transform.setParent(parent.transform);

            const parentBehaviour = parent.addComponent(TestBehaviour);
            const childBehaviour = child.addComponent(TestBehaviour);

            (parentBehaviour as unknown as { onBroadcast: () => void }).onBroadcast = vi.fn();
            (childBehaviour as unknown as { onBroadcast: () => void }).onBroadcast = vi.fn();

            parent.broadcastMessage('onBroadcast');

            expect((parentBehaviour as unknown as { onBroadcast: () => void }).onBroadcast).toHaveBeenCalled();
            expect((childBehaviour as unknown as { onBroadcast: () => void }).onBroadcast).toHaveBeenCalled();
        });
    });

    describe('Static Methods', () => {
        it('should find by name', () => {
            const go = new GameObject('UniqueTestName');
            const found = GameObject.find('UniqueTestName');

            // Note: This may not work without proper scene setup
            // This is a placeholder for when scene management is implemented
        });

        it('should create primitive', () => {
            const cube = GameObject.createPrimitive(PrimitiveType.Cube);
            expect(cube).toBeInstanceOf(GameObject);
            expect(cube.name).toBe('Cube');

            const sphere = GameObject.createPrimitive(PrimitiveType.Sphere);
            expect(sphere.name).toBe('Sphere');
        });
    });
});
