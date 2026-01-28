uniform float progress;
attribute vec3 galacticPosition;
attribute vec3 latentPosition;
attribute vec3 instanceColor;
attribute float instanceSize;
varying vec3 vColor;

void main() {
    vColor = instanceColor;

    vec3 finalPosition = mix(galacticPosition, latentPosition, progress);
    vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float uniformSize = 1.0;
    float finalSize = mix(instanceSize, uniformSize, progress);  
    gl_PointSize = finalSize * (300.0 / -mvPosition.z);
}