/**
 * Event Handle that is created by EventHandler and can be used for easier event removal.
 *
 * @example
 * const evt = obj.on('test', (a, b) => {
 *     console.log(a + b);
 * });
 * obj.fire('test', 1, 2);
 *
 * evt.off(); // easy way to remove this event
 * obj.fire('test', 1, 2); // this will not trigger the event
 */

import type { EventHandler } from './EventHandler';

/** Callback type for event handlers */
export type EventCallback = (...args: unknown[]) => void;

export class EventHandle {
    private _handler: EventHandler;
    private _name: string;
    private _callback: EventCallback;
    private _scope: unknown;
    private _once: boolean;
    private _removed: boolean = false;

    /**
     * Create a new EventHandle.
     * @param handler - Source object of the event
     * @param name - Name of the event
     * @param callback - Function called when event is fired
     * @param scope - Object used as 'this' when event is fired
     * @param once - If true, removes after first fire
     */
    constructor(
        handler: EventHandler,
        name: string,
        callback: EventCallback,
        scope: unknown,
        once: boolean = false
    ) {
        this._handler = handler;
        this._name = name;
        this._callback = callback;
        this._scope = scope;
        this._once = once;
    }

    /** The event name */
    get name(): string {
        return this._name;
    }

    /** The callback function */
    get callback(): EventCallback {
        return this._callback;
    }

    /** The scope for the callback */
    get scope(): unknown {
        return this._scope;
    }

    /** Whether this is a one-time event */
    get once(): boolean {
        return this._once;
    }

    /** Whether this handle has been removed */
    get removed(): boolean {
        return this._removed;
    }

    /** @internal Mark as removed */
    set removed(value: boolean) {
        if (!value) return;
        this._removed = true;
    }

    /**
     * Remove this event from its handler.
     */
    off(): void {
        if (this._removed) return;
        this._handler._offByHandle(this);
    }

    /** Prevent JSON serialization */
    toJSON(): undefined {
        return undefined;
    }
}
