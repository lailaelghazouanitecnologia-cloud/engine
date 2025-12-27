/**
 * Base class for all components.
 * Similar to UnityEngine.Component
 */

import { EngineObject } from './Object';
import type { GameObject } from './GameObject';
import type { Transform } from './Transform';

export abstract class Component extends EngineObject {
    private _gameObject: GameObject | null = null;
    private _enabled: boolean = true;

    constructor() {
        super();
    }

    /** The GameObject this component is attached to */
    get gameObject(): GameObject {
        if (!this._gameObject) {
            throw new Error('Component is not attached to a GameObject');
        }
        return this._gameObject;
    }

    /** The Transform attached to this GameObject */
    get transform(): Transform {
        return this.gameObject.transform;
    }

    /** Is this component enabled? */
    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            if (value) {
                this.onEnable();
            } else {
                this.onDisable();
            }
        }
    }

    /** Is the component active in the hierarchy? */
    get isActiveAndEnabled(): boolean {
        return this._enabled && this._gameObject !== null && this._gameObject.activeInHierarchy;
    }

    /** Tag of the GameObject */
    get tag(): string {
        return this.gameObject.tag;
    }

    set tag(value: string) {
        this.gameObject.tag = value;
    }

    /** Internal: Set the owning GameObject */
    _setGameObject(gameObject: GameObject): void {
        this._gameObject = gameObject;
    }

    // ==================== Component Search ====================

    /** Get a component of type T on the same GameObject */
    getComponent<T extends Component>(type: new () => T): T | null {
        return this.gameObject.getComponent(type);
    }

    /** Get components of type T on the same GameObject */
    getComponents<T extends Component>(type: new () => T): T[] {
        return this.gameObject.getComponents(type);
    }

    /** Get a component of type T on this or any child GameObject */
    getComponentInChildren<T extends Component>(type: new () => T, includeInactive?: boolean): T | null {
        return this.gameObject.getComponentInChildren(type, includeInactive);
    }

    /** Get all components of type T on this or any child GameObject */
    getComponentsInChildren<T extends Component>(type: new () => T, includeInactive?: boolean): T[] {
        return this.gameObject.getComponentsInChildren(type, includeInactive);
    }

    /** Get a component of type T on any parent GameObject */
    getComponentInParent<T extends Component>(type: new () => T, includeInactive?: boolean): T | null {
        return this.gameObject.getComponentInParent(type, includeInactive);
    }

    /** Get all components of type T on any parent GameObject */
    getComponentsInParent<T extends Component>(type: new () => T, includeInactive?: boolean): T[] {
        return this.gameObject.getComponentsInParent(type, includeInactive);
    }

    // ==================== Messaging ====================

    /** Send a message to all components on this GameObject */
    sendMessage(methodName: string, ...args: unknown[]): void {
        this.gameObject.sendMessage(methodName, ...args);
    }

    /** Send a message to all components on this and child GameObjects */
    broadcastMessage(methodName: string, ...args: unknown[]): void {
        this.gameObject.broadcastMessage(methodName, ...args);
    }

    /** Send a message upwards to all parent GameObjects */
    sendMessageUpwards(methodName: string, ...args: unknown[]): void {
        this.gameObject.sendMessageUpwards(methodName, ...args);
    }

    // ==================== Comparison ====================

    /** Compare tag */
    compareTag(tag: string): boolean {
        return this.gameObject.compareTag(tag);
    }

    // ==================== Lifecycle Hooks ====================
    // Override these in subclasses

    /** Called when the component is first created */
    protected awake(): void {}

    /** Called before the first update */
    protected start(): void {}

    /** Called when the component is enabled */
    protected onEnable(): void {}

    /** Called when the component is disabled */
    protected onDisable(): void {}

    /** Called when the component is destroyed */
    protected override onDestroy(): void {}

    // ==================== Internal Lifecycle ====================

    /** @internal */
    _awake(): void {
        this.awake();
    }

    /** @internal */
    _start(): void {
        this.start();
    }

    /** @internal */
    _onEnable(): void {
        if (this._enabled) {
            this.onEnable();
        }
    }

    /** @internal */
    _onDisable(): void {
        this.onDisable();
    }
}
