/**
 * Math module exports
 */

export { Vector3 } from './Vector3';
export { Vector4 } from './Vector4';
export { Quaternion } from './Quaternion';
export { Matrix4x4 } from './Matrix4x4';
export { Mathf } from './Mathf';
export { Color } from './Color';

// Math Backend - Unified abstraction with automatic backend selection
export { MathBackend, BackendType } from './MathBackend';
export type { BackendConfig } from './MathBackend';
