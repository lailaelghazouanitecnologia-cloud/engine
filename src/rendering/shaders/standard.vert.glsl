#version 300 es
precision highp float;

// Vertex attributes
layout(location = 0) in vec3 a_Position;
layout(location = 1) in vec3 a_Normal;
layout(location = 2) in vec2 a_TexCoord0;
layout(location = 3) in vec2 a_TexCoord1;
layout(location = 4) in vec4 a_Tangent;
layout(location = 5) in vec4 a_Color;

// Transform matrices
uniform mat4 _ModelMatrix;
uniform mat4 _ViewMatrix;
uniform mat4 _ProjectionMatrix;
uniform mat4 _ModelViewMatrix;
uniform mat4 _ModelViewProjectionMatrix;
uniform mat3 _NormalMatrix;

// Outputs to fragment shader
out vec3 v_WorldPosition;
out vec3 v_WorldNormal;
out vec2 v_TexCoord0;
out vec2 v_TexCoord1;
out vec4 v_Color;
out vec3 v_ViewDir;
out mat3 v_TBN;

void main() {
    // World position
    vec4 worldPos = _ModelMatrix * vec4(a_Position, 1.0);
    v_WorldPosition = worldPos.xyz;

    // World normal
    v_WorldNormal = normalize(_NormalMatrix * a_Normal);

    // Texture coordinates
    v_TexCoord0 = a_TexCoord0;
    v_TexCoord1 = a_TexCoord1;

    // Vertex color
    v_Color = a_Color;

    // View direction (for specular)
    vec3 cameraPos = -(_ViewMatrix[3].xyz * mat3(_ViewMatrix));
    v_ViewDir = normalize(cameraPos - v_WorldPosition);

    // TBN matrix for normal mapping
    vec3 T = normalize(_NormalMatrix * a_Tangent.xyz);
    vec3 N = v_WorldNormal;
    vec3 B = cross(N, T) * a_Tangent.w;
    v_TBN = mat3(T, B, N);

    // Final position
    gl_Position = _ModelViewProjectionMatrix * vec4(a_Position, 1.0);
}
