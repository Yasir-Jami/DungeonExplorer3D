/// Get the canvas and WebGL context
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
var playerFlag = true;
var chestFlag = true;
var randomFlag = false;
var r = 0.8;
var g = 0.5;
var b = 0.0;
var a = 0.5;

floor = 0;

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
uniform vec4 fColor;


void main() {
  gl_FragColor = fColor; 
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

function interact(x, y, z) {
    const text = document.getElementById('interact-text');
    if (x == chestPosition.x && y == chestPosition.y && z == chestPosition.z) {
        text.innerHTML = "Got an item!";
        // Do not draw chest
        chestFlag = false;
    }

    else if (x == 7 && y == 0.5 && z == 7) { // Bottom right of grid
        text.innerHTML = "Moving to the next floor.";
        // Draw chest
        gl.uniform4f(fColorLocation, 0.0, 0.0, 1.0, 0.5);
        chestFlag = true;
        console.log("Current floor: " + floor);
        randomFlag = true;
        if (floor < 3) {
            floor += 1;
        }

        else {
            floor = 0; // reset to original color
        }
        
    }

    else {
        text.innerHTML = "Nothing here.";
    }
}

function randomizeChestPosition() {
    const max = 6;
    const min = -6;
    const x = Math.floor(Math.random() * (max - min) + min);
    const y = 0.5;
    const z = Math.floor(Math.random() * (max - min) + min);
    return { x, y, z };
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
const fColorLocation = gl.getUniformLocation(program, "fColor");

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
  -cubeSize, cubeSize, cubeSize,
  cubeSize, cubeSize, cubeSize,
  -cubeSize, 0, cubeSize,
  -cubeSize, 0, cubeSize,
  cubeSize, 0, cubeSize,
  cubeSize, cubeSize, cubeSize,

  // Back face
  -cubeSize, 0, -cubeSize,
  cubeSize, 0, -cubeSize,
  -cubeSize, cubeSize, -cubeSize,

  cubeSize, 0, -cubeSize,
  cubeSize, cubeSize, -cubeSize,
  -cubeSize, cubeSize, -cubeSize,

  // Left face
  -cubeSize, 0, -cubeSize,
  -cubeSize, 0, cubeSize,
  -cubeSize, cubeSize, -cubeSize,

  -cubeSize, 0, cubeSize,
  -cubeSize, cubeSize, cubeSize,
  -cubeSize, cubeSize, -cubeSize,

  // Right face
  cubeSize, 0, -cubeSize,
  cubeSize, 0, cubeSize,
  cubeSize, cubeSize, -cubeSize,

  cubeSize, 0, cubeSize,
  cubeSize, cubeSize, cubeSize,
  cubeSize, cubeSize, -cubeSize,

  // Top face
  -cubeSize, cubeSize, -cubeSize,
  cubeSize, cubeSize, cubeSize,
  -cubeSize, cubeSize, cubeSize,

  -cubeSize, cubeSize, -cubeSize,
  cubeSize, cubeSize, cubeSize,
  cubeSize, cubeSize, -cubeSize,

  // Bottom face
  -cubeSize, 0, -cubeSize,
  cubeSize, 0, cubeSize,
  -cubeSize, 0, cubeSize,

  -cubeSize, 0, -cubeSize,
  cubeSize, 0, cubeSize,
  cubeSize, 0, -cubeSize,
  
];

// Create a buffer for the cube
const cubeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

// Chest vertices
const chestSize = 0.5;
const chestVertices = [
  // Front face
  0, 0, chestSize,
  0, chestSize, chestSize,
  chestSize, 0, chestSize,
  chestSize, chestSize, chestSize,
  chestSize, 0, chestSize,
  0, chestSize, chestSize,

  // Back face
  0, 0, 0,
  chestSize, 0, 0,
  0, chestSize, 0,
  0, chestSize, 0,
  chestSize, chestSize, 0,
  chestSize, 0, 0,
  
  // Left face
  0, 0, 0,
  0, 0, chestSize,
  0, chestSize, 0,
  0, chestSize, 0,
  0, chestSize, chestSize,
  0, 0, chestSize,
  
  // Right face
  chestSize, 0, 0,
  chestSize, chestSize, 0, 
  chestSize, 0, chestSize,

  chestSize, 0, chestSize, 
  chestSize, chestSize, chestSize,
  chestSize, chestSize, 0,
  
  // Top face
  0, chestSize, 0, 
  chestSize, chestSize, chestSize,
  chestSize, chestSize, 0,

  0, chestSize, 0, 
  0, chestSize, chestSize,
  chestSize, chestSize, chestSize,

  // Bottom face
  0, 0, 0,
  chestSize, 0, chestSize,
  0, 0, chestSize,

  0, 0, 0,
  0, 0, chestSize,
  chestSize, 0, chestSize,

];

// Create a buffer for the cube
const chestBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, chestBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chestVertices), gl.STATIC_DRAW);

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
var chestPosition = { x: 5, y: chestSize, z: -3 };

// Movement step
const movementStep = 1;

// Define boundaries (same as walls' positions)
const boundary = {
    minX: -gridSize * gridGap + cubeSize,
    maxX: gridSize * gridGap - cubeSize,
    minZ: -gridSize * gridGap + cubeSize,
    maxZ: gridSize * gridGap - cubeSize,
};

/// track camera mode
let isTopDownView = true;

window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "g": // Toggle camera mode
            isTopDownView = !isTopDownView;
            updateCameraView();
            break;
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
            isTopDownView = true; 
            updateCameraView();
            break;
        case "e":
            interact(cubePosition.x, cubePosition.y, cubePosition.z);
            break;
    }
});

// Function to update the camera view
function updateCameraView() {
    mat4.identity(viewMatrix);

    if (isTopDownView) {
        // Top-down 
        mat4.lookAt(viewMatrix, [0, 10, 15], [0, 0, 0], [0, 1, 0]);
    } else {
        // POV 
        mat4.lookAt(
            viewMatrix,
            [cubePosition.x, cubePosition.y + 0.25, cubePosition.z], // Camera at cube's position
            [cubePosition.x, cubePosition.y, cubePosition.z - 1],   
            [0, 1, 0]                                             
        );
    }
}

// Initialize the camera
updateCameraView();

function updateCamera() {
    if (isTopDownView) {
        // Top-down view
        mat4.lookAt(viewMatrix, [cubePosition.x, 15, cubePosition.z + 0.1], [cubePosition.x, cubePosition.y, cubePosition.z], [0, 1, 0]);
    } else {
        // Over-the-shoulder view
        const offset = [0, 2, 5]; 
        const cameraPosition = [
            cubePosition.x - offset[0],
            cubePosition.y + offset[1],
            cubePosition.z + offset[2],
        ];
        mat4.lookAt(viewMatrix, cameraPosition, [cubePosition.x, cubePosition.y, cubePosition.z], [0, 1, 0]);
    }
}

function render() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);

  updateCamera();
  // Pass view and projection matrices
  gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
  gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
  gl.uniform4f(fColorLocation, r, g, b, a);

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
  
  // Change floor color
  if (floor == 0) {
    gl.uniform4f(fColorLocation, 0.4, 0.0, 1.0, 0.2); // purple
  }
  else if (floor == 1) {
    gl.uniform4f(fColorLocation, 1.0, 0.0, 0.0, 0.5); // red
  }
  else if (floor == 2) {
    gl.uniform4f(fColorLocation, 0.0, 1.0, 0.0, 0.5); // green
  }
  else if (floor == 3) {
    gl.uniform4f(fColorLocation, 1.0, 1.0, 0, 1.0); // yellow
  }
  
  gl.enableVertexAttribArray(positionAttribLocation);

  for (let i = 0; i < 4; i++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
  }

  // **Draw Cube (Dynamic)**
  if (playerFlag) {
    const cubeModelMatrix = mat4.create();
    mat4.translate(cubeModelMatrix, cubeModelMatrix, [cubePosition.x, cubePosition.y, cubePosition.z]);

    gl.uniformMatrix4fv(modelMatrixLocation, false, cubeModelMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.uniform4f(fColorLocation, 0.8, 0.5, 0.0, 0.5); // orange
    gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / 3);
  }

  // **Draw chest (Static)**
  if (chestFlag) {
    const chestModelMatrix = mat4.create();

    if (randomFlag) {
        chestPosition = randomizeChestPosition();
        randomFlag = false;
    } 
    
    mat4.translate(chestModelMatrix, chestModelMatrix, [chestPosition.x, chestPosition.y, chestPosition.z]);

    gl.uniformMatrix4fv(modelMatrixLocation, false, chestModelMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, chestBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4f(fColorLocation, 1.0, 1.0, 0.0, 0.5); // yellow
    gl.drawArrays(gl.TRIANGLES, 0, chestVertices.length / 3);
  }
  

  requestAnimationFrame(render);
}
render();
