/**
 * KeyboardEvent represents a keyboard input event.
 * Passed to keyboard event handlers.
 */

export class KeyboardEvent {
    /** The keyCode of the key that was pressed/released */
    key: number | null = null;

    /** The element that fired the keyboard event */
    element: EventTarget | null = null;

    /** The original browser keyboard event */
    event: globalThis.KeyboardEvent | null = null;

    constructor(event?: globalThis.KeyboardEvent) {
        if (event) {
            this.key = event.keyCode;
            this.element = event.target;
            this.event = event;
        }
    }
}
