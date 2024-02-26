#version 300 es

precision highp float;

in vec2 position;
out vec2 pos;
out vec2 pxPos;
uniform vec2 screenSize;

void main() {
  pos = (position * 0.5) + 0.5;
  pxPos = pos * screenSize;
  gl_Position = vec4(position, 0.0, 1.0);
}
