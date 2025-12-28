/**
 * Render Pipeline - manages shader loading and rendering configuration.
 */

import { GraphicsDevice } from '../graphics/GraphicsDevice';
import { Shader } from '../graphics/Shader';
import { ForwardRenderer, RenderSettings, RenderStats } from './ForwardRenderer';
import type { Camera } from '../components/Camera';
import type { Light } from '../components/Light';
import type { MeshRenderer } from '../components/MeshRenderer';

// Inline shader sources (compiled from GLSL files)
const STANDARD_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_Position;
layout(location = 1) in vec3 a_Normal;
layout(location = 2) in vec2 a_TexCoord0;
layout(location = 3) in vec2 a_TexCoord1;
layout(location = 4) in vec4 a_Tangent;
layout(location = 5) in vec4 a_Color;

uniform mat4 _ModelMatrix;
uniform mat4 _ViewMatrix;
uniform mat4 _ProjectionMatrix;
uniform mat4 _ModelViewMatrix;
uniform mat4 _ModelViewProjectionMatrix;
uniform mat3 _NormalMatrix;

out vec3 v_WorldPosition;
out vec3 v_WorldNormal;
out vec2 v_TexCoord0;
out vec2 v_TexCoord1;
out vec4 v_Color;
out vec3 v_ViewDir;
out mat3 v_TBN;

void main() {
    vec4 worldPos = _ModelMatrix * vec4(a_Position, 1.0);
    v_WorldPosition = worldPos.xyz;
    v_WorldNormal = normalize(_NormalMatrix * a_Normal);
    v_TexCoord0 = a_TexCoord0;
    v_TexCoord1 = a_TexCoord1;
    v_Color = a_Color;
    vec3 cameraPos = -(_ViewMatrix[3].xyz * mat3(_ViewMatrix));
    v_ViewDir = normalize(cameraPos - v_WorldPosition);
    vec3 T = normalize(_NormalMatrix * a_Tangent.xyz);
    vec3 N = v_WorldNormal;
    vec3 B = cross(N, T) * a_Tangent.w;
    v_TBN = mat3(T, B, N);
    gl_Position = _ModelViewProjectionMatrix * vec4(a_Position, 1.0);
}`;

const STANDARD_FRAG = `#version 300 es
precision highp float;

in vec3 v_WorldPosition;
in vec3 v_WorldNormal;
in vec2 v_TexCoord0;
in vec2 v_TexCoord1;
in vec4 v_Color;
in vec3 v_ViewDir;
in mat3 v_TBN;

uniform vec4 _Color;
uniform float _Metallic;
uniform float _Smoothness;
uniform float _Opacity;
uniform sampler2D _MainTex;
uniform vec4 _AmbientLight;
uniform float _LightCount;
uniform vec4 _Light0_PosType;
uniform vec4 _Light0_DirRange;
uniform vec4 _Light0_ColorIntensity;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    vec4 albedoSample = texture(_MainTex, v_TexCoord0) * _Color * v_Color;
    vec3 albedo = albedoSample.rgb;
    float alpha = albedoSample.a * _Opacity;
    if (alpha < 0.001) discard;

    vec3 N = normalize(v_WorldNormal);
    vec3 V = normalize(v_ViewDir);
    float roughness = max(1.0 - _Smoothness, 0.04);

    vec3 Lo = vec3(0.0);

    if (_LightCount >= 1.0 && _Light0_ColorIntensity.a > 0.0) {
        vec3 L;
        float atten = 1.0;
        if (_Light0_PosType.w == 0.0) {
            L = normalize(-_Light0_DirRange.xyz);
        } else {
            vec3 toLight = _Light0_PosType.xyz - v_WorldPosition;
            float dist = length(toLight);
            L = toLight / dist;
            float range = _Light0_DirRange.w;
            if (dist < range) {
                float ratio = dist / range;
                atten = max(0.0, 1.0 - ratio * ratio);
                atten *= atten;
            } else {
                atten = 0.0;
            }
        }
        float NdotL = max(dot(N, L), 0.0);
        vec3 H = normalize(V + L);
        float NdotH = max(dot(N, H), 0.0);
        float spec = pow(NdotH, (1.0 - roughness) * 128.0);
        vec3 diffuse = albedo * NdotL;
        vec3 specular = vec3(spec) * (1.0 - roughness);
        Lo += (diffuse + specular * _Metallic) * _Light0_ColorIntensity.rgb * _Light0_ColorIntensity.a * atten;
    }

    vec3 ambient = _AmbientLight.rgb * albedo;
    vec3 color = ambient + Lo;
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));

    fragColor = vec4(color, alpha);
}`;

const UNLIT_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_Position;
layout(location = 2) in vec2 a_TexCoord0;
layout(location = 5) in vec4 a_Color;
uniform mat4 _ModelViewProjectionMatrix;
out vec2 v_TexCoord0;
out vec4 v_Color;
void main() {
    v_TexCoord0 = a_TexCoord0;
    v_Color = a_Color;
    gl_Position = _ModelViewProjectionMatrix * vec4(a_Position, 1.0);
}`;

const UNLIT_FRAG = `#version 300 es
precision highp float;
in vec2 v_TexCoord0;
in vec4 v_Color;
uniform vec4 _Color;
uniform sampler2D _MainTex;
uniform float _Opacity;
out vec4 fragColor;
void main() {
    vec4 texColor = texture(_MainTex, v_TexCoord0);
    vec4 finalColor = texColor * _Color * v_Color;
    finalColor.a *= _Opacity;
    if (finalColor.a < 0.001) discard;
    fragColor = finalColor;
}`;

export interface RenderPipelineOptions {
    /** Render settings */
    settings?: Partial<RenderSettings>;
}

/**
 * RenderPipeline manages the rendering process.
 *
 * @example
 * const pipeline = new RenderPipeline(device);
 * pipeline.render(scene);
 */
export class RenderPipeline {
    private _device: GraphicsDevice;
    private _renderer: ForwardRenderer;
    private _standardShader: Shader | null = null;
    private _unlitShader: Shader | null = null;
    private _initialized: boolean = false;

    constructor(device: GraphicsDevice, options?: RenderPipelineOptions) {
        this._device = device;
        this._renderer = new ForwardRenderer(device, options?.settings);
    }

    /** Get the forward renderer */
    get renderer(): ForwardRenderer {
        return this._renderer;
    }

    /** Get render statistics */
    get stats(): RenderStats {
        return this._renderer.stats;
    }

    /** Get/set render settings */
    get settings(): RenderSettings {
        return this._renderer.settings;
    }

    /** Get the standard shader */
    get standardShader(): Shader | null {
        return this._standardShader;
    }

    /** Get the unlit shader */
    get unlitShader(): Shader | null {
        return this._unlitShader;
    }

    /**
     * Initialize the render pipeline and compile shaders.
     */
    initialize(): boolean {
        if (this._initialized) return true;

        try {
            // Compile standard shader
            this._standardShader = new Shader(this._device, {
                name: 'Standard',
                vertexCode: STANDARD_VERT,
                fragmentCode: STANDARD_FRAG
            });

            // Compile unlit shader
            this._unlitShader = new Shader(this._device, {
                name: 'Unlit',
                vertexCode: UNLIT_VERT,
                fragmentCode: UNLIT_FRAG
            });

            this._initialized = true;
            console.log('[RenderPipeline] Initialized with shaders');
            return true;
        } catch (error) {
            console.error('[RenderPipeline] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Render the scene.
     * @param cameras - Cameras to render from
     * @param lights - Scene lights
     * @param renderers - Objects to render
     */
    render(cameras: Camera[], lights: Light[], renderers: MeshRenderer[]): void {
        if (!this._initialized) {
            this.initialize();
        }

        this._renderer.render(cameras, lights, renderers);
    }

    /**
     * Resize the pipeline for a new canvas size.
     */
    resize(width: number, height: number): void {
        this._renderer.resize(width, height);
    }

    /**
     * Dispose the pipeline and release resources.
     */
    dispose(): void {
        this._renderer.dispose();
        this._standardShader?.destroy();
        this._unlitShader?.destroy();
        this._standardShader = null;
        this._unlitShader = null;
        this._initialized = false;
    }
}
