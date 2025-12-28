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

export {
    EventHandler
} from './core/EventHandler';

export {
    EventHandle
} from './core/EventHandle';

export type {
    EventCallback
} from './core/EventHandle';

// ==================== Input ====================
export {
    // Keyboard
    Keyboard,
    KeyboardEvent,
    // Mouse
    Mouse,
    MouseEvent,
    isMousePointerLocked,
    // Constants
    KEY_BACKSPACE, KEY_TAB, KEY_RETURN, KEY_ENTER, KEY_SHIFT, KEY_CONTROL, KEY_ALT,
    KEY_PAUSE, KEY_CAPS_LOCK, KEY_ESCAPE, KEY_SPACE, KEY_PAGE_UP, KEY_PAGE_DOWN,
    KEY_END, KEY_HOME, KEY_LEFT, KEY_UP, KEY_RIGHT, KEY_DOWN, KEY_PRINT_SCREEN,
    KEY_INSERT, KEY_DELETE,
    KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9,
    KEY_A, KEY_B, KEY_C, KEY_D, KEY_E, KEY_F, KEY_G, KEY_H, KEY_I, KEY_J,
    KEY_K, KEY_L, KEY_M, KEY_N, KEY_O, KEY_P, KEY_Q, KEY_R, KEY_S, KEY_T,
    KEY_U, KEY_V, KEY_W, KEY_X, KEY_Y, KEY_Z,
    KEY_NUMPAD_0, KEY_NUMPAD_1, KEY_NUMPAD_2, KEY_NUMPAD_3, KEY_NUMPAD_4,
    KEY_NUMPAD_5, KEY_NUMPAD_6, KEY_NUMPAD_7, KEY_NUMPAD_8, KEY_NUMPAD_9,
    KEY_MULTIPLY, KEY_ADD, KEY_SEPARATOR, KEY_SUBTRACT, KEY_DECIMAL, KEY_DIVIDE,
    KEY_F1, KEY_F2, KEY_F3, KEY_F4, KEY_F5, KEY_F6, KEY_F7, KEY_F8, KEY_F9,
    KEY_F10, KEY_F11, KEY_F12,
    KEY_SEMICOLON, KEY_EQUAL, KEY_COMMA, KEY_PERIOD, KEY_SLASH, KEY_BACK_SLASH,
    KEY_OPEN_BRACKET, KEY_CLOSE_BRACKET, KEY_WINDOWS, KEY_CONTEXT_MENU, KEY_META,
    MOUSEBUTTON_NONE, MOUSEBUTTON_LEFT, MOUSEBUTTON_MIDDLE, MOUSEBUTTON_RIGHT,
} from './input';

export type {
    KeyboardOptions,
    PointerLockCallback,
} from './input';

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

export {
    MathBackend,
    BackendType
} from './math/MathBackend';

export type {
    BackendConfig
} from './math/MathBackend';

// ==================== Geometry ====================
export {
    Geometry,
    calculateNormals,
    calculateTangents,
    BoxGeometry,
    SphereGeometry,
    PlaneGeometry,
    CylinderGeometry,
    QuadGeometry,
} from './geometry';

export type {
    BoxGeometryOptions,
    SphereGeometryOptions,
    PlaneGeometryOptions,
    CylinderGeometryOptions,
    QuadGeometryOptions,
} from './geometry';

// ==================== Graphics ====================
export {
    // Constants
    DeviceType,
    PrimitiveType as GPUPrimitiveType,
    BlendMode,
    BlendEquation,
    CompareFunc,
    CullFace,
    PixelFormat,
    AddressMode,
    FilterMode,
    BufferUsage,
    VertexElementType,
    VertexSemantic,
    ShaderType,
    UniformType,
    ClearFlag,
    StencilOp,
    // Device factory
    createGraphicsDevice,
    isWebGPUSupported,
    isWebGL2Supported,
    getBestDeviceType,
    getSupportedDeviceTypes,
    // Core classes
    GraphicsDevice,
    VertexFormat,
    VertexBuffer,
    IndexBuffer,
    Texture,
    Shader,
    RenderTarget,
    Material,
    StandardMaterial,
    UnlitMaterial,
    Mesh,
} from './graphics';

export type {
    DeviceCapabilities,
    GraphicsDeviceOptions,
    CreateDeviceOptions,
    BlendState,
    DepthState,
    StencilState,
    VertexElement,
    VertexBufferOptions,
    IndexBufferOptions,
    TextureOptions,
    ShaderDefinition,
    UniformInfo,
    RenderTargetOptions,
    MaterialPropertyValue,
    BoundingBox,
    BoundingSphere,
} from './graphics';

// ==================== Components ====================
export {
    Camera,
    CameraProjection,
    CameraClearFlags,
    Light,
    LightType,
    LightShadows,
    MeshRenderer,
    ShadowCastingMode,
} from './components';

// ==================== Rendering ====================
export {
    ForwardRenderer,
    RenderPipeline,
} from './rendering';

export type {
    RenderSettings,
    RenderStats,
    RenderPipelineOptions,
} from './rendering';

// Internal imports for Engine class
import { GraphicsDevice as _GraphicsDevice } from './graphics/GraphicsDevice';
import { RenderPipeline as _RenderPipeline } from './rendering/RenderPipeline';
import { Time as _Time } from './core/Time';
import { SceneManager as _SceneManager } from './core/Scene';
type GraphicsDeviceType = InstanceType<typeof _GraphicsDevice>;
type RenderPipelineType = InstanceType<typeof _RenderPipeline>;
const Time = _Time;
const SceneManager = _SceneManager;

// ==================== WASM Bridge ====================
import { WasmBridge as _WasmBridge, OperationPool as _OperationPool } from './wasm';
export {
    WasmBridge,
    OperationPool,
    OperationType,
    WasmBatchProcessor,
    WasmOpCode,
} from './wasm';

// Internal references for use within Engine class
const WasmBridge = _WasmBridge;
const OperationPool = _OperationPool;

export type {
    WasmModule,
    WasmMathExports,
    WasmCullingExports,
    WasmAnimationExports,
    WasmParticlesExports,
    BatchStats,
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
    private _graphicsDevice: GraphicsDeviceType | null = null;
    private _renderPipeline: RenderPipelineType | null = null;

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

    /** Get the graphics device */
    get graphicsDevice(): GraphicsDeviceType | null {
        return this._graphicsDevice;
    }

    /** Get the render pipeline */
    get renderPipeline(): RenderPipelineType | null {
        return this._renderPipeline;
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

        // Initialize graphics if canvas provided
        if (this._instance._config.canvas) {
            let canvas: HTMLCanvasElement;
            if (typeof this._instance._config.canvas === 'string') {
                const el = document.querySelector(this._instance._config.canvas);
                if (el instanceof HTMLCanvasElement) {
                    canvas = el;
                } else {
                    throw new Error(`Canvas element not found: ${this._instance._config.canvas}`);
                }
            } else {
                canvas = this._instance._config.canvas;
            }

            this._instance._graphicsDevice = new _GraphicsDevice({ canvas });
            this._instance._renderPipeline = new _RenderPipeline(this._instance._graphicsDevice);
            this._instance._renderPipeline.initialize();
            console.log('[Engine] Graphics initialized');
        }

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

        // Render
        if (this._renderPipeline) {
            const scene = SceneManager.activeScene;
            if (scene) {
                const cameras = scene._getCameras();
                const lights = scene._getLights();
                const renderers = scene._getRenderers();
                this._renderPipeline.render(cameras, lights, renderers);
            }
        }

        // Schedule next frame
        this._frameId = requestAnimationFrame(this._gameLoop);
    };

    /**
     * Dispose the engine and release resources
     */
    dispose(): void {
        this.stop();

        // Clean up graphics resources
        this._renderPipeline?.dispose();
        this._graphicsDevice?.destroy();
        this._renderPipeline = null;
        this._graphicsDevice = null;

        Engine._instance = null;
        console.log('[Engine] Disposed');
    }
}
