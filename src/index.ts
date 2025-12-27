/**
 * PlayCanvas Engine - Hybrid TypeScript/Rust Engine
 * Unity-like API with Rust WASM optimizations
 *
 * @packageDocumentation
 */

// ==================== Core ====================
export {
    EngineObject,
    HideFlags
} from './core/Object';

export {
    Component
} from './core/Component';

export {
    Behaviour,
    MonoBehaviour
} from './core/Behaviour';

export {
    Transform,
    Space
} from './core/Transform';

export {
    GameObject,
    PrimitiveType
} from './core/GameObject';

export {
    Scene,
    SceneManager
} from './core/Scene';

export {
    Time
} from './core/Time';

// ==================== Math ====================
export {
    Vector3
} from './math/Vector3';

export {
    Vector4
} from './math/Vector4';

export {
    Quaternion
} from './math/Quaternion';

export {
    Matrix4x4
} from './math/Matrix4x4';

export {
    Mathf
} from './math/Mathf';

export {
    Color
} from './math/Color';

// ==================== WASM Bridge ====================
export {
    WasmBridge,
    OperationPool,
    OperationType
} from './wasm';

export type {
    WasmModule,
    WasmMathExports,
    WasmCullingExports,
    WasmAnimationExports,
    WasmParticlesExports
} from './wasm';

// ==================== Data-Oriented Design (DOD) ====================
export {
    // Data Matrix
    DataMatrix,
    DataColumn,
    TransformSchema,
    PhysicsSchema,
    BoundsSchema,
    // Dirty Tracker
    DirtyTracker,
    DirtyChannel,
    HierarchyDirtyPropagator,
    // Compute Pipeline
    ComputePipeline,
    ComputePassPriority,
    WorldMatrixPassDef,
    PhysicsPassDef,
    // Prediction System
    PredictionSystem,
    PredictionStrategy,
    ColumnPredictor,
    PredictionValidator,
    // Entity Manager
    EntityManager,
    ComponentFlags,
} from './data';

export type {
    MatrixSchema,
    ColumnDefinition,
    ComputePassDefinition,
    ComputePass,
    BufferBinding,
    ValidationResult,
    PredictionStats,
    EntityHandle,
} from './data';

// ==================== Engine Initialization ====================

/**
 * Engine configuration options
 */
export interface EngineConfig {
    /** Path to WASM file */
    wasmPath?: string;
    /** Target frames per second */
    targetFPS?: number;
    /** Enable WebGPU if available */
    preferWebGPU?: boolean;
    /** Canvas element or selector */
    canvas?: HTMLCanvasElement | string;
}

/**
 * Main engine class - manages initialization and game loop
 */
export class Engine {
    private static _instance: Engine | null = null;
    private _isRunning: boolean = false;
    private _frameId: number = 0;
    private _config: Required<EngineConfig>;

    private constructor(config: EngineConfig = {}) {
        this._config = {
            wasmPath: config.wasmPath ?? '/rust_core_bg.wasm',
            targetFPS: config.targetFPS ?? 60,
            preferWebGPU: config.preferWebGPU ?? true,
            canvas: config.canvas ?? null as unknown as HTMLCanvasElement,
        };
    }

    /** Get the engine instance */
    static get instance(): Engine {
        if (!this._instance) {
            throw new Error('Engine not initialized. Call Engine.init() first.');
        }
        return this._instance;
    }

    /** Check if engine is running */
    get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * Initialize the engine
     * @param config Engine configuration
     */
    static async init(config: EngineConfig = {}): Promise<Engine> {
        if (this._instance) {
            console.warn('Engine already initialized');
            return this._instance;
        }

        this._instance = new Engine(config);

        // Initialize WASM bridge
        await WasmBridge.init(config.wasmPath);

        // Initialize time system
        Time._init();

        // Create default scene
        SceneManager.createScene('Main');

        console.log('[Engine] Initialized successfully');
        console.log(`[Engine] WASM: ${WasmBridge.instance.usingFallback ? 'Fallback' : 'Native'}`);

        return this._instance;
    }

    /**
     * Start the game loop
     */
    start(): void {
        if (this._isRunning) {
            console.warn('Engine already running');
            return;
        }

        this._isRunning = true;
        this._gameLoop();
        console.log('[Engine] Started');
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        if (!this._isRunning) {
            return;
        }

        this._isRunning = false;
        if (this._frameId) {
            cancelAnimationFrame(this._frameId);
            this._frameId = 0;
        }
        console.log('[Engine] Stopped');
    }

    private _gameLoop = (): void => {
        if (!this._isRunning) return;

        // Update time
        Time._update();

        // Flush WASM operation pool
        OperationPool.instance.flush();

        // Fixed update loop
        const fixedDeltaTime = Time.fixedDeltaTime;
        let accumulator = Time.deltaTime;

        while (accumulator >= fixedDeltaTime) {
            Time._fixedUpdate();
            SceneManager._fixedUpdate(fixedDeltaTime);
            accumulator -= fixedDeltaTime;
        }

        // Update
        SceneManager._update(Time.deltaTime);

        // Late update
        SceneManager._lateUpdate(Time.deltaTime);

        // TODO: Render

        // Schedule next frame
        this._frameId = requestAnimationFrame(this._gameLoop);
    };

    /**
     * Dispose the engine and release resources
     */
    dispose(): void {
        this.stop();
        Engine._instance = null;
        console.log('[Engine] Disposed');
    }
}
