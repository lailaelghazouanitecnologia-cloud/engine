/**
 * Behaviour is the base class for components that can be enabled/disabled
 * and receive update callbacks.
 * Similar to UnityEngine.Behaviour / MonoBehaviour
 */

import { Component } from './Component';

export abstract class Behaviour extends Component {
    private _startCalled: boolean = false;

    constructor() {
        super();
    }

    /** Has Start been called? */
    get startCalled(): boolean {
        return this._startCalled;
    }

    // ==================== Lifecycle Hooks ====================
    // Override these in your scripts

    /**
     * Called when the script instance is being loaded.
     * Awake is called before Start.
     */
    protected override awake(): void {}

    /**
     * Called before the first frame update.
     * Start is only called once in a script's lifetime.
     */
    protected override start(): void {}

    /**
     * Called once per frame.
     * @param deltaTime Time since last frame in seconds
     */
    protected update(deltaTime: number): void {}

    /**
     * Called at a fixed time interval (for physics).
     * @param fixedDeltaTime Fixed time step in seconds
     */
    protected fixedUpdate(fixedDeltaTime: number): void {}

    /**
     * Called after all Update functions have been called.
     * Useful for camera follow scripts.
     * @param deltaTime Time since last frame in seconds
     */
    protected lateUpdate(deltaTime: number): void {}

    /**
     * Called when the object becomes enabled and active.
     */
    protected override onEnable(): void {}

    /**
     * Called when the behaviour becomes disabled or inactive.
     */
    protected override onDisable(): void {}

    /**
     * Called when the MonoBehaviour will be destroyed.
     */
    protected override onDestroy(): void {}

    /**
     * Called when the application is quitting.
     */
    protected onApplicationQuit(): void {}

    /**
     * Called when the application gains or loses focus.
     */
    protected onApplicationFocus(hasFocus: boolean): void {}

    /**
     * Called when the application is paused or resumed.
     */
    protected onApplicationPause(isPaused: boolean): void {}

    // ==================== Collision Callbacks ====================

    /**
     * Called when a collision starts.
     */
    protected onCollisionEnter(collision: Collision): void {}

    /**
     * Called while a collision is happening.
     */
    protected onCollisionStay(collision: Collision): void {}

    /**
     * Called when a collision ends.
     */
    protected onCollisionExit(collision: Collision): void {}

    /**
     * Called when a trigger collision starts.
     */
    protected onTriggerEnter(other: Collider): void {}

    /**
     * Called while inside a trigger.
     */
    protected onTriggerStay(other: Collider): void {}

    /**
     * Called when leaving a trigger.
     */
    protected onTriggerExit(other: Collider): void {}

    // ==================== Internal Update Methods ====================

    /** @internal */
    override _start(): void {
        if (!this._startCalled) {
            this._startCalled = true;
            this.start();
        }
    }

    /** @internal */
    _update(deltaTime: number): void {
        if (this.isActiveAndEnabled) {
            if (!this._startCalled) {
                this._start();
            }
            this.update(deltaTime);
        }
    }

    /** @internal */
    _fixedUpdate(fixedDeltaTime: number): void {
        if (this.isActiveAndEnabled) {
            this.fixedUpdate(fixedDeltaTime);
        }
    }

    /** @internal */
    _lateUpdate(deltaTime: number): void {
        if (this.isActiveAndEnabled) {
            this.lateUpdate(deltaTime);
        }
    }

    /** @internal */
    _onApplicationQuit(): void {
        this.onApplicationQuit();
    }

    /** @internal */
    _onApplicationFocus(hasFocus: boolean): void {
        this.onApplicationFocus(hasFocus);
    }

    /** @internal */
    _onApplicationPause(isPaused: boolean): void {
        this.onApplicationPause(isPaused);
    }

    /** @internal */
    _onCollisionEnter(collision: Collision): void {
        this.onCollisionEnter(collision);
    }

    /** @internal */
    _onCollisionStay(collision: Collision): void {
        this.onCollisionStay(collision);
    }

    /** @internal */
    _onCollisionExit(collision: Collision): void {
        this.onCollisionExit(collision);
    }

    /** @internal */
    _onTriggerEnter(other: Collider): void {
        this.onTriggerEnter(other);
    }

    /** @internal */
    _onTriggerStay(other: Collider): void {
        this.onTriggerStay(other);
    }

    /** @internal */
    _onTriggerExit(other: Collider): void {
        this.onTriggerExit(other);
    }
}

// Placeholder types for physics (will be implemented in physics module)
export interface Collision {
    gameObject: import('./GameObject').GameObject;
    contacts: ContactPoint[];
    relativeVelocity: import('../math/Vector3').Vector3;
}

export interface ContactPoint {
    point: import('../math/Vector3').Vector3;
    normal: import('../math/Vector3').Vector3;
}

export interface Collider extends Component {
    isTrigger: boolean;
}

/** Alias for Unity compatibility */
export { Behaviour as MonoBehaviour };
