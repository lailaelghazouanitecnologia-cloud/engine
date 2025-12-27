/**
 * Time management class.
 * Similar to UnityEngine.Time
 */

export class Time {
    private static _time: number = 0;
    private static _deltaTime: number = 0;
    private static _unscaledTime: number = 0;
    private static _unscaledDeltaTime: number = 0;
    private static _fixedTime: number = 0;
    private static _fixedDeltaTime: number = 1 / 60;
    private static _timeScale: number = 1;
    private static _frameCount: number = 0;
    private static _realtimeSinceStartup: number = 0;
    private static _smoothDeltaTime: number = 0;
    private static _maximumDeltaTime: number = 1 / 3;
    private static _startTime: number = 0;
    private static _lastFrameTime: number = 0;

    /** Time at the beginning of this frame (scaled) */
    static get time(): number {
        return this._time;
    }

    /** Time since last frame (scaled) */
    static get deltaTime(): number {
        return this._deltaTime;
    }

    /** Time at the beginning of this frame (unscaled) */
    static get unscaledTime(): number {
        return this._unscaledTime;
    }

    /** Time since last frame (unscaled) */
    static get unscaledDeltaTime(): number {
        return this._unscaledDeltaTime;
    }

    /** Time at the beginning of the last fixed update */
    static get fixedTime(): number {
        return this._fixedTime;
    }

    /** Fixed time step */
    static get fixedDeltaTime(): number {
        return this._fixedDeltaTime;
    }

    static set fixedDeltaTime(value: number) {
        this._fixedDeltaTime = Math.max(0.0001, value);
    }

    /** Time scale (0 = paused, 1 = normal, 2 = double speed) */
    static get timeScale(): number {
        return this._timeScale;
    }

    static set timeScale(value: number) {
        this._timeScale = Math.max(0, value);
    }

    /** Number of frames since start */
    static get frameCount(): number {
        return this._frameCount;
    }

    /** Real time since startup (unaffected by timeScale) */
    static get realtimeSinceStartup(): number {
        return this._realtimeSinceStartup;
    }

    /** Smoothed delta time */
    static get smoothDeltaTime(): number {
        return this._smoothDeltaTime;
    }

    /** Maximum delta time to prevent large time jumps */
    static get maximumDeltaTime(): number {
        return this._maximumDeltaTime;
    }

    static set maximumDeltaTime(value: number) {
        this._maximumDeltaTime = Math.max(0.001, value);
    }

    /** Frames per second (1 / deltaTime) */
    static get fps(): number {
        return this._unscaledDeltaTime > 0 ? 1 / this._unscaledDeltaTime : 0;
    }

    /** @internal Initialize time system */
    static _init(): void {
        this._startTime = performance.now() / 1000;
        this._lastFrameTime = this._startTime;
    }

    /** @internal Update time for a new frame */
    static _update(): void {
        const now = performance.now() / 1000;

        this._unscaledDeltaTime = Math.min(now - this._lastFrameTime, this._maximumDeltaTime);
        this._deltaTime = this._unscaledDeltaTime * this._timeScale;

        this._unscaledTime = now - this._startTime;
        this._time += this._deltaTime;

        this._realtimeSinceStartup = now - this._startTime;
        this._frameCount++;

        // Smooth delta time using exponential moving average
        const smoothing = 0.1;
        this._smoothDeltaTime = this._smoothDeltaTime === 0
            ? this._deltaTime
            : this._smoothDeltaTime * (1 - smoothing) + this._deltaTime * smoothing;

        this._lastFrameTime = now;
    }

    /** @internal Update fixed time */
    static _fixedUpdate(): void {
        this._fixedTime += this._fixedDeltaTime;
    }
}
