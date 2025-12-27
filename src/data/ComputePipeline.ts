/**
 * ComputePipeline - GPU Compute system for batch operations
 *
 * Collects operations, batches them, and executes on GPU.
 * Supports both WebGPU compute shaders and WebGL fallback.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         ComputePipeline                             │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
 * │  │ DataMatrix   │    │ DataMatrix   │    │ DataMatrix   │          │
 * │  │ (Transforms) │    │ (Physics)    │    │ (Bounds)     │          │
 * │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
 * │         │                   │                   │                   │
 * │         └───────────────────┼───────────────────┘                   │
 * │                             ▼                                       │
 * │  ┌──────────────────────────────────────────────────────┐          │
 * │  │              DirtyTracker (filter dirty only)        │          │
 * │  └──────────────────────────┬───────────────────────────┘          │
 * │                             ▼                                       │
 * │  ┌──────────────────────────────────────────────────────┐          │
 * │  │                  ComputePass Queue                    │          │
 * │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │          │
 * │  │  │ Pass 1  │ │ Pass 2  │ │ Pass 3  │ │ Pass 4  │    │          │
 * │  │  │WorldMat │ │ Physics │ │ Bounds  │ │ Culling │    │          │
 * │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │          │
 * │  └──────────────────────────┬───────────────────────────┘          │
 * │                             ▼                                       │
 * │  ┌──────────────────────────────────────────────────────┐          │
 * │  │                GPU Dispatch (WebGPU/WASM)             │          │
 * │  └──────────────────────────┬───────────────────────────┘          │
 * │                             ▼                                       │
 * │  ┌──────────────────────────────────────────────────────┐          │
 * │  │                   Results Buffer                      │          │
 * │  └──────────────────────────────────────────────────────┘          │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { DataMatrix, DataColumn } from './DataMatrix';
import { DirtyTracker, DirtyChannel } from './DirtyTracker';

/** Compute pass priority (lower = earlier) */
export enum ComputePassPriority {
    HIERARCHY = 0,       // Parent-child relationships
    WORLD_MATRIX = 10,   // World matrix computation
    PHYSICS = 20,        // Physics simulation
    BOUNDS = 30,         // Bounds computation
    CULLING = 40,        // Frustum culling
    ANIMATION = 50,      // Animation sampling
    PARTICLES = 60,      // Particle updates
    CUSTOM = 100,        // User-defined passes
}

/** Buffer binding for compute pass */
export interface BufferBinding {
    name: string;
    buffer: ArrayBufferView;
    usage: 'read' | 'write' | 'readwrite';
}

/** Compute pass definition */
export interface ComputePassDefinition {
    name: string;
    priority: number;
    inputChannels: DirtyChannel[];  // Only run if any of these channels are dirty
    outputChannels: DirtyChannel[]; // Mark these as processed after run
    workgroupSize: [number, number, number];
    shader?: string; // WebGPU compute shader source
    fallback?: (inputs: Map<string, ArrayBufferView>, outputs: Map<string, ArrayBufferView>, count: number) => void;
}

/** Compute pass instance */
export interface ComputePass extends ComputePassDefinition {
    id: number;
    enabled: boolean;
    inputBindings: BufferBinding[];
    outputBindings: BufferBinding[];
    uniformBindings: Map<string, number | number[]>;
}

/**
 * GPU Buffer wrapper
 */
class GPUBufferWrapper {
    readonly name: string;
    private _cpuBuffer: ArrayBufferView;
    private _gpuBuffer: GPUBuffer | null = null;
    private _dirty: boolean = true;
    private _size: number;

    constructor(name: string, data: ArrayBufferView) {
        this.name = name;
        this._cpuBuffer = data;
        this._size = data.byteLength;
    }

    get cpuBuffer(): ArrayBufferView {
        return this._cpuBuffer;
    }

    get gpuBuffer(): GPUBuffer | null {
        return this._gpuBuffer;
    }

    get size(): number {
        return this._size;
    }

    get isDirty(): boolean {
        return this._dirty;
    }

    markDirty(): void {
        this._dirty = true;
    }

    markClean(): void {
        this._dirty = false;
    }

    updateCPUBuffer(data: ArrayBufferView): void {
        this._cpuBuffer = data;
        this._size = data.byteLength;
        this._dirty = true;
    }

    createGPUBuffer(device: GPUDevice, usage: GPUBufferUsageFlags): void {
        if (this._gpuBuffer) {
            this._gpuBuffer.destroy();
        }

        this._gpuBuffer = device.createBuffer({
            size: this._size,
            usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: false,
        });
    }

    uploadToGPU(device: GPUDevice): void {
        if (!this._gpuBuffer || !this._dirty) return;

        device.queue.writeBuffer(
            this._gpuBuffer,
            0,
            this._cpuBuffer.buffer,
            this._cpuBuffer.byteOffset,
            this._cpuBuffer.byteLength
        );
        this._dirty = false;
    }

    async downloadFromGPU(device: GPUDevice): Promise<void> {
        if (!this._gpuBuffer) return;

        const stagingBuffer = device.createBuffer({
            size: this._size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this._gpuBuffer, 0, stagingBuffer, 0, this._size);
        device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(stagingBuffer.getMappedRange());
        new Uint8Array(this._cpuBuffer.buffer, this._cpuBuffer.byteOffset, this._cpuBuffer.byteLength).set(data);
        stagingBuffer.unmap();
        stagingBuffer.destroy();
    }

    destroy(): void {
        if (this._gpuBuffer) {
            this._gpuBuffer.destroy();
            this._gpuBuffer = null;
        }
    }
}

/**
 * ComputePipeline - Main compute orchestrator
 */
export class ComputePipeline {
    private _device: GPUDevice | null = null;
    private _passes: ComputePass[] = [];
    private _buffers: Map<string, GPUBufferWrapper> = new Map();
    private _dirtyTracker: DirtyTracker;
    private _matrices: Map<string, DataMatrix> = new Map();
    private _pipelines: Map<string, GPUComputePipeline> = new Map();
    private _bindGroups: Map<string, GPUBindGroup> = new Map();
    private _passIdCounter: number = 0;
    private _isWebGPUAvailable: boolean = false;
    private _stats = {
        passesExecuted: 0,
        gpuDispatches: 0,
        cpuFallbacks: 0,
        totalEntitiesProcessed: 0,
        lastFrameTime: 0,
    };

    constructor(dirtyTracker: DirtyTracker) {
        this._dirtyTracker = dirtyTracker;
    }

    /** Check if WebGPU is available */
    get isWebGPUAvailable(): boolean {
        return this._isWebGPUAvailable;
    }

    /** Get statistics */
    get stats() {
        return { ...this._stats };
    }

    /**
     * Initialize with WebGPU device
     */
    async initialize(): Promise<boolean> {
        if (!navigator.gpu) {
            console.warn('[ComputePipeline] WebGPU not available, using CPU fallback');
            this._isWebGPUAvailable = false;
            return false;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (!adapter) {
                console.warn('[ComputePipeline] No GPU adapter found');
                return false;
            }

            this._device = await adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {
                    maxStorageBufferBindingSize: 1024 * 1024 * 256, // 256MB
                    maxComputeWorkgroupsPerDimension: 65535,
                },
            });

            this._isWebGPUAvailable = true;
            console.log('[ComputePipeline] WebGPU initialized');
            return true;

        } catch (error) {
            console.warn('[ComputePipeline] Failed to initialize WebGPU:', error);
            return false;
        }
    }

    /**
     * Register a DataMatrix
     */
    registerMatrix(name: string, matrix: DataMatrix): void {
        this._matrices.set(name, matrix);
    }

    /**
     * Register a compute pass
     */
    registerPass(def: ComputePassDefinition): number {
        const pass: ComputePass = {
            ...def,
            id: this._passIdCounter++,
            enabled: true,
            inputBindings: [],
            outputBindings: [],
            uniformBindings: new Map(),
        };

        this._passes.push(pass);
        this._passes.sort((a, b) => a.priority - b.priority);

        return pass.id;
    }

    /**
     * Enable/disable a pass
     */
    setPassEnabled(passId: number, enabled: boolean): void {
        const pass = this._passes.find(p => p.id === passId);
        if (pass) {
            pass.enabled = enabled;
        }
    }

    /**
     * Set uniform value for a pass
     */
    setPassUniform(passId: number, name: string, value: number | number[]): void {
        const pass = this._passes.find(p => p.id === passId);
        if (pass) {
            pass.uniformBindings.set(name, value);
        }
    }

    /**
     * Update buffer data
     */
    updateBuffer(name: string, data: ArrayBufferView): void {
        let wrapper = this._buffers.get(name);
        if (!wrapper) {
            wrapper = new GPUBufferWrapper(name, data);
            this._buffers.set(name, wrapper);

            if (this._device) {
                wrapper.createGPUBuffer(this._device, GPUBufferUsage.STORAGE);
            }
        } else {
            wrapper.updateCPUBuffer(data);
        }
    }

    /**
     * Execute all enabled compute passes
     */
    async execute(): Promise<void> {
        const startTime = performance.now();

        for (const pass of this._passes) {
            if (!pass.enabled) continue;

            // Check if any input channel is dirty
            const hasDirtyInputs = pass.inputChannels.some(
                channel => this._dirtyTracker.getDirtyCount(channel) > 0
            );

            if (!hasDirtyInputs) continue;

            // Get dirty count for processing
            const dirtyCount = Math.max(
                ...pass.inputChannels.map(ch => this._dirtyTracker.getDirtyCount(ch))
            );

            if (dirtyCount === 0) continue;

            if (this._isWebGPUAvailable && this._device && pass.shader) {
                await this._executeGPUPass(pass, dirtyCount);
                this._stats.gpuDispatches++;
            } else if (pass.fallback) {
                this._executeCPUPass(pass, dirtyCount);
                this._stats.cpuFallbacks++;
            }

            // Mark output channels as processed
            for (const channel of pass.outputChannels) {
                this._dirtyTracker.clearChannel(channel);
            }

            this._stats.passesExecuted++;
            this._stats.totalEntitiesProcessed += dirtyCount;
        }

        this._stats.lastFrameTime = performance.now() - startTime;
    }

    /**
     * Execute pass on GPU
     */
    private async _executeGPUPass(pass: ComputePass, count: number): Promise<void> {
        if (!this._device) return;

        // Upload dirty buffers
        for (const wrapper of this._buffers.values()) {
            if (wrapper.isDirty) {
                wrapper.uploadToGPU(this._device);
            }
        }

        // Get or create pipeline
        let pipeline = this._pipelines.get(pass.name);
        if (!pipeline && pass.shader) {
            const shaderModule = this._device.createShaderModule({
                code: pass.shader,
            });

            pipeline = this._device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main',
                },
            });

            this._pipelines.set(pass.name, pipeline);
        }

        if (!pipeline) return;

        // Create bind group
        const entries: GPUBindGroupEntry[] = [];
        let bindingIndex = 0;

        for (const binding of pass.inputBindings) {
            const wrapper = this._buffers.get(binding.name);
            if (wrapper?.gpuBuffer) {
                entries.push({
                    binding: bindingIndex++,
                    resource: { buffer: wrapper.gpuBuffer },
                });
            }
        }

        for (const binding of pass.outputBindings) {
            const wrapper = this._buffers.get(binding.name);
            if (wrapper?.gpuBuffer) {
                entries.push({
                    binding: bindingIndex++,
                    resource: { buffer: wrapper.gpuBuffer },
                });
            }
        }

        const bindGroup = this._device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries,
        });

        // Dispatch
        const commandEncoder = this._device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);

        const workgroupCount = Math.ceil(count / pass.workgroupSize[0]);
        computePass.dispatchWorkgroups(workgroupCount, 1, 1);
        computePass.end();

        this._device.queue.submit([commandEncoder.finish()]);

        // Download results if needed
        for (const binding of pass.outputBindings) {
            if (binding.usage === 'write' || binding.usage === 'readwrite') {
                const wrapper = this._buffers.get(binding.name);
                if (wrapper) {
                    await wrapper.downloadFromGPU(this._device);
                }
            }
        }
    }

    /**
     * Execute pass on CPU (fallback)
     */
    private _executeCPUPass(pass: ComputePass, count: number): void {
        if (!pass.fallback) return;

        const inputs = new Map<string, ArrayBufferView>();
        const outputs = new Map<string, ArrayBufferView>();

        for (const binding of pass.inputBindings) {
            const wrapper = this._buffers.get(binding.name);
            if (wrapper) {
                inputs.set(binding.name, wrapper.cpuBuffer);
            }
        }

        for (const binding of pass.outputBindings) {
            const wrapper = this._buffers.get(binding.name);
            if (wrapper) {
                outputs.set(binding.name, wrapper.cpuBuffer);
            }
        }

        pass.fallback(inputs, outputs, count);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        for (const wrapper of this._buffers.values()) {
            wrapper.destroy();
        }
        this._buffers.clear();
        this._pipelines.clear();
        this._bindGroups.clear();
        this._device = null;
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this._stats = {
            passesExecuted: 0,
            gpuDispatches: 0,
            cpuFallbacks: 0,
            totalEntitiesProcessed: 0,
            lastFrameTime: 0,
        };
    }
}

// ==================== Built-in Compute Passes ====================

/** World Matrix computation pass definition */
export const WorldMatrixPassDef: ComputePassDefinition = {
    name: 'WorldMatrix',
    priority: ComputePassPriority.WORLD_MATRIX,
    inputChannels: [DirtyChannel.TRANSFORM, DirtyChannel.WORLD_MATRIX],
    outputChannels: [DirtyChannel.WORLD_MATRIX],
    workgroupSize: [64, 1, 1],
    shader: `
        struct Transform {
            position: vec3<f32>,
            rotation: vec4<f32>,
            scale: vec3<f32>,
            parentIndex: i32,
        }

        @group(0) @binding(0) var<storage, read> transforms: array<Transform>;
        @group(0) @binding(1) var<storage, read_write> worldMatrices: array<mat4x4<f32>>;
        @group(0) @binding(2) var<storage, read> dirtyIndices: array<u32>;
        @group(0) @binding(3) var<uniform> count: u32;

        fn quatToMatrix(q: vec4<f32>) -> mat4x4<f32> {
            let x2 = q.x + q.x;
            let y2 = q.y + q.y;
            let z2 = q.z + q.z;
            let xx = q.x * x2;
            let xy = q.x * y2;
            let xz = q.x * z2;
            let yy = q.y * y2;
            let yz = q.y * z2;
            let zz = q.z * z2;
            let wx = q.w * x2;
            let wy = q.w * y2;
            let wz = q.w * z2;

            return mat4x4<f32>(
                vec4<f32>(1.0 - (yy + zz), xy + wz, xz - wy, 0.0),
                vec4<f32>(xy - wz, 1.0 - (xx + zz), yz + wx, 0.0),
                vec4<f32>(xz + wy, yz - wx, 1.0 - (xx + yy), 0.0),
                vec4<f32>(0.0, 0.0, 0.0, 1.0)
            );
        }

        fn createTRS(t: Transform) -> mat4x4<f32> {
            var m = quatToMatrix(t.rotation);
            m[0] *= t.scale.x;
            m[1] *= t.scale.y;
            m[2] *= t.scale.z;
            m[3] = vec4<f32>(t.position, 1.0);
            return m;
        }

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            if (global_id.x >= count) { return; }

            let idx = dirtyIndices[global_id.x];
            let t = transforms[idx];
            var localMatrix = createTRS(t);

            if (t.parentIndex >= 0) {
                let parentMatrix = worldMatrices[t.parentIndex];
                worldMatrices[idx] = parentMatrix * localMatrix;
            } else {
                worldMatrices[idx] = localMatrix;
            }
        }
    `,
    fallback: (inputs, outputs, count) => {
        // CPU fallback implementation
        const transforms = inputs.get('transforms') as Float32Array;
        const worldMatrices = outputs.get('worldMatrices') as Float32Array;
        const dirtyIndices = inputs.get('dirtyIndices') as Uint32Array;

        for (let i = 0; i < count; i++) {
            const idx = dirtyIndices[i];
            // Compute TRS matrix (simplified)
            const offset = idx * 11; // 3 pos + 4 rot + 3 scale + 1 parent
            const matOffset = idx * 16;

            // Set identity for now (full implementation would compute TRS)
            worldMatrices[matOffset] = 1;
            worldMatrices[matOffset + 5] = 1;
            worldMatrices[matOffset + 10] = 1;
            worldMatrices[matOffset + 15] = 1;
        }
    },
};

/** Physics integration pass definition */
export const PhysicsPassDef: ComputePassDefinition = {
    name: 'Physics',
    priority: ComputePassPriority.PHYSICS,
    inputChannels: [DirtyChannel.PHYSICS],
    outputChannels: [DirtyChannel.TRANSFORM],
    workgroupSize: [64, 1, 1],
    shader: `
        struct PhysicsState {
            velocity: vec3<f32>,
            angularVelocity: vec3<f32>,
            mass: f32,
            drag: f32,
        }

        @group(0) @binding(0) var<storage, read_write> positions: array<vec3<f32>>;
        @group(0) @binding(1) var<storage, read_write> physics: array<PhysicsState>;
        @group(0) @binding(2) var<uniform> deltaTime: f32;
        @group(0) @binding(3) var<uniform> count: u32;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            if (global_id.x >= count) { return; }

            let idx = global_id.x;
            var p = physics[idx];

            // Apply drag
            p.velocity *= (1.0 - p.drag * deltaTime);

            // Integrate position
            positions[idx] += p.velocity * deltaTime;

            physics[idx] = p;
        }
    `,
    fallback: (inputs, outputs, count) => {
        // CPU fallback
    },
};
