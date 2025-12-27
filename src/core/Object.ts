/**
 * Base class for all objects in the engine.
 * Similar to UnityEngine.Object
 */

let nextInstanceId = 1;

export abstract class EngineObject {
    private readonly _instanceId: number;
    private _name: string;
    private _hideFlags: HideFlags = HideFlags.None;
    private _destroyed: boolean = false;

    constructor(name: string = '') {
        this._instanceId = nextInstanceId++;
        this._name = name || this.constructor.name;
    }

    /** Unique instance ID */
    get instanceId(): number {
        return this._instanceId;
    }

    /** Name of the object */
    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    /** Hide flags for the object */
    get hideFlags(): HideFlags {
        return this._hideFlags;
    }

    set hideFlags(value: HideFlags) {
        this._hideFlags = value;
    }

    /** Returns true if the object has been destroyed */
    get destroyed(): boolean {
        return this._destroyed;
    }

    /** Destroy this object */
    static destroy(obj: EngineObject, delay: number = 0): void {
        if (delay > 0) {
            setTimeout(() => obj._destroy(), delay * 1000);
        } else {
            obj._destroy();
        }
    }

    /** Destroy immediately without delay */
    static destroyImmediate(obj: EngineObject): void {
        obj._destroy();
    }

    /** Don't destroy on scene load */
    static dontDestroyOnLoad(target: EngineObject): void {
        target._hideFlags |= HideFlags.DontSave;
    }

    protected _destroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.onDestroy();
    }

    /** Called when the object is destroyed */
    protected onDestroy(): void {
        // Override in subclasses
    }

    /** Returns the object if it exists, null otherwise */
    static isValid(obj: EngineObject | null | undefined): boolean {
        return obj != null && !obj._destroyed;
    }

    toString(): string {
        return `${this.constructor.name}(${this._name})`;
    }

    /** Compare by instance ID */
    equals(other: EngineObject | null): boolean {
        if (!other) return false;
        return this._instanceId === other._instanceId;
    }

    /** Get hash code (instance ID) */
    getHashCode(): number {
        return this._instanceId;
    }
}

/** Flags to control object behavior */
export enum HideFlags {
    None = 0,
    HideInHierarchy = 1,
    HideInInspector = 2,
    DontSave = 4,
    NotEditable = 8,
    DontUnloadUnusedAsset = 16,
    DontSaveInEditor = 32,
    DontSaveInBuild = 64,
}

/** Alias for Unity compatibility */
export { EngineObject as Object };
