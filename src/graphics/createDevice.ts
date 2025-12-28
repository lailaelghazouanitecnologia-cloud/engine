/**
 * Graphics Device Factory - Creates appropriate graphics device based on configuration.
 */

import { DeviceType } from './constants';
import { GraphicsDevice, GraphicsDeviceOptions } from './GraphicsDevice';

/**
 * Options for creating a graphics device
 */
export interface CreateDeviceOptions extends GraphicsDeviceOptions {
    /** Preferred device types in priority order */
    deviceTypes?: DeviceType[];
    /** URL to WGSL transpiler for WebGPU (required for GLSL shaders on WebGPU) */
    glslangUrl?: string;
    /** URL to TWGSL transpiler */
    twgslUrl?: string;
}

/**
 * Check if WebGPU is supported
 */
export function isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Check if WebGL2 is supported
 */
export function isWebGL2Supported(): boolean {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
}

/**
 * Create a graphics device with automatic fallback
 *
 * @example
 * // Create device with WebGPU preference, falling back to WebGL2
 * const device = await createGraphicsDevice({
 *     canvas: document.getElementById('canvas'),
 *     deviceTypes: [DeviceType.WEBGPU, DeviceType.WEBGL2]
 * });
 */
export async function createGraphicsDevice(options: CreateDeviceOptions): Promise<GraphicsDevice> {
    const deviceTypes = options.deviceTypes ?? [DeviceType.WEBGL2];

    // Ensure WebGL2 is always available as fallback
    if (!deviceTypes.includes(DeviceType.WEBGL2)) {
        deviceTypes.push(DeviceType.WEBGL2);
    }

    const errors: Error[] = [];

    for (const deviceType of deviceTypes) {
        try {
            switch (deviceType) {
                case DeviceType.WEBGPU: {
                    if (!isWebGPUSupported()) {
                        throw new Error('WebGPU not supported in this browser');
                    }
                    // WebGPU device creation would go here
                    // For now, we fall through to WebGL2
                    console.log('[Graphics] WebGPU requested but not yet implemented, falling back to WebGL2');
                    break;
                }

                case DeviceType.WEBGL2: {
                    if (!isWebGL2Supported()) {
                        throw new Error('WebGL2 not supported in this browser');
                    }
                    const device = new GraphicsDevice(options);
                    if (device.gl) {
                        console.log('[Graphics] Created WebGL2 device');
                        return device;
                    }
                    throw new Error('Failed to get WebGL2 context');
                }

                case DeviceType.NULL: {
                    // Null device for headless rendering / testing
                    console.log('[Graphics] Created Null device (no rendering)');
                    return new GraphicsDevice({ ...options, canvas: createNullCanvas() });
                }
            }
        } catch (error) {
            errors.push(error as Error);
            console.warn(`[Graphics] Failed to create ${deviceType} device:`, error);
        }
    }

    throw new Error(`Failed to create graphics device. Tried: ${deviceTypes.join(', ')}. Errors: ${errors.map(e => e.message).join('; ')}`);
}

/**
 * Create a canvas for null device (headless rendering)
 */
function createNullCanvas(): HTMLCanvasElement {
    if (typeof document !== 'undefined') {
        return document.createElement('canvas');
    }
    // For Node.js environment, return a mock canvas
    return {
        width: 800,
        height: 600,
        getContext: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        style: {}
    } as unknown as HTMLCanvasElement;
}

/**
 * Get the best available device type for this platform
 */
export function getBestDeviceType(): DeviceType {
    if (isWebGPUSupported()) {
        return DeviceType.WEBGPU;
    }
    if (isWebGL2Supported()) {
        return DeviceType.WEBGL2;
    }
    return DeviceType.NULL;
}

/**
 * Get all supported device types for this platform
 */
export function getSupportedDeviceTypes(): DeviceType[] {
    const types: DeviceType[] = [];
    if (isWebGPUSupported()) types.push(DeviceType.WEBGPU);
    if (isWebGL2Supported()) types.push(DeviceType.WEBGL2);
    types.push(DeviceType.NULL);
    return types;
}
