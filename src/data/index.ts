/**
 * Data-Oriented Design (DOD) Module
 *
 * Provides high-performance entity management with:
 * - GPU-friendly data storage (SOA layout)
 * - Dirty tracking with bitsets
 * - GPU compute pipeline
 * - Predictive computation with validation
 */

// Data Matrix - GPU-friendly data storage
export {
    DataMatrix,
    DataColumn,
    TransformSchema,
    PhysicsSchema,
    BoundsSchema,
} from './DataMatrix';
export type {
    MatrixSchema,
    ColumnDefinition,
    TypedArrayConstructor,
} from './DataMatrix';

// Dirty Tracker - Change tracking
export {
    DirtyTracker,
    DirtyChannel,
    HierarchyDirtyPropagator,
} from './DirtyTracker';

// Compute Pipeline - GPU batch operations
export {
    ComputePipeline,
    ComputePassPriority,
    WorldMatrixPassDef,
    PhysicsPassDef,
} from './ComputePipeline';
export type {
    ComputePassDefinition,
    ComputePass,
    BufferBinding,
} from './ComputePipeline';

// Prediction System - Predictive computation
export {
    PredictionSystem,
    PredictionStrategy,
    ColumnPredictor,
    PredictionValidator,
} from './PredictionSystem';
export type {
    ValidationResult,
    PredictionStats,
} from './PredictionSystem';

// Entity Manager - High-level API
export {
    EntityManager,
    ComponentFlags,
} from './EntityManager';
export type {
    EntityHandle,
} from './EntityManager';
