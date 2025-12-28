#version 300 es
precision highp float;

// Inputs from vertex shader
in vec3 v_WorldPosition;
in vec3 v_WorldNormal;
in vec2 v_TexCoord0;
in vec2 v_TexCoord1;
in vec4 v_Color;
in vec3 v_ViewDir;
in mat3 v_TBN;

// Material properties
uniform vec4 _Color;
uniform float _Metallic;
uniform float _Smoothness;
uniform float _Opacity;
uniform sampler2D _MainTex;
uniform sampler2D _NormalMap;
uniform sampler2D _MetallicGlossMap;
uniform sampler2D _OcclusionMap;
uniform sampler2D _EmissionMap;
uniform vec4 _EmissionColor;
uniform float _NormalScale;
uniform float _OcclusionStrength;

// Lighting
uniform vec4 _AmbientLight;
uniform float _LightCount;

// Light uniforms (up to 4 lights)
uniform vec4 _Light0_PosType;
uniform vec4 _Light0_DirRange;
uniform vec4 _Light0_ColorIntensity;
uniform vec4 _Light0_SpotShadow;

uniform vec4 _Light1_PosType;
uniform vec4 _Light1_DirRange;
uniform vec4 _Light1_ColorIntensity;
uniform vec4 _Light1_SpotShadow;

uniform vec4 _Light2_PosType;
uniform vec4 _Light2_DirRange;
uniform vec4 _Light2_ColorIntensity;
uniform vec4 _Light2_SpotShadow;

uniform vec4 _Light3_PosType;
uniform vec4 _Light3_DirRange;
uniform vec4 _Light3_ColorIntensity;
uniform vec4 _Light3_SpotShadow;

// Fog
uniform float _FogEnabled;
uniform vec4 _FogColor;
uniform float _FogStart;
uniform float _FogEnd;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265359;

// PBR functions
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Light attenuation
float getAttenuation(float lightType, float distance, float range) {
    if (lightType == 0.0) return 1.0; // Directional
    if (distance >= range) return 0.0;
    float ratio = distance / range;
    float atten = max(0.0, 1.0 - ratio * ratio);
    return atten * atten;
}

// Spot attenuation
float getSpotAttenuation(float lightType, float dotProduct, float outerCos, float innerCos) {
    if (lightType != 2.0) return 1.0; // Not spot
    if (dotProduct <= outerCos) return 0.0;
    if (dotProduct >= innerCos) return 1.0;
    float t = (dotProduct - outerCos) / (innerCos - outerCos);
    return t * t;
}

// Calculate single light contribution
vec3 calculateLight(
    vec3 lightPos, float lightType, vec3 lightDir, float lightRange,
    vec3 lightColor, float lightIntensity,
    float spotOuterCos, float spotInnerCos,
    vec3 N, vec3 V, vec3 worldPos,
    vec3 albedo, float metallic, float roughness, vec3 F0
) {
    vec3 L;
    float attenuation = 1.0;

    if (lightType == 0.0) {
        // Directional light
        L = normalize(-lightDir);
    } else {
        // Point/Spot light
        vec3 toLight = lightPos - worldPos;
        float distance = length(toLight);
        L = toLight / distance;
        attenuation = getAttenuation(lightType, distance, lightRange);

        // Spot attenuation
        if (lightType == 2.0) {
            float spotDot = dot(-L, normalize(lightDir));
            attenuation *= getSpotAttenuation(lightType, spotDot, spotOuterCos, spotInnerCos);
        }
    }

    if (attenuation <= 0.0) return vec3(0.0);

    vec3 H = normalize(V + L);

    // Cook-Torrance BRDF
    float NDF = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;

    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
    vec3 specular = numerator / denominator;

    float NdotL = max(dot(N, L), 0.0);

    return (kD * albedo / PI + specular) * lightColor * lightIntensity * attenuation * NdotL;
}

void main() {
    // Sample textures
    vec4 albedoSample = texture(_MainTex, v_TexCoord0) * _Color * v_Color;
    vec3 albedo = albedoSample.rgb;
    float alpha = albedoSample.a * _Opacity;

    // Alpha test
    if (alpha < 0.001) discard;

    // Normal mapping
    vec3 N = v_WorldNormal;
    vec3 normalMap = texture(_NormalMap, v_TexCoord0).rgb;
    if (length(normalMap) > 0.1) {
        normalMap = normalMap * 2.0 - 1.0;
        normalMap.xy *= _NormalScale;
        N = normalize(v_TBN * normalMap);
    }

    // Metallic/Smoothness
    vec4 metallicGloss = texture(_MetallicGlossMap, v_TexCoord0);
    float metallic = metallicGloss.r * _Metallic;
    float roughness = 1.0 - (metallicGloss.a * _Smoothness);
    roughness = max(roughness, 0.04);

    // Occlusion
    float occlusion = mix(1.0, texture(_OcclusionMap, v_TexCoord0).r, _OcclusionStrength);

    // View direction
    vec3 V = normalize(v_ViewDir);

    // Calculate reflectance at normal incidence
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);

    // Lighting
    vec3 Lo = vec3(0.0);

    // Light 0
    if (_LightCount >= 1.0 && _Light0_ColorIntensity.a > 0.0) {
        Lo += calculateLight(
            _Light0_PosType.xyz, _Light0_PosType.w,
            _Light0_DirRange.xyz, _Light0_DirRange.w,
            _Light0_ColorIntensity.rgb, _Light0_ColorIntensity.a,
            _Light0_SpotShadow.x, _Light0_SpotShadow.y,
            N, V, v_WorldPosition,
            albedo, metallic, roughness, F0
        );
    }

    // Light 1
    if (_LightCount >= 2.0 && _Light1_ColorIntensity.a > 0.0) {
        Lo += calculateLight(
            _Light1_PosType.xyz, _Light1_PosType.w,
            _Light1_DirRange.xyz, _Light1_DirRange.w,
            _Light1_ColorIntensity.rgb, _Light1_ColorIntensity.a,
            _Light1_SpotShadow.x, _Light1_SpotShadow.y,
            N, V, v_WorldPosition,
            albedo, metallic, roughness, F0
        );
    }

    // Light 2
    if (_LightCount >= 3.0 && _Light2_ColorIntensity.a > 0.0) {
        Lo += calculateLight(
            _Light2_PosType.xyz, _Light2_PosType.w,
            _Light2_DirRange.xyz, _Light2_DirRange.w,
            _Light2_ColorIntensity.rgb, _Light2_ColorIntensity.a,
            _Light2_SpotShadow.x, _Light2_SpotShadow.y,
            N, V, v_WorldPosition,
            albedo, metallic, roughness, F0
        );
    }

    // Light 3
    if (_LightCount >= 4.0 && _Light3_ColorIntensity.a > 0.0) {
        Lo += calculateLight(
            _Light3_PosType.xyz, _Light3_PosType.w,
            _Light3_DirRange.xyz, _Light3_DirRange.w,
            _Light3_ColorIntensity.rgb, _Light3_ColorIntensity.a,
            _Light3_SpotShadow.x, _Light3_SpotShadow.y,
            N, V, v_WorldPosition,
            albedo, metallic, roughness, F0
        );
    }

    // Ambient lighting
    vec3 ambient = _AmbientLight.rgb * albedo * occlusion;

    // Emission
    vec3 emission = texture(_EmissionMap, v_TexCoord0).rgb * _EmissionColor.rgb;

    // Final color
    vec3 color = ambient + Lo + emission;

    // Fog
    if (_FogEnabled > 0.5) {
        float dist = length(v_WorldPosition);
        float fogFactor = clamp((dist - _FogStart) / (_FogEnd - _FogStart), 0.0, 1.0);
        color = mix(color, _FogColor.rgb, fogFactor);
    }

    // Tone mapping (simple Reinhard)
    color = color / (color + vec3(1.0));

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

    fragColor = vec4(color, alpha);
}
