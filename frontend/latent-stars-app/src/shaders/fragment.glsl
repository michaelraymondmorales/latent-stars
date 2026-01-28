varying vec3 vColor;

void main() { 
    // Get the coordinate of the pixel within the point's square (ranging from 0 to 1)
    vec2 coords = gl_PointCoord - 0.5;
    
    // Calculate the distance from the center
    float dist = dot(coords, coords);

    // If outside the circle, discard the pixel
    if (dist > 0.25) {
        discard;
    }
    
    gl_FragColor = vec4(vColor, 1.0);
}