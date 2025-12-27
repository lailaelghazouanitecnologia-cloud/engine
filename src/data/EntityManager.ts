/**
 * EntityManager - High-level entity management with DOD architecture
 *
 * Integrates DataMatrix, DirtyTracker, ComputePipeline, and PredictionSystem
 * to provide efficient entity management with automatic GPU batching.
 *
 * Usage:
 * ```typescript
 * const em = new EntityManager();
 * await em.initialize();
 *
 * // Create entities
 * const entity = em.createEntity();
 * em.setPosition(entity, [0, 10, 0]);
 * em.setVelocity(entity, [0, -9.8, 0]);
 *
 * // Update loop
 * em.update(deltaTime);
 *
 * // Query results
 * const positions = em.getTransformData();
 * ```
 */

import {
    DataMatrix,
    TransformSchema,
    PhysicsSchema,
    BoundsSchema,
    MatrixSchema
} from './DataMatrix';
import { DirtyTracker, DirtyChannel, HierarchyDirtyPropagator } from './DirtyTracker';
import { ComputePipeline, ComputePassPriority } from './ComputePipeline';
import { PredictionSystem, PredictionStrategy } from './PredictionSystem';

/** Entity handle */
export interface EntityHandle {
    index: number;
    generation: number;
}

/** Entity component flags */
export enum ComponentFlags {
    NONE = 0,
    TRANSFORM = 1 << 0,
    PHYSICS = 1 << 1,
    BOUNDS = 1 << 2,
    RENDERABLE = 1 << 3,
    ANIMATED = 1 << 4,
    STATIC = 1 << 5,
}

/**
 * EntityManager - Main class for DOD entity management
 */
export class EntityManager {
    // Data matrices
    private _transformMatrix: DataMatrix;
    private _physicsMatrix: DataMatrix;
    private _boundsMatrix: DataMatrix;

    // Entity management
    private _entityCount: number = 0;
    private _generations: Uint32Array;
    private _componentFlags: Uint32Array;
    private _freeEntities: number[] = [];
    private _capacity: number;

    // Systems
    private _dirtyTracker: DirtyTracker;
    private _hierarchyPropagator: HierarchyDirtyPropagator;
    private _computePipeline: ComputePipeline;
    private _predictionSystem: PredictionSystem;

    // State
    private _isInitialized: boolean = false;
    private _frameCount: number = 0;
    private _deltaTime: number = 0;

    // Statistics
    private _stats = {
        activeEntities: 0,
        dirtyTransforms: 0,
        dirtyPhysics: 0,
        predictionsUsed: 0,
        gpuComputeTime: 0,
    };

    constructor(capacity: number = 65536) {
        this._capacity = capacity;

        // Initialize data matrices
        this._transformMatrix = new DataMatrix(TransformSchema);
        this._physicsMatrix = new DataMatrix(PhysicsSchema);
        this._boundsMatrix = new DataMatrix(BoundsSchema);

        // Initialize entity tracking
        this._generations = new Uint32Array(capacity);
        this._componentFlags = new Uint32Array(capacity);

        // Initialize systems
        this._dirtyTracker = new DirtyTracker(capacity);
        this._hierarchyPropagator = new HierarchyDirtyPropagator(
            this._dirtyTracker,
            this._transformMatrix.getColumn<Int32ArrayConstructor>('parentIndex')?.data ?? new Int32Array(0)
        );
        this._computePipeline = new ComputePipeline(this._dirtyTracker);
        this._predictionSystem = new PredictionSystem(this._dirtyTracker);
    }

    /** Check if initialized */
    get isInitialized(): boolean {
        return this._isInitialized;
    }

    /** Get entity count */
    get entityCount(): number {
        return this._entityCount;
    }

    /** Get statistics */
    get stats() {
        return { ...this._stats };
    }

    /**
     * Initialize systems
     */
    async initialize(): Promise<void> {
        if (this._isInitialized) return;

        // Initialize compute pipeline
        await this._computePipeline.initialize();

        // Register prediction columns
        this._predictionSystem.registerColumn('position', 3, { threshold: 0.001 });
        this._predictionSystem.registerColumn('velocity', 3, { threshold: 0.01 });
        this._predictionSystem.registerColumn('rotation', 4, { threshold: 0.001 });

        // Register compute passes
        this._registerComputePasses();

        this._isInitialized = true;
        console.log('[EntityManager] Initialized');
    }

    /**
     * Register default compute passes
     */
    private _registerComputePasses(): void {
        // World matrix computation
        this._computePipeline.registerPass({
            name: 'ComputeWorldMatrix',
            priority: ComputePassPriority.WORLD_MATRIX,
            inputChannels: [DirtyChannel.TRANSFORM],
            outputChannels: [DirtyChannel.WORLD_MATRIX],
            workgroupSize: [64, 1, 1],
            fallback: (inputs, outputs, count) => {
                this._computeWorldMatricesCPU(count);
            },
        });

        // Physics integration
        this._computePipeline.registerPass({
            name: 'IntegratePhysics',
            priority: ComputePassPriority.PHYSICS,
            inputChannels: [DirtyChannel.PHYSICS],
            outputChannels: [DirtyChannel.TRANSFORM],
            workgroupSize: [64, 1, 1],
            fallback: (inputs, outputs, count) => {
                this._integratePhysicsCPU(count);
            },
        });

        // Bounds computation
        this._computePipeline.registerPass({
            name: 'ComputeBounds',
            priority: ComputePassPriority.BOUNDS,
            inputChannels: [DirtyChannel.BOUNDS],
            outputChannels: [],
            workgroupSize: [64, 1, 1],
            fallback: (inputs, outputs, count) => {
                this._computeBoundsCPU(count);
            },
        });
    }

    // ==================== Entity Lifecycle ====================

    /**
     * Create a new entity
     */
    createEntity(flags: ComponentFlags = ComponentFlags.TRANSFORM): EntityHandle {
        let index: number;

        if (this._freeEntities.length > 0) {
            index = this._freeEntities.pop()!;
        } else {
            index = this._entityCount;
            if (index >= this._capacity) {
                this._grow();
            }
        }

        // Increment generation
        this._generations[index]++;
        this._componentFlags[index] = flags;
        this._entityCount++;

        // Allocate in matrices based on flags
        if (flags & ComponentFlags.TRANSFORM) {
            this._transformMatrix.allocate();
        }
        if (flags & ComponentFlags.PHYSICS) {
            this._physicsMatrix.allocate();
        }
        if (flags & ComponentFlags.BOUNDS) {
            this._boundsMatrix.allocate();
        }

        // Mark as dirty
        this._dirtyTracker.markDirty(index, DirtyChannel.TRANSFORM);

        this._stats.activeEntities++;

        return {
            index,
            generation: this._generations[index],
        };
    }

    /**
     * Destroy an entity
     */
    destroyEntity(handle: EntityHandle): boolean {
        if (!this._isValidHandle(handle)) return false;

        const index = handle.index;

        // Free from matrices
        if (this._componentFlags[index] & ComponentFlags.TRANSFORM) {
            this._transformMatrix.free(index);
        }
        if (this._componentFlags[index] & ComponentFlags.PHYSICS) {
            this._physicsMatrix.free(index);
        }
        if (this._componentFlags[index] & ComponentFlags.BOUNDS) {
            this._boundsMatrix.free(index);
        }

        // Clear component flags
        this._componentFlags[index] = ComponentFlags.NONE;

        // Add to free list
        this._freeEntities.push(index);
        this._entityCount--;

        // Clear prediction data
        this._predictionSystem.getPredictor('position')?.clear(index);
        this._predictionSystem.getPredictor('velocity')?.clear(index);
        this._predictionSystem.getPredictor('rotation')?.clear(index);

        this._stats.activeEntities--;

        return true;
    }

    /**
     * Check if entity handle is valid
     */
    isValid(handle: EntityHandle): boolean {
        return this._isValidHandle(handle);
    }

    private _isValidHandle(handle: EntityHandle): boolean {
        return (
            handle.index >= 0 &&
            handle.index < this._capacity &&
            handle.generation === this._generations[handle.index] &&
            this._componentFlags[handle.index] !== ComponentFlags.NONE
        );
    }

    // ==================== Transform Operations ====================

    /**
     * Set entity position
     */
    setPosition(handle: EntityHandle, position: [number, number, number]): void {
        if (!this._isValidHandle(handle)) return;

        const idx = handle.index;
        this._transformMatrix.getColumn('positionX')?.set(idx, [position[0]]);
        this._transformMatrix.getColumn('positionY')?.set(idx, [position[1]]);
        this._transformMatrix.getColumn('positionZ')?.set(idx, [position[2]]);

        this._dirtyTracker.markDirty(idx, DirtyChannel.TRANSFORM);
    }

    /**
     * Get entity position
     */
    getPosition(handle: EntityHandle): [number, number, number] | null {
        if (!this._isValidHandle(handle)) return null;

        const idx = handle.index;
        const x = this._transformMatrix.getColumn('positionX')?.getComponent(idx, 0) ?? 0;
        const y = this._transformMatrix.getColumn('positionY')?.getComponent(idx, 0) ?? 0;
        const z = this._transformMatrix.getColumn('positionZ')?.getComponent(idx, 0) ?? 0;

        return [x, y, z];
    }

    /**
     * Set entity rotation (quaternion)
     */
    setRotation(handle: EntityHandle, rotation: [number, number, number, number]): void {
        if (!this._isValidHandle(handle)) return;

        const idx = handle.index;
        this._transformMatrix.getColumn('rotationX')?.set(idx, [rotation[0]]);
        this._transformMatrix.getColumn('rotationY')?.set(idx, [rotation[1]]);
        this._transformMatrix.getColumn('rotationZ')?.set(idx, [rotation[2]]);
        this._transformMatrix.getColumn('rotationW')?.set(idx, [rotation[3]]);

        this._dirtyTracker.markDirty(idx, DirtyChannel.TRANSFORM);
    }

    /**
     * Set entity scale
     */
    setScale(handle: EntityHandle, scale: [number, number, number]): void {
        if (!this._isValidHandle(handle)) return;

        const idx = handle.index;
        this._transformMatrix.getColumn('scaleX')?.set(idx, [scale[0]]);
        this._transformMatrix.getColumn('scaleY')?.set(idx, [scale[1]]);
        this._transformMatrix.getColumn('scaleZ')?.set(idx, [scale[2]]);

        this._dirtyTracker.markDirty(idx, DirtyChannel.TRANSFORM);
    }

    /**
     * Set parent entity
     */
    setParent(handle: EntityHandle, parentHandle: EntityHandle | null): void {
        if (!this._isValidHandle(handle)) return;

        const idx = handle.index;
        const parentIdx = parentHandle && this._isValidHandle(parentHandle)
            ? parentHandle.index
            : -1;

        this._transformMatrix.getColumn('parentIndex')?.set(idx, [parentIdx]);
        this._dirtyTracker.markDirty(idx, DirtyChannel.TRANSFORM);
    }

    /**
     * Get world matrix for entity
     */
    getWorldMatrix(handle: EntityHandle): Float32Array | null {
        if (!this._isValidHandle(handle)) return null;

        const col = this._transformMatrix.getColumn('worldMatrix');
        if (!col) return null;

        const data = col.get(handle.index);
        return new Float32Array(data);
    }

    // ==================== Physics Operations ====================

    /**
     * Set entity velocity
     */
    setVelocity(handle: EntityHandle, velocity: [number, number, number]): void {
        if (!this._isValidHandle(handle)) return;
        if (!(this._componentFlags[handle.index] & ComponentFlags.PHYSICS)) return;

        const idx = handle.index;
        this._physicsMatrix.getColumn('velocityX')?.set(idx, [velocity[0]]);
        this._physicsMatrix.getColumn('velocityY')?.set(idx, [velocity[1]]);
        this._physicsMatrix.getColumn('velocityZ')?.set(idx, [velocity[2]]);

        this._dirtyTracker.markDirty(idx, DirtyChannel.PHYSICS);
    }

    /**
     * Get entity velocity
     */
    getVelocity(handle: EntityHandle): [number, number, number] | null {
        if (!this._isValidHandle(handle)) return null;
        if (!(this._componentFlags[handle.index] & ComponentFlags.PHYSICS)) return null;

        const idx = handle.index;
        const x = this._physicsMatrix.getColumn('velocityX')?.getComponent(idx, 0) ?? 0;
        const y = this._physicsMatrix.getColumn('velocityY')?.getComponent(idx, 0) ?? 0;
        const z = this._physicsMatrix.getColumn('velocityZ')?.getComponent(idx, 0) ?? 0;

        return [x, y, z];
    }

    /**
     * Set entity mass
     */
    setMass(handle: EntityHandle, mass: number): void {
        if (!this._isValidHandle(handle)) return;
        if (!(this._componentFlags[handle.index] & ComponentFlags.PHYSICS)) return;

        this._physicsMatrix.getColumn('mass')?.set(handle.index, [mass]);
        this._dirtyTracker.markDirty(handle.index, DirtyChannel.PHYSICS);
    }

    // ==================== Update Loop ====================

    /**
     * Update all systems
     */
    async update(deltaTime: number): Promise<void> {
        if (!this._isInitialized) {
            throw new Error('EntityManager not initialized');
        }

        this._deltaTime = deltaTime;
        const startTime = performance.now();

        // 1. Propagate dirty flags through hierarchy
        this._hierarchyPropagator.propagateToChildren();

        // 2. Get entities that can use predictions
        const skippable = this._predictionSystem.getSkippableEntities(DirtyChannel.TRANSFORM);
        this._stats.predictionsUsed = skippable.length;

        // 3. Apply predictions to skippable entities
        if (skippable.length > 0) {
            this._predictionSystem.applyPredictions(this._transformMatrix, skippable);

            // Remove from dirty list since we used predictions
            for (const idx of skippable) {
                this._dirtyTracker.clearDirty(idx, DirtyChannel.TRANSFORM);
            }
        }

        // 4. Update buffers in compute pipeline
        this._updateComputeBuffers();

        // 5. Execute compute passes
        await this._computePipeline.execute();

        // 6. Validate predictions with actual computed values
        this._validatePredictions();

        // 7. Update statistics
        this._stats.dirtyTransforms = this._dirtyTracker.getDirtyCount(DirtyChannel.TRANSFORM);
        this._stats.dirtyPhysics = this._dirtyTracker.getDirtyCount(DirtyChannel.PHYSICS);
        this._stats.gpuComputeTime = performance.now() - startTime;

        // 8. End frame
        this._predictionSystem.endFrame();
        this._dirtyTracker.endFrame();
        this._frameCount++;
    }

    /**
     * Update compute buffers
     */
    private _updateComputeBuffers(): void {
        // Create GPU buffers from matrices
        const transformBuffers = this._transformMatrix.createGPUBuffers();
        const physicsBuffers = this._physicsMatrix.createGPUBuffers();

        for (const [name, buffer] of transformBuffers) {
            this._computePipeline.updateBuffer(`transform_${name}`, buffer);
        }

        for (const [name, buffer] of physicsBuffers) {
            this._computePipeline.updateBuffer(`physics_${name}`, buffer);
        }

        // Create dirty index buffer
        const dirtyTransforms = this._dirtyTracker.getDirtyList(DirtyChannel.TRANSFORM);
        this._computePipeline.updateBuffer(
            'dirtyTransformIndices',
            new Uint32Array(dirtyTransforms)
        );

        const dirtyPhysics = this._dirtyTracker.getDirtyList(DirtyChannel.PHYSICS);
        this._computePipeline.updateBuffer(
            'dirtyPhysicsIndices',
            new Uint32Array(dirtyPhysics)
        );
    }

    /**
     * Validate predictions against computed values
     */
    private _validatePredictions(): void {
        // Get entities that were computed (not skipped)
        const computed = this._dirtyTracker.getDirtyList(DirtyChannel.WORLD_MATRIX);

        for (const idx of computed) {
            const position = this.getPosition({ index: idx, generation: this._generations[idx] });
            if (position) {
                this._predictionSystem.validateAndRecord(idx, new Map([
                    ['position', position],
                ]));
            }
        }
    }

    // ==================== CPU Fallback Implementations ====================

    private _computeWorldMatricesCPU(count: number): void {
        const dirtyList = this._dirtyTracker.getDirtyList(DirtyChannel.TRANSFORM);
        const worldMatrixCol = this._transformMatrix.getColumn('worldMatrix');
        const parentIndexCol = this._transformMatrix.getColumn<Int32ArrayConstructor>('parentIndex');

        if (!worldMatrixCol || !parentIndexCol) return;

        for (const idx of dirtyList) {
            // Get TRS components
            const px = this._transformMatrix.getColumn('positionX')?.getComponent(idx, 0) ?? 0;
            const py = this._transformMatrix.getColumn('positionY')?.getComponent(idx, 0) ?? 0;
            const pz = this._transformMatrix.getColumn('positionZ')?.getComponent(idx, 0) ?? 0;

            const rx = this._transformMatrix.getColumn('rotationX')?.getComponent(idx, 0) ?? 0;
            const ry = this._transformMatrix.getColumn('rotationY')?.getComponent(idx, 0) ?? 0;
            const rz = this._transformMatrix.getColumn('rotationZ')?.getComponent(idx, 0) ?? 0;
            const rw = this._transformMatrix.getColumn('rotationW')?.getComponent(idx, 0) ?? 1;

            const sx = this._transformMatrix.getColumn('scaleX')?.getComponent(idx, 0) ?? 1;
            const sy = this._transformMatrix.getColumn('scaleY')?.getComponent(idx, 0) ?? 1;
            const sz = this._transformMatrix.getColumn('scaleZ')?.getComponent(idx, 0) ?? 1;

            // Compute local matrix (TRS)
            const localMatrix = this._computeTRSMatrix(px, py, pz, rx, ry, rz, rw, sx, sy, sz);

            // Get parent matrix if exists
            const parentIdx = parentIndexCol.getComponent(idx, 0);
            if (parentIdx >= 0) {
                const parentMatrix = worldMatrixCol.get(parentIdx);
                const worldMatrix = this._multiplyMatrices(parentMatrix, localMatrix);
                worldMatrixCol.set(idx, worldMatrix);
            } else {
                worldMatrixCol.set(idx, localMatrix);
            }
        }
    }

    private _integratePhysicsCPU(count: number): void {
        const dirtyList = this._dirtyTracker.getDirtyList(DirtyChannel.PHYSICS);
        const dt = this._deltaTime;

        for (const idx of dirtyList) {
            // Get velocity
            const vx = this._physicsMatrix.getColumn('velocityX')?.getComponent(idx, 0) ?? 0;
            const vy = this._physicsMatrix.getColumn('velocityY')?.getComponent(idx, 0) ?? 0;
            const vz = this._physicsMatrix.getColumn('velocityZ')?.getComponent(idx, 0) ?? 0;

            // Get position
            const px = this._transformMatrix.getColumn('positionX')?.getComponent(idx, 0) ?? 0;
            const py = this._transformMatrix.getColumn('positionY')?.getComponent(idx, 0) ?? 0;
            const pz = this._transformMatrix.getColumn('positionZ')?.getComponent(idx, 0) ?? 0;

            // Get drag
            const drag = this._physicsMatrix.getColumn('drag')?.getComponent(idx, 0) ?? 0;

            // Apply drag
            const dragFactor = 1 - drag * dt;
            this._physicsMatrix.getColumn('velocityX')?.set(idx, [vx * dragFactor]);
            this._physicsMatrix.getColumn('velocityY')?.set(idx, [vy * dragFactor]);
            this._physicsMatrix.getColumn('velocityZ')?.set(idx, [vz * dragFactor]);

            // Integrate position
            this._transformMatrix.getColumn('positionX')?.set(idx, [px + vx * dt]);
            this._transformMatrix.getColumn('positionY')?.set(idx, [py + vy * dt]);
            this._transformMatrix.getColumn('positionZ')?.set(idx, [pz + vz * dt]);

            // Mark transform as dirty
            this._dirtyTracker.markDirty(idx, DirtyChannel.TRANSFORM);
        }
    }

    private _computeBoundsCPU(count: number): void {
        // Bounds computation (simplified)
        const dirtyList = this._dirtyTracker.getDirtyList(DirtyChannel.BOUNDS);

        for (const idx of dirtyList) {
            // Get world matrix
            const worldMatrix = this._transformMatrix.getColumn('worldMatrix')?.get(idx);
            if (!worldMatrix) continue;

            // Get local bounds
            const minX = this._boundsMatrix.getColumn('minX')?.getComponent(idx, 0) ?? -0.5;
            const minY = this._boundsMatrix.getColumn('minY')?.getComponent(idx, 0) ?? -0.5;
            const minZ = this._boundsMatrix.getColumn('minZ')?.getComponent(idx, 0) ?? -0.5;
            const maxX = this._boundsMatrix.getColumn('maxX')?.getComponent(idx, 0) ?? 0.5;
            const maxY = this._boundsMatrix.getColumn('maxY')?.getComponent(idx, 0) ?? 0.5;
            const maxZ = this._boundsMatrix.getColumn('maxZ')?.getComponent(idx, 0) ?? 0.5;

            // Transform bounds (simplified - just use center + scale)
            const sx = Math.abs(worldMatrix[0]) + Math.abs(worldMatrix[4]) + Math.abs(worldMatrix[8]);
            const sy = Math.abs(worldMatrix[1]) + Math.abs(worldMatrix[5]) + Math.abs(worldMatrix[9]);
            const sz = Math.abs(worldMatrix[2]) + Math.abs(worldMatrix[6]) + Math.abs(worldMatrix[10]);

            const halfExtent = Math.max(
                (maxX - minX) * sx,
                (maxY - minY) * sy,
                (maxZ - minZ) * sz
            ) * 0.5;

            this._boundsMatrix.getColumn('sphereRadius')?.set(idx, [halfExtent * 1.732]);
        }
    }

    private _computeTRSMatrix(
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number, rw: number,
        sx: number, sy: number, sz: number
    ): number[] {
        // Quaternion to rotation matrix components
        const x2 = rx + rx, y2 = ry + ry, z2 = rz + rz;
        const xx = rx * x2, xy = rx * y2, xz = rx * z2;
        const yy = ry * y2, yz = ry * z2, zz = rz * z2;
        const wx = rw * x2, wy = rw * y2, wz = rw * z2;

        return [
            (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
            (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
            (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
            tx, ty, tz, 1
        ];
    }

    private _multiplyMatrices(a: number[], b: number[]): number[] {
        const result = new Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return result;
    }

    private _grow(): void {
        const newCapacity = this._capacity * 2;

        // Grow entity arrays
        const newGenerations = new Uint32Array(newCapacity);
        newGenerations.set(this._generations);
        this._generations = newGenerations;

        const newFlags = new Uint32Array(newCapacity);
        newFlags.set(this._componentFlags);
        this._componentFlags = newFlags;

        // Grow dirty tracker
        this._dirtyTracker.resize(newCapacity);

        this._capacity = newCapacity;
    }

    // ==================== Query Operations ====================

    /**
     * Get all entity indices matching component flags
     */
    queryEntities(requiredFlags: ComponentFlags): number[] {
        const results: number[] = [];
        for (let i = 0; i < this._capacity; i++) {
            if (
                this._componentFlags[i] !== ComponentFlags.NONE &&
                (this._componentFlags[i] & requiredFlags) === requiredFlags
            ) {
                results.push(i);
            }
        }
        return results;
    }

    /**
     * Get raw transform data for rendering
     */
    getTransformData(): {
        positions: Float32Array;
        worldMatrices: Float32Array;
        count: number;
    } {
        return {
            positions: new Float32Array([
                ...(this._transformMatrix.getColumn('positionX')?.getActiveData() ?? []),
            ]),
            worldMatrices: this._transformMatrix.getColumn('worldMatrix')?.getActiveData() ?? new Float32Array(0),
            count: this._transformMatrix.count,
        };
    }

    /**
     * Get prediction statistics
     */
    getPredictionStats() {
        return this._predictionSystem.getStats();
    }

    /**
     * Get compute pipeline statistics
     */
    getComputeStats() {
        return this._computePipeline.stats;
    }

    /**
     * Get dirty tracker statistics
     */
    getDirtyStats() {
        return this._dirtyTracker.getStats();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this._computePipeline.dispose();
        this._isInitialized = false;
    }
}
