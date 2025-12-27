/**
 * DataMatrix - GPU-friendly data storage for batch computation
 *
 * Stores component data in Structure of Arrays (SOA) format for efficient
 * GPU computation. Each "column" is a continuous buffer that can be
 * uploaded to GPU as a single operation.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         DataMatrix                               │
 * ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
 * │ Entity 0 │ Entity 1 │ Entity 2 │ Entity 3 │ Entity 4 │   ...   │
 * ├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
 * │ posX[0]  │ posX[1]  │ posX[2]  │ posX[3]  │ posX[4]  │   ...   │ ← Row 0
 * │ posY[0]  │ posY[1]  │ posY[2]  │ posY[3]  │ posY[4]  │   ...   │ ← Row 1
 * │ posZ[0]  │ posZ[1]  │ posZ[2]  │ posZ[3]  │ posZ[4]  │   ...   │ ← Row 2
 * │ rotX[0]  │ rotX[1]  │ rotX[2]  │ rotX[3]  │ rotX[4]  │   ...   │ ← Row 3
 * │   ...    │   ...    │   ...    │   ...    │   ...    │   ...   │
 * └──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
 *                              ↓
 *                    GPU Compute Shader
 *                              ↓
 *                    Results Matrix
 */

export type TypedArrayConstructor =
    | Float32ArrayConstructor
    | Float64ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int8ArrayConstructor
    | Uint8ArrayConstructor;

export interface ColumnDefinition {
    name: string;
    type: TypedArrayConstructor;
    components: number; // 1 for scalar, 3 for vec3, 4 for vec4/quat, 16 for mat4
    default?: number[];
}

export interface MatrixSchema {
    columns: ColumnDefinition[];
    initialCapacity?: number;
    growthFactor?: number;
}

/**
 * A single column in the DataMatrix
 */
export class DataColumn<T extends TypedArrayConstructor = Float32ArrayConstructor> {
    readonly name: string;
    readonly components: number;
    readonly type: T;

    private _data: InstanceType<T>;
    private _capacity: number;
    private _count: number = 0;
    private _default: number[];

    constructor(def: ColumnDefinition, capacity: number) {
        this.name = def.name;
        this.type = def.type as T;
        this.components = def.components;
        this._capacity = capacity;
        this._default = def.default ?? new Array(def.components).fill(0);
        this._data = new (this.type as TypedArrayConstructor)(capacity * this.components) as InstanceType<T>;
    }

    /** Get raw typed array data */
    get data(): InstanceType<T> {
        return this._data;
    }

    /** Get active element count */
    get count(): number {
        return this._count;
    }

    /** Get capacity */
    get capacity(): number {
        return this._capacity;
    }

    /** Get value at index */
    get(index: number): number[] {
        const offset = index * this.components;
        const result: number[] = [];
        for (let i = 0; i < this.components; i++) {
            result.push(this._data[offset + i]);
        }
        return result;
    }

    /** Set value at index */
    set(index: number, values: number[]): void {
        const offset = index * this.components;
        for (let i = 0; i < this.components && i < values.length; i++) {
            this._data[offset + i] = values[i];
        }
    }

    /** Set single component at index */
    setComponent(index: number, component: number, value: number): void {
        this._data[index * this.components + component] = value;
    }

    /** Get single component at index */
    getComponent(index: number, component: number): number {
        return this._data[index * this.components + component];
    }

    /** Add a new element with default values */
    add(): number {
        if (this._count >= this._capacity) {
            this._grow();
        }
        const index = this._count++;
        this.set(index, this._default);
        return index;
    }

    /** Copy data from another column (for swapping during compaction) */
    copyFrom(sourceIndex: number, destIndex: number): void {
        const srcOffset = sourceIndex * this.components;
        const dstOffset = destIndex * this.components;
        for (let i = 0; i < this.components; i++) {
            this._data[dstOffset + i] = this._data[srcOffset + i];
        }
    }

    /** Get a subarray view for GPU upload */
    getActiveData(): InstanceType<T> {
        return this._data.subarray(0, this._count * this.components) as InstanceType<T>;
    }

    /** Grow capacity */
    private _grow(factor: number = 2): void {
        const newCapacity = Math.max(this._capacity * factor, this._capacity + 64);
        const newData = new (this.type as TypedArrayConstructor)(newCapacity * this.components) as InstanceType<T>;
        newData.set(this._data);
        this._data = newData;
        this._capacity = newCapacity;
    }

    /** Resize to exact capacity */
    resize(newCapacity: number): void {
        if (newCapacity <= this._capacity) return;
        const newData = new (this.type as TypedArrayConstructor)(newCapacity * this.components) as InstanceType<T>;
        newData.set(this._data);
        this._data = newData;
        this._capacity = newCapacity;
    }

    setCount(count: number): void {
        this._count = count;
    }
}

/**
 * DataMatrix - Main container for GPU-friendly entity data
 */
export class DataMatrix {
    private _columns: Map<string, DataColumn> = new Map();
    private _schema: MatrixSchema;
    private _count: number = 0;
    private _capacity: number;
    private _freeIndices: number[] = [];
    private _version: number = 0;

    constructor(schema: MatrixSchema) {
        this._schema = schema;
        this._capacity = schema.initialCapacity ?? 1024;

        for (const colDef of schema.columns) {
            this._columns.set(colDef.name, new DataColumn(colDef, this._capacity));
        }
    }

    /** Current version (incremented on structural changes) */
    get version(): number {
        return this._version;
    }

    /** Number of active entities */
    get count(): number {
        return this._count;
    }

    /** Total capacity */
    get capacity(): number {
        return this._capacity;
    }

    /** Get column by name */
    getColumn<T extends TypedArrayConstructor = Float32ArrayConstructor>(name: string): DataColumn<T> | null {
        return (this._columns.get(name) as DataColumn<T>) ?? null;
    }

    /** Get all columns */
    get columns(): IterableIterator<DataColumn> {
        return this._columns.values();
    }

    /** Allocate a new entity, returns index */
    allocate(): number {
        let index: number;

        if (this._freeIndices.length > 0) {
            index = this._freeIndices.pop()!;
        } else {
            index = this._count;
            if (index >= this._capacity) {
                this._grow();
            }
        }

        this._count++;
        this._version++;

        // Initialize all columns with defaults
        for (const col of this._columns.values()) {
            if (index >= col.count) {
                col.add();
            }
        }

        return index;
    }

    /** Free an entity at index */
    free(index: number): void {
        this._freeIndices.push(index);
        this._count--;
        this._version++;
    }

    /** Compact the matrix by removing gaps */
    compact(): Map<number, number> {
        if (this._freeIndices.length === 0) {
            return new Map();
        }

        const remapping = new Map<number, number>();
        this._freeIndices.sort((a, b) => b - a); // Sort descending

        let writeIndex = 0;
        const totalSlots = this._count + this._freeIndices.length;

        for (let readIndex = 0; readIndex < totalSlots; readIndex++) {
            if (this._freeIndices.includes(readIndex)) {
                continue;
            }

            if (readIndex !== writeIndex) {
                // Move data
                for (const col of this._columns.values()) {
                    col.copyFrom(readIndex, writeIndex);
                }
                remapping.set(readIndex, writeIndex);
            }
            writeIndex++;
        }

        // Update counts
        for (const col of this._columns.values()) {
            col.setCount(this._count);
        }

        this._freeIndices = [];
        this._version++;

        return remapping;
    }

    /** Grow all columns */
    private _grow(): void {
        const newCapacity = Math.max(
            this._capacity * (this._schema.growthFactor ?? 2),
            this._capacity + 256
        );

        for (const col of this._columns.values()) {
            col.resize(newCapacity);
        }

        this._capacity = newCapacity;
    }

    /** Set value for entity at index */
    setValue(index: number, column: string, values: number[]): void {
        const col = this._columns.get(column);
        if (col) {
            col.set(index, values);
        }
    }

    /** Get value for entity at index */
    getValue(index: number, column: string): number[] | null {
        const col = this._columns.get(column);
        return col ? col.get(index) : null;
    }

    /** Create a typed view of all columns for GPU upload */
    createGPUBuffers(): Map<string, ArrayBufferView> {
        const buffers = new Map<string, ArrayBufferView>();
        for (const [name, col] of this._columns) {
            buffers.set(name, col.getActiveData());
        }
        return buffers;
    }
}

// ==================== Common Schemas ====================

/** Transform data schema (position, rotation, scale, matrix) */
export const TransformSchema: MatrixSchema = {
    columns: [
        { name: 'positionX', type: Float32Array, components: 1, default: [0] },
        { name: 'positionY', type: Float32Array, components: 1, default: [0] },
        { name: 'positionZ', type: Float32Array, components: 1, default: [0] },
        { name: 'rotationX', type: Float32Array, components: 1, default: [0] },
        { name: 'rotationY', type: Float32Array, components: 1, default: [0] },
        { name: 'rotationZ', type: Float32Array, components: 1, default: [0] },
        { name: 'rotationW', type: Float32Array, components: 1, default: [1] },
        { name: 'scaleX', type: Float32Array, components: 1, default: [1] },
        { name: 'scaleY', type: Float32Array, components: 1, default: [1] },
        { name: 'scaleZ', type: Float32Array, components: 1, default: [1] },
        // Cached world matrix (4x4 = 16 floats)
        { name: 'worldMatrix', type: Float32Array, components: 16, default: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] },
        // Parent index (-1 = no parent)
        { name: 'parentIndex', type: Int32Array, components: 1, default: [-1] },
    ],
    initialCapacity: 4096,
};

/** Velocity/Physics data schema */
export const PhysicsSchema: MatrixSchema = {
    columns: [
        { name: 'velocityX', type: Float32Array, components: 1, default: [0] },
        { name: 'velocityY', type: Float32Array, components: 1, default: [0] },
        { name: 'velocityZ', type: Float32Array, components: 1, default: [0] },
        { name: 'angularVelX', type: Float32Array, components: 1, default: [0] },
        { name: 'angularVelY', type: Float32Array, components: 1, default: [0] },
        { name: 'angularVelZ', type: Float32Array, components: 1, default: [0] },
        { name: 'mass', type: Float32Array, components: 1, default: [1] },
        { name: 'drag', type: Float32Array, components: 1, default: [0] },
        { name: 'angularDrag', type: Float32Array, components: 1, default: [0.05] },
    ],
    initialCapacity: 2048,
};

/** Bounds data for culling */
export const BoundsSchema: MatrixSchema = {
    columns: [
        // AABB min
        { name: 'minX', type: Float32Array, components: 1, default: [-0.5] },
        { name: 'minY', type: Float32Array, components: 1, default: [-0.5] },
        { name: 'minZ', type: Float32Array, components: 1, default: [-0.5] },
        // AABB max
        { name: 'maxX', type: Float32Array, components: 1, default: [0.5] },
        { name: 'maxY', type: Float32Array, components: 1, default: [0.5] },
        { name: 'maxZ', type: Float32Array, components: 1, default: [0.5] },
        // Bounding sphere
        { name: 'sphereRadius', type: Float32Array, components: 1, default: [0.866] },
    ],
    initialCapacity: 4096,
};
