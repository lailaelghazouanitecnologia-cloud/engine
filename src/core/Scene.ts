/**
 * Scene management class.
 * Similar to UnityEngine.SceneManagement.Scene
 */

import { GameObject } from './GameObject';
import { EngineObject } from './Object';
import type { Camera } from '../components/Camera';
import type { Light } from '../components/Light';
import type { MeshRenderer } from '../components/MeshRenderer';

export class Scene {
    private _name: string;
    private _rootGameObjects: GameObject[] = [];
    private _isLoaded: boolean = false;
    private _isDirty: boolean = false;
    private _buildIndex: number = -1;
    private _path: string = '';

    constructor(name: string = 'Untitled') {
        this._name = name;
    }

    // ==================== Properties ====================

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
        this._isDirty = true;
    }

    get isLoaded(): boolean {
        return this._isLoaded;
    }

    get isDirty(): boolean {
        return this._isDirty;
    }

    get buildIndex(): number {
        return this._buildIndex;
    }

    get path(): string {
        return this._path;
    }

    get rootCount(): number {
        return this._rootGameObjects.length;
    }

    get isValid(): boolean {
        return true;
    }

    // ==================== Methods ====================

    /** Get all root GameObjects in the scene */
    getRootGameObjects(): GameObject[] {
        return [...this._rootGameObjects];
    }

    /** Add a GameObject to this scene */
    addRootGameObject(gameObject: GameObject): void {
        if (this._rootGameObjects.includes(gameObject)) return;

        this._rootGameObjects.push(gameObject);
        gameObject._setScene(this);
        this._isDirty = true;
    }

    /** Remove a GameObject from this scene */
    removeRootGameObject(gameObject: GameObject): void {
        const index = this._rootGameObjects.indexOf(gameObject);
        if (index >= 0) {
            this._rootGameObjects.splice(index, 1);
            gameObject._setScene(null);
            this._isDirty = true;
        }
    }

    /** Find a GameObject by name in this scene */
    findGameObject(name: string): GameObject | null {
        for (const root of this._rootGameObjects) {
            if (root.name === name) return root;
            const found = this._findInChildren(root, name);
            if (found) return found;
        }
        return null;
    }

    private _findInChildren(parent: GameObject, name: string): GameObject | null {
        for (let i = 0; i < parent.transform.childCount; i++) {
            const child = parent.transform.getChild(i).gameObject;
            if (child.name === name) return child;
            const found = this._findInChildren(child, name);
            if (found) return found;
        }
        return null;
    }

    /** Find all GameObjects with a specific tag */
    findGameObjectsWithTag(tag: string): GameObject[] {
        const result: GameObject[] = [];
        for (const root of this._rootGameObjects) {
            this._collectByTag(root, tag, result);
        }
        return result;
    }

    private _collectByTag(gameObject: GameObject, tag: string, result: GameObject[]): void {
        if (gameObject.compareTag(tag)) {
            result.push(gameObject);
        }
        for (let i = 0; i < gameObject.transform.childCount; i++) {
            this._collectByTag(gameObject.transform.getChild(i).gameObject, tag, result);
        }
    }

    // ==================== Rendering ====================

    /**
     * Get all active cameras in the scene.
     * @internal
     */
    _getCameras(): Camera[] {
        const cameras: Camera[] = [];
        for (const root of this._rootGameObjects) {
            this._collectComponents(root, 'Camera', cameras);
        }
        return cameras;
    }

    /**
     * Get all active lights in the scene.
     * @internal
     */
    _getLights(): Light[] {
        const lights: Light[] = [];
        for (const root of this._rootGameObjects) {
            this._collectComponents(root, 'Light', lights);
        }
        return lights;
    }

    /**
     * Get all active mesh renderers in the scene.
     * @internal
     */
    _getRenderers(): MeshRenderer[] {
        const renderers: MeshRenderer[] = [];
        for (const root of this._rootGameObjects) {
            this._collectComponents(root, 'MeshRenderer', renderers);
        }
        return renderers;
    }

    private _collectComponents<T>(gameObject: GameObject, typeName: string, result: T[]): void {
        if (!gameObject.activeSelf) return;

        const components = gameObject.getAllComponents();
        for (const comp of components) {
            if (comp.constructor.name === typeName && comp.enabled) {
                result.push(comp as unknown as T);
            }
        }

        for (let i = 0; i < gameObject.transform.childCount; i++) {
            this._collectComponents(gameObject.transform.getChild(i).gameObject, typeName, result);
        }
    }

    // ==================== Lifecycle ====================

    /** @internal */
    _load(): void {
        this._isLoaded = true;
    }

    /** @internal */
    _unload(): void {
        for (const root of [...this._rootGameObjects]) {
            EngineObject.destroy(root);
        }
        this._rootGameObjects = [];
        this._isLoaded = false;
    }

    /** @internal */
    _update(deltaTime: number): void {
        for (const root of this._rootGameObjects) {
            root._update(deltaTime);
        }
    }

    /** @internal */
    _fixedUpdate(fixedDeltaTime: number): void {
        for (const root of this._rootGameObjects) {
            root._fixedUpdate(fixedDeltaTime);
        }
    }

    /** @internal */
    _lateUpdate(deltaTime: number): void {
        for (const root of this._rootGameObjects) {
            root._lateUpdate(deltaTime);
        }
    }

    /** @internal */
    _setBuildIndex(index: number): void {
        this._buildIndex = index;
    }

    /** @internal */
    _setPath(path: string): void {
        this._path = path;
    }
}

/**
 * Scene Manager for loading and managing scenes.
 * Similar to UnityEngine.SceneManagement.SceneManager
 */
export class SceneManager {
    private static _scenes: Scene[] = [];
    private static _activeScene: Scene | null = null;

    /** Get the currently active scene */
    static get activeScene(): Scene | null {
        return this._activeScene;
    }

    /** Get the number of loaded scenes */
    static get sceneCount(): number {
        return this._scenes.length;
    }

    /** Create a new empty scene */
    static createScene(name: string): Scene {
        const scene = new Scene(name);
        scene._load();
        this._scenes.push(scene);
        if (!this._activeScene) {
            this._activeScene = scene;
        }
        return scene;
    }

    /** Set the active scene */
    static setActiveScene(scene: Scene): boolean {
        if (this._scenes.includes(scene)) {
            this._activeScene = scene;
            return true;
        }
        return false;
    }

    /** Get a scene by index */
    static getSceneAt(index: number): Scene | null {
        return this._scenes[index] ?? null;
    }

    /** Get a scene by name */
    static getSceneByName(name: string): Scene | null {
        return this._scenes.find(s => s.name === name) ?? null;
    }

    /** Unload a scene */
    static unloadScene(scene: Scene): void {
        const index = this._scenes.indexOf(scene);
        if (index >= 0) {
            scene._unload();
            this._scenes.splice(index, 1);
            if (this._activeScene === scene) {
                this._activeScene = this._scenes[0] ?? null;
            }
        }
    }

    /** @internal Update all scenes */
    static _update(deltaTime: number): void {
        for (const scene of this._scenes) {
            if (scene.isLoaded) {
                scene._update(deltaTime);
            }
        }
    }

    /** @internal Fixed update all scenes */
    static _fixedUpdate(fixedDeltaTime: number): void {
        for (const scene of this._scenes) {
            if (scene.isLoaded) {
                scene._fixedUpdate(fixedDeltaTime);
            }
        }
    }

    /** @internal Late update all scenes */
    static _lateUpdate(deltaTime: number): void {
        for (const scene of this._scenes) {
            if (scene.isLoaded) {
                scene._lateUpdate(deltaTime);
            }
        }
    }
}
