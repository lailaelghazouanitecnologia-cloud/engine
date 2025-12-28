#version 300 es
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
}
