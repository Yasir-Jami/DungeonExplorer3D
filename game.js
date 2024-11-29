/// Get the canvas and WebGL context
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

// Check if WebGL is supported
if (!gl) {
    console.error("WebGL not supported");
    alert("WebGL not supported in this browser.");
}

// Vertex shader source
const vertexShaderSource = `
attribute vec3 a_position;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main() {
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
}
`;

// Fragment shader source
const fragmentShaderSource = `
precision mediump float;

void main() {
    gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0); // Gray color for walls
}
`;

// Shader compilation
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation failed: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Program linking
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking failed: ", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
if (!program) {
    alert("Could not create shaders.");
}

// Get attribute and uniform locations
const positionAttribLocation = gl.getAttribLocation(program, "a_position");
const modelMatrixLocation = gl.getUniformLocation(program, "u_modelMatrix");
const viewMatrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
const projectionMatrixLocation = gl.getUniformLocation(program, "u_projectionMatrix");

// Create grid vertices
const gridVertices = [];
const gridSize = 7.5;
const gridGap = 1;

for (let i = -gridSize; i <= gridSize; i++) {
    // Horizontal lines
    gridVertices.push(-gridSize * gridGap, 0, i * gridGap);
    gridVertices.push(gridSize * gridGap, 0, i * gridGap);

    // Vertical lines
    gridVertices.push(i * gridGap, 0, -gridSize * gridGap);
    gridVertices.push(i * gridGap, 0, gridSize * gridGap);
}

// Wall vertices
const wallHeight = 1;
const wallVertices = [];

// Front wall
wallVertices.push(
    -gridSize * gridGap, 0, -gridSize * gridGap,  // Bottom left
    gridSize * gridGap, 0, -gridSize * gridGap,   // Bottom right
    -gridSize * gridGap, wallHeight, -gridSize * gridGap, // Top left
    gridSize * gridGap, wallHeight, -gridSize * gridGap   // Top right
);

// Back wall
wallVertices.push(
    -gridSize * gridGap, 0, gridSize * gridGap,  // Bottom left
    gridSize * gridGap, 0, gridSize * gridGap,   // Bottom right
    -gridSize * gridGap, wallHeight, gridSize * gridGap, // Top left
    gridSize * gridGap, wallHeight, gridSize * gridGap   // Top right
);

// Left wall
wallVertices.push(
    -gridSize * gridGap, 0, -gridSize * gridGap,  // Bottom front
    -gridSize * gridGap, 0, gridSize * gridGap,   // Bottom back
    -gridSize * gridGap, wallHeight, -gridSize * gridGap, // Top front
    -gridSize * gridGap, wallHeight, gridSize * gridGap   // Top back
);

// Right wall
wallVertices.push(
    gridSize * gridGap, 0, -gridSize * gridGap,  // Bottom front
    gridSize * gridGap, 0, gridSize * gridGap,   // Bottom back
    gridSize * gridGap, wallHeight, -gridSize * gridGap, // Top front
    gridSize * gridGap, wallHeight, gridSize * gridGap   // Top back
);

// Create buffers
const gridBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridVertices), gl.STATIC_DRAW);

const wallBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, wallBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wallVertices), gl.STATIC_DRAW);
// Cube vertices
const cubeSize = 0.5;
const cubeVertices = [
  // Front face
  -cubeSize, -cubeSize,  cubeSize,
   cubeSize, -cubeSize,  cubeSize,
  -cubeSize,  cubeSize,  cubeSize,
   cubeSize,  cubeSize,  cubeSize,

  // Back face
  -cubeSize, -cubeSize, -cubeSize,
   cubeSize, -cubeSize, -cubeSize,
  -cubeSize,  cubeSize, -cubeSize,
   cubeSize,  cubeSize, -cubeSize,

  // Left face
  -cubeSize, -cubeSize, -cubeSize,
  -cubeSize, -cubeSize,  cubeSize,
  -cubeSize,  cubeSize, -cubeSize,
  -cubeSize,  cubeSize,  cubeSize,

  // Right face
   cubeSize, -cubeSize, -cubeSize,
   cubeSize, -cubeSize,  cubeSize,
   cubeSize,  cubeSize, -cubeSize,
   cubeSize,  cubeSize,  cubeSize,

  // Top face
  -cubeSize,  cubeSize,  cubeSize,
   cubeSize,  cubeSize,  cubeSize,
  -cubeSize,  cubeSize, -cubeSize,
   cubeSize,  cubeSize, -cubeSize,

  // Bottom face
  -cubeSize, -cubeSize,  cubeSize,
   cubeSize, -cubeSize,  cubeSize,
  -cubeSize, -cubeSize, -cubeSize,
   cubeSize, -cubeSize, -cubeSize,
];

// Create a buffer for the cube
const cubeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);


// Enable depth testing
gl.enable(gl.DEPTH_TEST);

// Set up camera
const modelMatrix = mat4.create();
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();

mat4.lookAt(viewMatrix, [0, 10, 15], [0, 0, 0], [0, 1, 0]); // Camera position and target
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0); // Projection

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


// Cube position
const cubePosition = { x: 0, y: cubeSize, z: 0 };

// Movement step
const movementStep = 1;

// Define boundaries (same as walls' positions)
const boundary = {
    minX: -gridSize * gridGap + cubeSize,
    maxX: gridSize * gridGap - cubeSize,
    minZ: -gridSize * gridGap + cubeSize,
    maxZ: gridSize * gridGap - cubeSize,
};

// Handle keyboard input for movement
window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "w": // Move forward
            if (cubePosition.z - movementStep >= boundary.minZ) {
                cubePosition.z -= movementStep;
            }
            break;
        case "s": // Move backward
            if (cubePosition.z + movementStep <= boundary.maxZ) {
                cubePosition.z += movementStep;
            }
            break;
        case "a": // Move left
            if (cubePosition.x - movementStep >= boundary.minX) {
                cubePosition.x -= movementStep;
            }
            break;
        case "d": // Move right
            if (cubePosition.x + movementStep <= boundary.maxX) {
                cubePosition.x += movementStep;
            }
            break;
        case "r": // Reset position
            cubePosition.x = 0;
            cubePosition.y = cubeSize;
            cubePosition.z = 0;
            mat4.identity(viewMatrix); // Reset camera view
            mat4.lookAt(viewMatrix, [0, 10, 15], [0, 0, 0], [0, 1, 0]); // Reset camera position
            break;
    }
});

// Mouse movement for rotating camera
let isMouseDown = false;
let lastMousePosition = { x: 0, y: 0 };

// Track mouse events
canvas.addEventListener("mousedown", (event) => {
    isMouseDown = true;
    lastMousePosition = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        const deltaX = event.clientX - lastMousePosition.x;
        const deltaY = event.clientY - lastMousePosition.y;

        // Rotate the view matrix based on mouse movement
        mat4.rotateY(viewMatrix, viewMatrix, deltaX * 0.01);
        mat4.rotateX(viewMatrix, viewMatrix, deltaY * 0.01);

        lastMousePosition = { x: event.clientX, y: event.clientY };
    }
});
canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
});
canvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
});

function render() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);

  // Pass view and projection matrices
  gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
  gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

  // **Draw Grid (Static)**
  const gridModelMatrix = mat4.create(); // Identity matrix for static grid
  gl.uniformMatrix4fv(modelMatrixLocation, false, gridModelMatrix);
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.drawArrays(gl.LINES, 0, gridVertices.length / 3);

  // **Draw Walls (Static)**
  const wallModelMatrix = mat4.create(); // Identity matrix for static walls
  gl.uniformMatrix4fv(modelMatrixLocation, false, wallModelMatrix);
  gl.bindBuffer(gl.ARRAY_BUFFER, wallBuffer);
  gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionAttribLocation);

  for (let i = 0; i < 4; i++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
  }

  // **Draw Cube (Dynamic)**
  const cubeModelMatrix = mat4.create();
  mat4.translate(cubeModelMatrix, cubeModelMatrix, [cubePosition.x, cubePosition.y, cubePosition.z]);

  gl.uniformMatrix4fv(modelMatrixLocation, false, cubeModelMatrix);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / 3);

  requestAnimationFrame(render);
}
render();
