/**
 * Keyboard input handler.
 * Tracks key states and dispatches keyboard events.
 */

import { EventHandler } from '../core/EventHandler';
import { KeyboardEvent } from './KeyboardEvent';

/** Key code to identifier mapping */
const keyCodeToIdentifier: Record<string, string> = {
    '9': 'Tab',
    '13': 'Enter',
    '16': 'Shift',
    '17': 'Control',
    '18': 'Alt',
    '27': 'Escape',
    '37': 'Left',
    '38': 'Up',
    '39': 'Right',
    '40': 'Down',
    '46': 'Delete',
    '91': 'Win'
};

/** Convert a string or keycode to a keycode */
function toKeyCode(s: string | number): number {
    if (typeof s === 'string') {
        return s.toUpperCase().charCodeAt(0);
    }
    return s;
}

/** Internal reusable keyboard event */
const _keyboardEvent = new KeyboardEvent();

/** Create a keyboard event from browser event */
function makeKeyboardEvent(event: globalThis.KeyboardEvent): KeyboardEvent {
    _keyboardEvent.key = event.keyCode;
    _keyboardEvent.element = event.target;
    _keyboardEvent.event = event;
    return _keyboardEvent;
}

export interface KeyboardOptions {
    /** Call preventDefault() on key events */
    preventDefault?: boolean;
    /** Call stopPropagation() on key events */
    stopPropagation?: boolean;
}

/**
 * Keyboard input manager.
 *
 * @example
 * const keyboard = new Keyboard(window);
 *
 * keyboard.on('keydown', (e) => {
 *     if (e.key === KEY_SPACE) {
 *         console.log('Space pressed');
 *     }
 * });
 *
 * // In update loop
 * if (keyboard.isPressed(KEY_W)) {
 *     moveForward();
 * }
 */
export class Keyboard extends EventHandler {
    static readonly EVENT_KEYDOWN = 'keydown';
    static readonly EVENT_KEYUP = 'keyup';
    static readonly EVENT_KEYPRESS = 'keypress';

    private _element: Element | Window | null = null;
    private _keymap: Record<string, boolean> = {};
    private _lastmap: Record<string, boolean> = {};
    private _preventDefault: boolean;
    private _stopPropagation: boolean;

    private _keyDownHandler: (e: globalThis.KeyboardEvent) => void;
    private _keyUpHandler: (e: globalThis.KeyboardEvent) => void;
    private _keyPressHandler: (e: globalThis.KeyboardEvent) => void;
    private _visibilityChangeHandler: () => void;
    private _windowBlurHandler: () => void;

    /**
     * Create a new Keyboard instance.
     *
     * @param element - Element to attach keyboard events to (typically window)
     * @param options - Optional configuration
     */
    constructor(element?: Element | Window, options: KeyboardOptions = {}) {
        super();

        this._preventDefault = options.preventDefault ?? false;
        this._stopPropagation = options.stopPropagation ?? false;

        this._keyDownHandler = this._handleKeyDown.bind(this);
        this._keyUpHandler = this._handleKeyUp.bind(this);
        this._keyPressHandler = this._handleKeyPress.bind(this);
        this._visibilityChangeHandler = this._handleVisibilityChange.bind(this);
        this._windowBlurHandler = this._handleWindowBlur.bind(this);

        if (element) {
            this.attach(element);
        }
    }

    /**
     * Attach keyboard event handlers to an element.
     *
     * @param element - The element to listen for keyboard events on
     */
    attach(element: Element | Window): void {
        if (this._element) {
            this.detach();
        }

        this._element = element;
        this._element.addEventListener('keydown', this._keyDownHandler as EventListener, false);
        this._element.addEventListener('keypress', this._keyPressHandler as EventListener, false);
        this._element.addEventListener('keyup', this._keyUpHandler as EventListener, false);

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this._visibilityChangeHandler, false);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('blur', this._windowBlurHandler, false);
        }
    }

    /**
     * Detach keyboard event handlers from the current element.
     */
    detach(): void {
        if (!this._element) return;

        this._element.removeEventListener('keydown', this._keyDownHandler as EventListener);
        this._element.removeEventListener('keypress', this._keyPressHandler as EventListener);
        this._element.removeEventListener('keyup', this._keyUpHandler as EventListener);
        this._element = null;

        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._visibilityChangeHandler, false);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('blur', this._windowBlurHandler, false);
        }
    }

    /**
     * Convert a key code to a key identifier string.
     *
     * @param keyCode - The key code
     * @returns The key identifier
     */
    toKeyIdentifier(keyCode: number): string {
        keyCode = toKeyCode(keyCode);

        const id = keyCodeToIdentifier[keyCode.toString()];
        if (id) {
            return id;
        }

        // Convert to hex and pad to 4 characters
        let hex = keyCode.toString(16).toUpperCase();
        while (hex.length < 4) {
            hex = '0' + hex;
        }

        return `U+${hex}`;
    }

    private _handleKeyDown(event: globalThis.KeyboardEvent): void {
        const code = event.keyCode || event.charCode;
        if (code === undefined) return;

        const id = this.toKeyIdentifier(code);
        this._keymap[id] = true;

        this.fire('keydown', makeKeyboardEvent(event));

        if (this._preventDefault) {
            event.preventDefault();
        }
        if (this._stopPropagation) {
            event.stopPropagation();
        }
    }

    private _handleKeyUp(event: globalThis.KeyboardEvent): void {
        const code = event.keyCode || event.charCode;
        if (code === undefined) return;

        const id = this.toKeyIdentifier(code);
        delete this._keymap[id];

        this.fire('keyup', makeKeyboardEvent(event));

        if (this._preventDefault) {
            event.preventDefault();
        }
        if (this._stopPropagation) {
            event.stopPropagation();
        }
    }

    private _handleKeyPress(event: globalThis.KeyboardEvent): void {
        this.fire('keypress', makeKeyboardEvent(event));

        if (this._preventDefault) {
            event.preventDefault();
        }
        if (this._stopPropagation) {
            event.stopPropagation();
        }
    }

    private _handleVisibilityChange(): void {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            this._handleWindowBlur();
        }
    }

    private _handleWindowBlur(): void {
        this._keymap = {};
        this._lastmap = {};
    }

    /**
     * Called once per frame to update internal state.
     * Should be called at the end of each game loop iteration.
     */
    update(): void {
        // Copy current state to last state
        for (const prop in this._lastmap) {
            delete this._lastmap[prop];
        }
        for (const prop in this._keymap) {
            if (Object.hasOwn(this._keymap, prop)) {
                this._lastmap[prop] = this._keymap[prop];
            }
        }
    }

    /**
     * Check if a key is currently pressed.
     *
     * @param key - The key code to check
     * @returns True if the key is currently pressed
     */
    isPressed(key: number): boolean {
        const keyCode = toKeyCode(key);
        const id = this.toKeyIdentifier(keyCode);
        return !!this._keymap[id];
    }

    /**
     * Check if a key was pressed this frame.
     *
     * @param key - The key code to check
     * @returns True if the key was pressed since the last update
     */
    wasPressed(key: number): boolean {
        const keyCode = toKeyCode(key);
        const id = this.toKeyIdentifier(keyCode);
        return !!this._keymap[id] && !this._lastmap[id];
    }

    /**
     * Check if a key was released this frame.
     *
     * @param key - The key code to check
     * @returns True if the key was released since the last update
     */
    wasReleased(key: number): boolean {
        const keyCode = toKeyCode(key);
        const id = this.toKeyIdentifier(keyCode);
        return !this._keymap[id] && !!this._lastmap[id];
    }
}
