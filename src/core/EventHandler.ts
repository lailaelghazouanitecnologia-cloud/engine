/**
 * Abstract base class that implements functionality for event handling.
 * Similar to PlayCanvas EventHandler pattern.
 *
 * @example
 * class MyClass extends EventHandler {
 *     doSomething() {
 *         this.fire('changed', this.value);
 *     }
 * }
 *
 * const obj = new MyClass();
 * obj.on('changed', (value) => {
 *     console.log('Value changed:', value);
 * });
 */

import { EventHandle, EventCallback } from './EventHandle';

export class EventHandler {
    private _callbacks: Map<string, EventHandle[]> = new Map();
    private _callbackActive: Map<string, EventHandle[]> = new Map();

    /**
     * Reinitialize the event handler.
     * Clears all registered events.
     */
    protected initEventHandler(): void {
        this._callbacks = new Map();
        this._callbackActive = new Map();
    }

    /**
     * @internal Add a callback for an event.
     */
    _addCallback(
        name: string,
        callback: EventCallback,
        scope: unknown,
        once: boolean
    ): EventHandle {
        if (!name || typeof name !== 'string' || !callback) {
            console.warn(`EventHandler: subscribing to event (${name}) with missing arguments`);
        }

        if (!this._callbacks.has(name)) {
            this._callbacks.set(name, []);
        }

        // If adding to a list currently being executed, preserve initial list
        if (this._callbackActive.has(name)) {
            const callbackActive = this._callbackActive.get(name);
            if (callbackActive && callbackActive === this._callbacks.get(name)) {
                this._callbackActive.set(name, callbackActive.slice());
            }
        }

        const evt = new EventHandle(this, name, callback, scope, once);
        this._callbacks.get(name)!.push(evt);
        return evt;
    }

    /**
     * Attach an event handler to an event.
     *
     * @param name - Name of the event to bind the callback to
     * @param callback - Function called when event is fired
     * @param scope - Object to use as 'this' when event fires (defaults to this)
     * @returns EventHandle that can be used to remove the event
     *
     * @example
     * obj.on('test', (a, b) => {
     *     console.log(a + b);
     * });
     * obj.fire('test', 1, 2); // prints 3
     */
    on(name: string, callback: EventCallback, scope: unknown = this): EventHandle {
        return this._addCallback(name, callback, scope, false);
    }

    /**
     * Attach an event handler that will be removed after being fired once.
     *
     * @param name - Name of the event to bind the callback to
     * @param callback - Function called when event is fired
     * @param scope - Object to use as 'this' when event fires (defaults to this)
     * @returns EventHandle that can be used to remove the event
     *
     * @example
     * obj.once('test', (a, b) => {
     *     console.log(a + b);
     * });
     * obj.fire('test', 1, 2); // prints 3
     * obj.fire('test', 1, 2); // nothing happens
     */
    once(name: string, callback: EventCallback, scope: unknown = this): EventHandle {
        return this._addCallback(name, callback, scope, true);
    }

    /**
     * Detach event handlers.
     *
     * @param name - Name of the event to unbind (if omitted, removes all events)
     * @param callback - Specific callback to unbind (if omitted, removes all for the event)
     * @param scope - Specific scope to match
     * @returns Self for chaining
     *
     * @example
     * obj.off(); // Remove all events
     * obj.off('test'); // Remove all 'test' events
     * obj.off('test', handler); // Remove specific handler
     * obj.off('test', handler, this); // Remove handler with specific scope
     */
    off(name?: string, callback?: EventCallback, scope?: unknown): this {
        if (name) {
            // Preserve initial list if currently executing
            if (this._callbackActive.has(name) && this._callbackActive.get(name) === this._callbacks.get(name)) {
                this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
            }
        } else {
            // Preserve all active lists
            for (const [key, callbacks] of this._callbackActive) {
                if (!this._callbacks.has(key)) continue;
                if (this._callbacks.get(key) !== callbacks) continue;
                this._callbackActive.set(key, callbacks.slice());
            }
        }

        if (!name) {
            // Remove all events
            for (const callbacks of this._callbacks.values()) {
                for (const handle of callbacks) {
                    handle.removed = true;
                }
            }
            this._callbacks.clear();
        } else if (!callback) {
            // Remove all events of specific name
            const callbacks = this._callbacks.get(name);
            if (callbacks) {
                for (const handle of callbacks) {
                    handle.removed = true;
                }
                this._callbacks.delete(name);
            }
        } else {
            // Remove specific callback(s)
            const callbacks = this._callbacks.get(name);
            if (!callbacks) return this;

            for (let i = callbacks.length - 1; i >= 0; i--) {
                if (callbacks[i].callback !== callback) continue;
                if (scope && callbacks[i].scope !== scope) continue;

                callbacks[i].removed = true;
                callbacks.splice(i, 1);
            }

            if (callbacks.length === 0) {
                this._callbacks.delete(name);
            }
        }

        return this;
    }

    /**
     * @internal Remove event by handle (more efficient than off).
     */
    _offByHandle(handle: EventHandle): this {
        const name = handle.name;
        handle.removed = true;

        // Preserve initial list if currently executing
        if (this._callbackActive.has(name) && this._callbackActive.get(name) === this._callbacks.get(name)) {
            this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
        }

        const callbacks = this._callbacks.get(name);
        if (!callbacks) return this;

        const index = callbacks.indexOf(handle);
        if (index !== -1) {
            callbacks.splice(index, 1);
            if (callbacks.length === 0) {
                this._callbacks.delete(name);
            }
        }

        return this;
    }

    /**
     * Fire an event, passing arguments to all handlers.
     *
     * @param name - Name of the event to fire
     * @param args - Arguments to pass to event handlers
     * @returns Self for chaining
     *
     * @example
     * obj.fire('test', 'hello', 42);
     */
    fire(name: string, ...args: unknown[]): this {
        if (!name) return this;

        const callbacksInitial = this._callbacks.get(name);
        if (!callbacksInitial) return this;

        let callbacks: EventHandle[] | undefined;

        if (!this._callbackActive.has(name)) {
            // Store initial list when starting execution
            this._callbackActive.set(name, callbacksInitial);
        } else if (this._callbackActive.get(name) !== callbacksInitial) {
            // Clone if list was modified during active execution
            callbacks = callbacksInitial.slice();
        }

        const activeList = callbacks || this._callbackActive.get(name);
        if (!activeList) return this;

        for (let i = 0; i < activeList.length; i++) {
            const evt = activeList[i];
            if (!evt.callback) continue;

            evt.callback.call(evt.scope, ...args);

            if (evt.once) {
                // Check callback still exists (user may have unsubscribed in handler)
                const existingCallbacks = this._callbacks.get(name);
                const index = existingCallbacks ? existingCallbacks.indexOf(evt) : -1;

                if (index !== -1) {
                    if (this._callbackActive.get(name) === existingCallbacks) {
                        this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
                    }

                    const currentCallbacks = this._callbacks.get(name);
                    if (!currentCallbacks) continue;

                    currentCallbacks[index].removed = true;
                    currentCallbacks.splice(index, 1);

                    if (currentCallbacks.length === 0) {
                        this._callbacks.delete(name);
                    }
                }
            }
        }

        if (!callbacks) {
            this._callbackActive.delete(name);
        }

        return this;
    }

    /**
     * Test if there are any handlers bound to an event name.
     *
     * @param name - The name of the event to test
     * @returns True if handlers are bound to the event
     *
     * @example
     * obj.on('test', () => {});
     * obj.hasEvent('test'); // true
     * obj.hasEvent('other'); // false
     */
    hasEvent(name: string): boolean {
        const callbacks = this._callbacks.get(name);
        return !!callbacks && callbacks.length > 0;
    }
}
