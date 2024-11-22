main();

/************************************
 * MAIN
 ************************************/


function main() {

    console.log("Setting up the canvas");

    // Find the canavas tag in the HTML document
    const canvas = document.querySelector("#gamecanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }
}

function doDrawing(gl, canvas, inputTriangles) {
    // Create a state for our scene

    var state = {
        camera: {
            position: vec3.fromValues(0.5, 0.5, -0.5),
            center: vec3.fromValues(0.5, 0.5, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        objects: [],
        canvas: canvas,
        selectedIndex: 0,
        hasSelected: false,
    };

    for (var i = 0; i < inputTriangles.length; i++) {
        state.objects.push(
            {
                name: inputTriangles[i].name,
                model: {
                    position: vec3.fromValues(0.0, 0.0, 0.5),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(1.0, 1.0, 1.0),
                },
                // this will hold the shader info for each object
                programInfo: transformShader(gl),
                buffers: undefined,
                centroid: calculateCentroid(inputTriangles[i].vertices),
                // TXDO: Add more object specific state like material color, ...
                color: new Float32Array(inputTriangles[i].material.diffuse), // Array of color
            }
        );

        initBuffers(gl, state.objects[i], inputTriangles[i].vertices.flat(), inputTriangles[i].triangles.flat());
    }

    setupKeypresses(state);

    //console.log(state)

    console.log("Starting rendering loop");
    startRendering(gl, state);
}


/************************************
 * RENDERING CALLS
 ************************************/

function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        // Draw our scene
        drawScene(gl, deltaTime, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * Draws the scene. Should be called every frame
 * 
 * @param  {} gl WebGL2 context
 * @param {number} deltaTime Time between each rendering call
 */
function drawScene(gl, deltaTime, state) {
    // Set clear colour
    // This is a Red-Green-Blue-Alpha colour
    // See https://en.wikipedia.org/wiki/RGB_color_model
    // Here we use floating point values. In other places you may see byte representation (0-255).
    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    // Depth testing allows WebGL to figure out what order to draw our objects such that the look natural.
    // We want to draw far objects first, and then draw nearer objects on top of those to obscure them.
    // To determine the order to draw, WebGL can test the Z value of the objects.
    // The z-axis goes out of the screen
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clearDepth(1.0); // Clear everything

    // Clear the color and depth buffer with specified clear colour.
    // This will replace everything that was in the previous frame with the clear colour.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.forEach((object) => {
        // Choose to use our shader
        gl.useProgram(object.programInfo.program);

        //  Update uniforms with state variables values
        {
            //  setup projection matrix (this doesn't change)
            // use same params as in the lab5 example
            // fovy = 60, deg, near=0.1, far=100
            // Generate the projection matrix using perspective
            // link to corresponding uniform object.programInfo.uniformLocations.[...]
            var projectionMatrix = mat4.create();
            //var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
            var fovy = 60.0;
            var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            var near = 0.1; // Near clipping plane
            var far = 100.0; // Far clipping plane
            // Generate the projection matrix using perspective
            mat4.perspective(projectionMatrix, fovy, aspect, near, far);

            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);

            //  update view matrix with state.camera
            // use mat4.lookAt to generate the view matrix
            // link to corresponding uniform object.programInfo.uniformLocations.[...]
            var viewMatrix = mat4.create();
            mat4.lookAt(
                viewMatrix,
                state.camera.position,
                state.camera.center,
                state.camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);
            
            //  Update model transform
            // apply modeling transformations in correct order using
            // object.model.position, object.model.rotation, object.model.scale
            // for correct rotation wr centroid here is the order of operations 
            // in reverese order of how they should be applied 
            // translation (object.model.position), translation(centroid), rotation, scale, translation(negative certoid)
            // link to corresponding uniform object.programInfo.uniformLocations.[...]
            
            // Update model transform
            var modelMatrix = mat4.create();
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            // Apply rotation
            var angle = Math.PI/12;
            mat4.rotate(modelMatrix, modelMatrix, angle, object.model.rotation);
            // Apply scale
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);

            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
           
            //  Update other uniforms like colors
            var colorMatrix = mat4.create();
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.color, false, colorMatrix);

        }
        // Draw 
        {
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);

            // Draw the object
            const offset = 0; // Number of elements to skip before starting
            gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
        }
    });
}


/************************************
 * UI EVENTS
 ************************************/

function setupKeypresses(state) {
    document.addEventListener("keydown", (event) => {
        console.log(event.code);
        event.preventDefault();

        //console.log(state.hasSelected);
        var object = state.objects[state.selectedIndex];
        switch (event.code) {
            case "KeyA":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        //  Rotate selected object around Y
                        mat4.rotateY(object.model.rotation, object.model.rotation, Math.PI/12);
                    } else {
                        //  Rotate camera around Y
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.1, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        // Move selected object along X axis
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.1, 0.0, 0.0));
                    } else {
                        // Move camera along X axis
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(-0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(-0.1, 0.0, 0.0));
                    }
                }
                break;
            case "KeyD":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        // Rotate selected object around Y (other direction)
                        mat4.rotateY(object.model.rotation, object.model.rotation, -(Math.PI/12));
                    } else {
                        // Rotate camera around Y (other direction)
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, -0.1, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        // Move selected object along X axis (other direction)
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(-0.1, 0.0, 0.0));
                    } else {
                        // Move camera along X axis (other direction)
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.1, 0.0, 0.0));
                    }
                }
                break;
            case "KeyW":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        // rotate selection forward and backward around view X
                        mat4.rotateX(object.model.rotation, object.model.rotation, Math.PI/12);
                    } else {
                        //  Rotate camera about X axis (pitch)
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.1, 0.0, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        //  Move selected object along Z axis
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.0, 0.1));
                    } else {
                        //  Move camera along Z axis
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.0, 0.1));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.0, 0.1));
                    }
                }
                break;
            case "KeyS":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        //  rotate selection forward and backward around view X (other direction)
                        mat4.rotateX(object.model.rotation, object.model.rotation, -(Math.PI/12));
                    } else {
                        //  Rotate camera about X axis (pitch)
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(-0.1, 0.0, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        //  Move selected object along Z axis  (other direction)
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.0, -0.1));
                    } else {
                        //  Move camera along Z axis (other direction)
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.0, -0.1));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.0, -0.1));
                    }
                }
                break;
            case "KeyQ":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        //  : rotate selected object around z axis
                        mat4.rotateZ(object.model.rotation, object.model.rotation, Math.PI/12);
                    }
                } else {
                    if (state.hasSelected) {
                        //  : move selected object along Y axis 
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.1, 0.0));

                    } else {
                        //  move camera along Y axis
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.1, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.1, 0.0));
                    }
                }

                break;
            case "KeyE":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        //  : rotate selected object around z axis
                        mat4.rotateZ(object.model.rotation, object.model.rotation, -(Math.PI/12));
                    }
                } else {
                    if (state.hasSelected) {
                        //  : move selected object along Y axis 
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, -0.1, 0.0));
                    } else {
                        //  move camera along Y axis
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, -0.1, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, -0.1, 0.0));
                    }
                }
                break;
            case "Space":
                //  Highlight
                if (!state.hasSelected) {
                    state.hasSelected = true;
                    changeSelectionText(state.objects[state.selectedIndex].name);
                    //  scale object here
                    vec3.add(object.model.scale, object.model.scale, vec3.fromValues(0.2, 0.2, 0.2));
                }
                else {
                    state.hasSelected = false;
                    document.getElementById("selectionText").innerHTML = "Selection: None";
                    //  scale back object here 
                    vec3.add(object.model.scale, object.model.scale, vec3.fromValues(-0.2, -0.2, -0.2));
                }

                break;
            case "ArrowLeft":
                // Decreases object selected index value
                if (state.hasSelected) {
                    if (state.selectedIndex > 0) {
                        // scale the selected object and descale the previously selected object, set state.selectedIndex to new value
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(-0.2, -0.2, -0.2));
                        state.selectedIndex--;
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(0.2, 0.2, 0.2));
                    }
                    else if (state.selectedIndex == 0) {
                        // scale the selected object and descale the previously selected object, set state.selectedIndex to new value
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(-0.2, -0.2, -0.2));
                        state.selectedIndex = state.objects.length - 1;
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(0.2, 0.2, 0.2));
                    }
                    else {
                        // scale the selected object and descale the previously selected object, set state.selectedIndex to new value
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(-0.2, -0.2, -0.2));
                        state.selectedIndex--;
                        vec3.add(object.model.scale, object.model.scale, vec3.fromValues(0.2, 0.2, 0.2));
                    }
                    //changes the text to the object that is selected
                    changeSelectionText(state.objects[state.selectedIndex].name);
                }
                break;
            case "ArrowRight":
                // Increases object selected index value
                if (state.hasSelected) {
                    if (state.selectedIndex < state.objects.length - 1) {
                        // scale the selected object and descale the previously selected object, set state.selectedIndex to new value
                        state.selectedIndex++;
                    }
                    else {
                        // scale the selected object and descale the previously selected object, set state.selectedIndex to new value
                        state.selectedIndex = 0;
                    }
                    changeSelectionText(state.objects[state.selectedIndex].name);
                }
                break;
            default:
                break;
        }
    });


}

/************************************
 * SHADER SETUP
 ************************************/
function transformShader(gl) {
    // Vertex shader source code
    const vsSource =
        `#version 300 es
    in vec3 aPosition;
    in vec4 aColor;

    //  add uniforms for projection, view and model matrices
    // type uniform mat4 
    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;
 
    void main() {
        // Position needs to be a vec4 with w as 1.0
        //  apply transformation stored in uniforms
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    }
    `;

    // Fragment shader source code
    const fsSource =
        `#version 300 es
    precision highp float;

    out vec4 fragColor;
    
    //  add uniform for object material color
    // type vec3 
    uniform vec3 uniformColor;
    
    void main() {
        //  replace with corresponding color from uniform
        fragColor = vec4(uniformColor, 0.2);
    }
    `;

    // Create our shader program with our custom function
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexColour: gl.getAttribLocation(shaderProgram, 'aColor'),
        },
        uniformLocations: {
            //  add the locations for the 3 uniforms related to projection, view, modeling transforms
            projection: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            view: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            model: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            //  Add location to additional uniforms here (ex related to material color)
            color: gl.getUniformLocation(shaderProgram, 'fragColor'),
        },
    };

    // Check to see if we found the locations of our uniforms and attributes
    // Typos are a common source of failure
    //  add testes for all your uniform locations 
    if (programInfo.attribLocations.vertexPosition === -1) {

        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
    }

    return programInfo;
}

/************************************
 * BUFFER SETUP
 ************************************/

function initBuffers(gl, object, positionArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indices = new Uint16Array(indicesArray);


    // Allocate and assign a Vertex Array Object to our handle
    var vertexArrayObject = gl.createVertexArray();

    // Bind our Vertex Array Object as the current used object
    gl.bindVertexArray(vertexArrayObject);

    object.buffers = {
        vao: vertexArrayObject,
        attributes: {
            position: initPositionAttribute(gl, object.programInfo, positions),
        },
        indices: initIndexBuffer(gl, indices),
        numVertices: indices.length,
    };
}

function initPositionAttribute(gl, programInfo, positionArray) {

    // Create a buffer for the positions.
    const positionBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ARRAY_BUFFER, // The kind of buffer this is
        positionArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3; // pull out 3 values per iteration, ie vec3
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize between 0 and 1
        const stride = 0; // how many bytes to get from one set of values to the next
        // Set stride to 0 to use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from


        // Set the information WebGL needs to read the buffer properly
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        // Tell WebGL to use this attribute
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    return positionBuffer;
}


function initColourAttribute(gl, programInfo, colourArray) {

    // Create a buffer for the positions.
    const colourBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ARRAY_BUFFER, // The kind of buffer this is
        colourArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 4; // pull out 4 values per iteration, ie vec4
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize between 0 and 1
        const stride = 0; // how many bytes to get from one set of values to the next
        // Set stride to 0 to use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from

        // Set the information WebGL needs to read the buffer properly
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColour,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        // Tell WebGL to use this attribute
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColour);
    }

    return colourBuffer;
}

function initIndexBuffer(gl, elementArray) {

    // Create a buffer for the positions.
    const indexBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER, // The kind of buffer this is
        elementArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    return indexBuffer;
}

/**
 * 
 * @param {array of x,y,z vertices} vertices 
 */
function calculateCentroid(vertices) {

    var center = vec3.fromValues(0.0, 0.0, 0.0);
    for (let t = 0; t < vertices.length; t++) {
        vec3.add(center,center,vertices[t]);
    }
    vec3.scale(center,center,1/vertices.length);
    return center;

}
