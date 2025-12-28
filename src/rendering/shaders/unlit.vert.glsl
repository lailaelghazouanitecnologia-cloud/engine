#version 300 es
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
}
