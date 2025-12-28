/**
 * GameObject is the fundamental object in scenes.
 * Similar to UnityEngine.GameObject
 */

import { EngineObject } from './Object';
import { Component } from './Component';
import { Transform } from './Transform';
import { Behaviour } from './Behaviour';
import { SceneManager } from './Scene';
import type { Scene } from './Scene';

export class GameObject extends EngineObject {
    private _transform: Transform;
    private _components: Component[] = [];
    private _active: boolean = true;
    private _tag: string = 'Untagged';
    private _layer: number = 0;
    private _scene: Scene | null = null;
    private _isStatic: boolean = false;

    constructor(name: string = 'GameObject') {
        super(name);
        this._transform = new Transform();
        this._transform._setGameObject(this);
        this._transform.name = name;
    }

    // ==================== Static Creation ====================

    /** Create an empty GameObject */
    static create(name?: string): GameObject {
        return new GameObject(name);
    }

    /** Create a GameObject with specified components */
    static createWithComponents(name: string, ...componentTypes: (new () => Component)[]): GameObject {
        const go = new GameObject(name);
        for (const type of componentTypes) {
            go.addComponent(type);
        }
        return go;
    }

    /** Create a primitive GameObject */
    static createPrimitive(type: PrimitiveType): GameObject {
        const go = new GameObject(PrimitiveType[type]);
        // TODO: Add MeshFilter and MeshRenderer with primitive mesh
        return go;
    }

    /** Find a GameObject by name in the active scene */
    static find(name: string): GameObject | null {
        const scene = SceneManager.activeScene;
        if (!scene) return null;
        return scene.findGameObject(name);
    }

    /** Find all GameObjects with tag in the active scene */
    static findGameObjectsWithTag(tag: string): GameObject[] {
        const scene = SceneManager.activeScene;
        if (!scene) return [];
        return scene.findGameObjectsWithTag(tag);
    }

    /** Find a GameObject with tag in the active scene (returns first match) */
    static findWithTag(tag: string): GameObject | null {
        const results = GameObject.findGameObjectsWithTag(tag);
        return results.length > 0 ? results[0] : null;
    }

    // ==================== Properties ====================

    /** The Transform attached to this GameObject */
    get transform(): Transform {
        return this._transform;
    }

    /** Is this GameObject active locally? */
    get activeSelf(): boolean {
        return this._active;
    }

    /** Is this GameObject active in the hierarchy? */
    get activeInHierarchy(): boolean {
        if (!this._active) return false;
        const parent = this._transform.parent;
        if (parent) {
            return parent.gameObject.activeInHierarchy;
        }
        return true;
    }

    /** The tag of this GameObject */
    get tag(): string {
        return this._tag;
    }

    set tag(value: string) {
        this._tag = value;
    }

    /** The layer of this GameObject */
    get layer(): number {
        return this._layer;
    }

    set layer(value: number) {
        this._layer = value;
    }

    /** The scene this GameObject belongs to */
    get scene(): Scene | null {
        return this._scene;
    }

    /** Is this GameObject static? */
    get isStatic(): boolean {
        return this._isStatic;
    }

    set isStatic(value: boolean) {
        this._isStatic = value;
    }

    // ==================== Activation ====================

    /** Set the active state of this GameObject */
    setActive(value: boolean): void {
        if (this._active === value) return;

        this._active = value;

        for (const component of this._components) {
            if (value) {
                component._onEnable();
            } else {
                component._onDisable();
            }
        }

        // Propagate to children
        for (let i = 0; i < this._transform.childCount; i++) {
            const child = this._transform.getChild(i);
            // Children's activeInHierarchy changes
            child.gameObject._notifyActiveChange();
        }
    }

    private _notifyActiveChange(): void {
        for (const component of this._components) {
            if (this.activeInHierarchy && component.enabled) {
                component._onEnable();
            } else {
                component._onDisable();
            }
        }
        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject._notifyActiveChange();
        }
    }

    // ==================== Components ====================

    /** Add a component of type T */
    addComponent<T extends Component>(type: new () => T): T {
        const component = new type();
        component._setGameObject(this);
        component.name = type.name;
        this._components.push(component);
        component._awake();
        if (this.activeInHierarchy && component.enabled) {
            component._onEnable();
        }
        return component;
    }

    /** Get a component of type T */
    getComponent<T extends Component>(type: new () => T): T | null {
        for (const component of this._components) {
            if (component instanceof type) {
                return component;
            }
        }
        return null;
    }

    /** Get all components of type T */
    getComponents<T extends Component>(type: new () => T): T[] {
        const result: T[] = [];
        for (const component of this._components) {
            if (component instanceof type) {
                result.push(component);
            }
        }
        return result;
    }

    /** Try to get a component of type T, returns null if not found */
    tryGetComponent<T extends Component>(type: new () => T): T | null {
        return this.getComponent(type);
    }

    /** Get all components on this GameObject */
    getAllComponents(): Component[] {
        return [...this._components];
    }

    /** Get a component of type T in children (depth-first) */
    getComponentInChildren<T extends Component>(type: new () => T, includeInactive: boolean = false): T | null {
        if (!includeInactive && !this.activeInHierarchy) return null;

        const component = this.getComponent(type);
        if (component) return component;

        for (let i = 0; i < this._transform.childCount; i++) {
            const child = this._transform.getChild(i).gameObject;
            const result = child.getComponentInChildren(type, includeInactive);
            if (result) return result;
        }

        return null;
    }

    /** Get all components of type T in children */
    getComponentsInChildren<T extends Component>(type: new () => T, includeInactive: boolean = false): T[] {
        const result: T[] = [];
        this._getComponentsInChildrenRecursive(type, includeInactive, result);
        return result;
    }

    private _getComponentsInChildrenRecursive<T extends Component>(
        type: new () => T,
        includeInactive: boolean,
        result: T[]
    ): void {
        if (!includeInactive && !this.activeInHierarchy) return;

        result.push(...this.getComponents(type));

        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject._getComponentsInChildrenRecursive(type, includeInactive, result);
        }
    }

    /** Get a component of type T in parents */
    getComponentInParent<T extends Component>(type: new () => T, includeInactive: boolean = false): T | null {
        if (!includeInactive && !this.activeInHierarchy) return null;

        const component = this.getComponent(type);
        if (component) return component;

        const parent = this._transform.parent;
        if (parent) {
            return parent.gameObject.getComponentInParent(type, includeInactive);
        }

        return null;
    }

    /** Get all components of type T in parents */
    getComponentsInParent<T extends Component>(type: new () => T, includeInactive: boolean = false): T[] {
        const result: T[] = [];
        let current: GameObject | null = this;

        while (current) {
            if (includeInactive || current.activeInHierarchy) {
                result.push(...current.getComponents(type));
            }
            const parent = current._transform.parent;
            current = parent ? parent.gameObject : null;
        }

        return result;
    }

    /** Check if this GameObject has a component of type T */
    hasComponent<T extends Component>(type: new () => T): boolean {
        return this.getComponent(type) !== null;
    }

    /** Remove a component */
    removeComponent(component: Component): boolean {
        const index = this._components.indexOf(component);
        if (index >= 0) {
            this._components.splice(index, 1);
            component._onDisable();
            EngineObject.destroy(component);
            return true;
        }
        return false;
    }

    // ==================== Messaging ====================

    /** Send message to all components on this GameObject */
    sendMessage(methodName: string, ...args: unknown[]): void {
        for (const component of this._components) {
            const method = (component as Record<string, unknown>)[methodName];
            if (typeof method === 'function') {
                (method as Function).apply(component, args);
            }
        }
    }

    /** Broadcast message to this and all children */
    broadcastMessage(methodName: string, ...args: unknown[]): void {
        this.sendMessage(methodName, ...args);
        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject.broadcastMessage(methodName, ...args);
        }
    }

    /** Send message upwards through the hierarchy */
    sendMessageUpwards(methodName: string, ...args: unknown[]): void {
        this.sendMessage(methodName, ...args);
        const parent = this._transform.parent;
        if (parent) {
            parent.gameObject.sendMessageUpwards(methodName, ...args);
        }
    }

    // ==================== Comparison ====================

    /** Compare tag */
    compareTag(tag: string): boolean {
        return this._tag === tag;
    }

    // ==================== Lifecycle ====================

    /** @internal */
    _setScene(scene: Scene | null): void {
        this._scene = scene;
    }

    /** @internal */
    _update(deltaTime: number): void {
        if (!this.activeInHierarchy) return;

        for (const component of this._components) {
            if (component instanceof Behaviour) {
                component._update(deltaTime);
            }
        }

        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject._update(deltaTime);
        }
    }

    /** @internal */
    _fixedUpdate(fixedDeltaTime: number): void {
        if (!this.activeInHierarchy) return;

        for (const component of this._components) {
            if (component instanceof Behaviour) {
                component._fixedUpdate(fixedDeltaTime);
            }
        }

        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject._fixedUpdate(fixedDeltaTime);
        }
    }

    /** @internal */
    _lateUpdate(deltaTime: number): void {
        if (!this.activeInHierarchy) return;

        for (const component of this._components) {
            if (component instanceof Behaviour) {
                component._lateUpdate(deltaTime);
            }
        }

        for (let i = 0; i < this._transform.childCount; i++) {
            this._transform.getChild(i).gameObject._lateUpdate(deltaTime);
        }
    }

    protected override onDestroy(): void {
        // Destroy all components
        for (const component of [...this._components]) {
            EngineObject.destroy(component);
        }
        this._components.length = 0;

        // Destroy all children
        while (this._transform.childCount > 0) {
            const child = this._transform.getChild(0);
            EngineObject.destroy(child.gameObject);
        }

        // Remove from parent
        this._transform.parent = null;
    }
}

export enum PrimitiveType {
    Sphere,
    Capsule,
    Cylinder,
    Cube,
    Plane,
    Quad,
}
