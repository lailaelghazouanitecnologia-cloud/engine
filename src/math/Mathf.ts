/**
 * Math utility class.
 * Similar to UnityEngine.Mathf
 */

export class Mathf {
    static readonly PI = Math.PI;
    static readonly Deg2Rad = Math.PI / 180;
    static readonly Rad2Deg = 180 / Math.PI;
    static readonly Epsilon = 0.00001;
    static readonly Infinity = Infinity;
    static readonly NegativeInfinity = -Infinity;

    static abs(value: number): number {
        return Math.abs(value);
    }

    static acos(value: number): number {
        return Math.acos(value);
    }

    static approximately(a: number, b: number): boolean {
        return Math.abs(b - a) < Math.max(0.000001 * Math.max(Math.abs(a), Math.abs(b)), Mathf.Epsilon * 8);
    }

    static asin(value: number): number {
        return Math.asin(value);
    }

    static atan(value: number): number {
        return Math.atan(value);
    }

    static atan2(y: number, x: number): number {
        return Math.atan2(y, x);
    }

    static ceil(value: number): number {
        return Math.ceil(value);
    }

    static ceilToInt(value: number): number {
        return Math.ceil(value);
    }

    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    static clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    static closestPowerOfTwo(value: number): number {
        const next = Mathf.nextPowerOfTwo(value);
        const prev = next >> 1;
        return (value - prev) < (next - value) ? prev : next;
    }

    static cos(value: number): number {
        return Math.cos(value);
    }

    static deltaAngle(current: number, target: number): number {
        let delta = Mathf.repeat(target - current, 360);
        if (delta > 180) delta -= 360;
        return delta;
    }

    static exp(power: number): number {
        return Math.exp(power);
    }

    static floor(value: number): number {
        return Math.floor(value);
    }

    static floorToInt(value: number): number {
        return Math.floor(value);
    }

    static inverseLerp(a: number, b: number, value: number): number {
        if (a !== b) {
            return Mathf.clamp01((value - a) / (b - a));
        }
        return 0;
    }

    static isPowerOfTwo(value: number): boolean {
        return value > 0 && (value & (value - 1)) === 0;
    }

    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * Mathf.clamp01(t);
    }

    static lerpUnclamped(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    static lerpAngle(a: number, b: number, t: number): number {
        let delta = Mathf.repeat(b - a, 360);
        if (delta > 180) delta -= 360;
        return a + delta * Mathf.clamp01(t);
    }

    static log(value: number): number {
        return Math.log(value);
    }

    static log10(value: number): number {
        return Math.log10(value);
    }

    static max(...values: number[]): number {
        return Math.max(...values);
    }

    static min(...values: number[]): number {
        return Math.min(...values);
    }

    static moveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    static moveTowardsAngle(current: number, target: number, maxDelta: number): number {
        const delta = Mathf.deltaAngle(current, target);
        if (-maxDelta < delta && delta < maxDelta) {
            return target;
        }
        target = current + delta;
        return Mathf.moveTowards(current, target, maxDelta);
    }

    static nextPowerOfTwo(value: number): number {
        value--;
        value |= value >> 1;
        value |= value >> 2;
        value |= value >> 4;
        value |= value >> 8;
        value |= value >> 16;
        return value + 1;
    }

    static pingPong(t: number, length: number): number {
        t = Mathf.repeat(t, length * 2);
        return length - Math.abs(t - length);
    }

    static pow(f: number, p: number): number {
        return Math.pow(f, p);
    }

    static repeat(t: number, length: number): number {
        return Mathf.clamp(t - Math.floor(t / length) * length, 0, length);
    }

    static round(value: number): number {
        return Math.round(value);
    }

    static roundToInt(value: number): number {
        return Math.round(value);
    }

    static sign(value: number): number {
        return value >= 0 ? 1 : -1;
    }

    static sin(value: number): number {
        return Math.sin(value);
    }

    static smoothDamp(
        current: number,
        target: number,
        currentVelocity: { value: number },
        smoothTime: number,
        maxSpeed: number = Infinity,
        deltaTime: number
    ): number {
        smoothTime = Math.max(0.0001, smoothTime);
        const omega = 2 / smoothTime;

        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

        let change = current - target;
        const originalTo = target;

        const maxChange = maxSpeed * smoothTime;
        change = Mathf.clamp(change, -maxChange, maxChange);
        target = current - change;

        const temp = (currentVelocity.value + omega * change) * deltaTime;
        currentVelocity.value = (currentVelocity.value - omega * temp) * exp;

        let output = target + (change + temp) * exp;

        // Prevent overshoot
        if ((originalTo - current > 0) === (output > originalTo)) {
            output = originalTo;
            currentVelocity.value = (output - originalTo) / deltaTime;
        }

        return output;
    }

    static smoothDampAngle(
        current: number,
        target: number,
        currentVelocity: { value: number },
        smoothTime: number,
        maxSpeed: number = Infinity,
        deltaTime: number
    ): number {
        target = current + Mathf.deltaAngle(current, target);
        return Mathf.smoothDamp(current, target, currentVelocity, smoothTime, maxSpeed, deltaTime);
    }

    static smoothStep(from: number, to: number, t: number): number {
        t = Mathf.clamp01(t);
        t = -2 * t * t * t + 3 * t * t;
        return to * t + from * (1 - t);
    }

    static sqrt(value: number): number {
        return Math.sqrt(value);
    }

    static tan(value: number): number {
        return Math.tan(value);
    }
}
