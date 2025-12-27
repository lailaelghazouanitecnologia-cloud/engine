/**
 * MouseEvent represents a mouse input event.
 * Passed to mouse event handlers.
 */

import { MOUSEBUTTON_NONE } from './constants';
import type { Mouse } from './Mouse';

/**
 * Check if the mouse pointer is currently locked.
 */
export function isMousePointerLocked(): boolean {
    if (typeof document === 'undefined') return false;
    return !!(
        document.pointerLockElement ||
        (document as any).mozPointerLockElement ||
        (document as any).webkitPointerLockElement
    );
}

export class MouseEvent {
    /** X coordinate relative to the target element */
    x: number = 0;

    /** Y coordinate relative to the target element */
    y: number = 0;

    /** Change in X since last event */
    dx: number = 0;

    /** Change in Y since last event */
    dy: number = 0;

    /** Mouse button (MOUSEBUTTON_LEFT, MOUSEBUTTON_MIDDLE, MOUSEBUTTON_RIGHT) */
    button: number = MOUSEBUTTON_NONE;

    /** Mouse wheel delta (1 for down, -1 for up) */
    wheelDelta: number = 0;

    /** Current button states */
    buttons: boolean[] = [false, false, false];

    /** The element that received the event */
    element: EventTarget | null = null;

    /** Ctrl key was pressed */
    ctrlKey: boolean = false;

    /** Alt key was pressed */
    altKey: boolean = false;

    /** Shift key was pressed */
    shiftKey: boolean = false;

    /** Meta key was pressed */
    metaKey: boolean = false;

    /** The original browser event */
    event: globalThis.MouseEvent | WheelEvent | null = null;

    constructor(mouse: Mouse, event?: globalThis.MouseEvent | WheelEvent) {
        if (!event) {
            return;
        }

        const coords = mouse._getTargetCoords(event);

        if (coords) {
            this.x = coords.x;
            this.y = coords.y;
        } else if (isMousePointerLocked()) {
            this.x = 0;
            this.y = 0;
        } else {
            // Mouse is outside target
            return;
        }

        // Wheel delta (normalize to -1/+1)
        if (event.type === 'wheel') {
            const wheelEvent = event as WheelEvent;
            if (wheelEvent.deltaY > 0) {
                this.wheelDelta = 1;
            } else if (wheelEvent.deltaY < 0) {
                this.wheelDelta = -1;
            }
        }

        // Movement delta
        if (isMousePointerLocked()) {
            this.dx = (event as any).movementX || 0;
            this.dy = (event as any).movementY || 0;
        } else {
            this.dx = this.x - mouse._lastX;
            this.dy = this.y - mouse._lastY;
        }

        // Button for down/up events
        if (event.type === 'mousedown' || event.type === 'mouseup') {
            this.button = event.button;
        }

        this.buttons = mouse._buttons.slice();
        this.element = event.target;
        this.ctrlKey = event.ctrlKey ?? false;
        this.altKey = event.altKey ?? false;
        this.shiftKey = event.shiftKey ?? false;
        this.metaKey = event.metaKey ?? false;
        this.event = event;
    }
}
