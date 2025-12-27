/**
 * Mouse input handler.
 * Tracks button states and dispatches mouse events.
 */

import { EventHandler } from '../core/EventHandler';
import { MouseEvent, isMousePointerLocked } from './MouseEvent';

export type PointerLockCallback = () => void;

/**
 * Mouse input manager.
 *
 * @example
 * const mouse = new Mouse(canvas);
 *
 * mouse.on('mousedown', (e) => {
 *     console.log(`Button ${e.button} pressed at ${e.x}, ${e.y}`);
 * });
 *
 * // In update loop
 * if (mouse.isPressed(MOUSEBUTTON_LEFT)) {
 *     fire();
 * }
 */
export class Mouse extends EventHandler {
    static readonly EVENT_MOUSEMOVE = 'mousemove';
    static readonly EVENT_MOUSEDOWN = 'mousedown';
    static readonly EVENT_MOUSEUP = 'mouseup';
    static readonly EVENT_MOUSEWHEEL = 'mousewheel';

    /** @internal Last X position */
    _lastX: number = 0;

    /** @internal Last Y position */
    _lastY: number = 0;

    /** @internal Current button states */
    _buttons: boolean[] = [false, false, false];

    private _lastButtons: boolean[] = [false, false, false];
    private _target: Element | null = null;
    private _attached: boolean = false;

    private _upHandler: (e: globalThis.MouseEvent) => void;
    private _downHandler: (e: globalThis.MouseEvent) => void;
    private _moveHandler: (e: globalThis.MouseEvent) => void;
    private _wheelHandler: (e: WheelEvent) => void;
    private _contextMenuHandler: (e: Event) => void;

    /**
     * Create a new Mouse instance.
     *
     * @param element - The element to attach mouse events to
     */
    constructor(element?: Element) {
        super();

        this._upHandler = this._handleUp.bind(this);
        this._downHandler = this._handleDown.bind(this);
        this._moveHandler = this._handleMove.bind(this);
        this._wheelHandler = this._handleWheel.bind(this);
        this._contextMenuHandler = (event: Event) => {
            event.preventDefault();
        };

        if (element) {
            this.attach(element);
        }
    }

    /**
     * Check if the mouse pointer is currently locked.
     */
    static isPointerLocked(): boolean {
        return isMousePointerLocked();
    }

    /**
     * Attach mouse event handlers to an element.
     *
     * @param element - The DOM element to attach to
     */
    attach(element: Element): void {
        this._target = element;

        if (this._attached) return;
        this._attached = true;

        if (typeof window !== 'undefined') {
            window.addEventListener('mouseup', this._upHandler, { passive: false });
            window.addEventListener('mousedown', this._downHandler, { passive: false });
            window.addEventListener('mousemove', this._moveHandler, { passive: false });
            window.addEventListener('wheel', this._wheelHandler, { passive: false });
        }
    }

    /**
     * Detach mouse event handlers.
     */
    detach(): void {
        if (!this._attached) return;
        this._attached = false;
        this._target = null;

        if (typeof window !== 'undefined') {
            window.removeEventListener('mouseup', this._upHandler);
            window.removeEventListener('mousedown', this._downHandler);
            window.removeEventListener('mousemove', this._moveHandler);
            window.removeEventListener('wheel', this._wheelHandler);
        }
    }

    /**
     * Disable the right-click context menu.
     */
    disableContextMenu(): void {
        if (!this._target) return;
        this._target.addEventListener('contextmenu', this._contextMenuHandler);
    }

    /**
     * Enable the right-click context menu (default).
     */
    enableContextMenu(): void {
        if (!this._target) return;
        this._target.removeEventListener('contextmenu', this._contextMenuHandler);
    }

    /**
     * Request pointer lock on the element.
     *
     * @param success - Called when pointer lock is acquired
     * @param error - Called if pointer lock fails
     */
    enablePointerLock(success?: PointerLockCallback, error?: PointerLockCallback): void {
        if (typeof document === 'undefined' || !document.body.requestPointerLock) {
            if (error) error();
            return;
        }

        const onSuccess = () => {
            if (success) success();
            document.removeEventListener('pointerlockchange', onSuccess);
        };

        const onError = () => {
            if (error) error();
            document.removeEventListener('pointerlockerror', onError);
        };

        if (success) {
            document.addEventListener('pointerlockchange', onSuccess, false);
        }
        if (error) {
            document.addEventListener('pointerlockerror', onError, false);
        }

        document.body.requestPointerLock();
    }

    /**
     * Release pointer lock.
     *
     * @param success - Called when pointer lock is released
     */
    disablePointerLock(success?: PointerLockCallback): void {
        if (typeof document === 'undefined' || !document.exitPointerLock) {
            return;
        }

        if (success) {
            const onSuccess = () => {
                success();
                document.removeEventListener('pointerlockchange', onSuccess);
            };
            document.addEventListener('pointerlockchange', onSuccess, false);
        }

        document.exitPointerLock();
    }

    /**
     * Called once per frame to update internal state.
     */
    update(): void {
        this._lastButtons[0] = this._buttons[0];
        this._lastButtons[1] = this._buttons[1];
        this._lastButtons[2] = this._buttons[2];
    }

    /**
     * Check if a mouse button is currently pressed.
     *
     * @param button - The button index (MOUSEBUTTON_LEFT, MOUSEBUTTON_MIDDLE, MOUSEBUTTON_RIGHT)
     * @returns True if the button is currently pressed
     */
    isPressed(button: number): boolean {
        return this._buttons[button];
    }

    /**
     * Check if a mouse button was pressed this frame.
     *
     * @param button - The button index
     * @returns True if the button was pressed since the last update
     */
    wasPressed(button: number): boolean {
        return this._buttons[button] && !this._lastButtons[button];
    }

    /**
     * Check if a mouse button was released this frame.
     *
     * @param button - The button index
     * @returns True if the button was released since the last update
     */
    wasReleased(button: number): boolean {
        return !this._buttons[button] && this._lastButtons[button];
    }

    /** @internal Get coordinates relative to target element */
    _getTargetCoords(event: globalThis.MouseEvent | WheelEvent): { x: number; y: number } | null {
        if (!this._target) return null;

        const rect = this._target.getBoundingClientRect();
        const left = Math.floor(rect.left);
        const top = Math.floor(rect.top);

        // Check if mouse is outside target
        if (
            event.clientX < left ||
            event.clientX >= left + this._target.clientWidth ||
            event.clientY < top ||
            event.clientY >= top + this._target.clientHeight
        ) {
            return null;
        }

        return {
            x: event.clientX - left,
            y: event.clientY - top
        };
    }

    private _handleUp(event: globalThis.MouseEvent): void {
        this._buttons[event.button] = false;

        const e = new MouseEvent(this, event);
        if (!e.event) return;

        this.fire('mouseup', e);
    }

    private _handleDown(event: globalThis.MouseEvent): void {
        this._buttons[event.button] = true;

        const e = new MouseEvent(this, event);
        if (!e.event) return;

        this.fire('mousedown', e);
    }

    private _handleMove(event: globalThis.MouseEvent): void {
        const e = new MouseEvent(this, event);
        if (!e.event) return;

        this.fire('mousemove', e);

        this._lastX = e.x;
        this._lastY = e.y;
    }

    private _handleWheel(event: WheelEvent): void {
        const e = new MouseEvent(this, event);
        if (!e.event) return;

        this.fire('mousewheel', e);
    }
}
