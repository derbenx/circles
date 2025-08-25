var inAR = false;
var inVR = false;
let vrSession = null;
let arSession = null;

// --- Public API ---

function toggleVR(drawGameCallback) {
  if (vrSession) {
    vrSession.end();
  } else {
    activateVR(drawGameCallback);
  }
}

function toggleAR(drawGameCallback) {
    if (arSession) {
        arSession.end();
    } else {
        activateAR(drawGameCallback);
    }
}

function showVROverlay(message, onDismiss) {
    vrAlertState.shown = true;
    vrAlertState.message = message;
    vrAlertState.needsUpdate = true;
    vrAlertState.onDismiss = onDismiss;
}

function getCanvasModelMatrix() {
    return canvasModelMatrix;
}

// --- Private State ---

let vrAlertState = {
    shown: false,
    message: "",
    needsUpdate: false,
    onDismiss: null,
};
let ignoreNextSelectEnd = false;
let canvasModelMatrix = null;
let vrIntersection = null;


// --- Core VR/XR Logic ---

async function activateVR(drawGameCallback) {
  const vrButton = document.getElementById("btn-vr");
  try {
    vrSession = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"],
    });
    inVR = true;
    vrSession.addEventListener("end", onSessionEnded);
    vrButton.textContent = "Stop VR";
    vrButton.disabled = false;
    runXRRendering(vrSession, 'immersive-vr', drawGameCallback);
  } catch (error) {
    console.error("Failed to enter VR mode:", error);
    vrSession = null;
    inVR = false;
    vrButton.textContent = "Start VR";
    vrButton.disabled = false;
  }
}

async function activateAR(drawGameCallback) {
    const xrButton = document.getElementById('btn-xr');
    try {
        arSession = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        inAR = true;
        arSession.addEventListener('end', onSessionEnded);
        xrButton.textContent = 'Stop XR';
        xrButton.disabled = false;
        runXRRendering(arSession, 'immersive-ar', drawGameCallback);
    } catch (e) {
        console.error("Failed to start AR session:", e);
        arSession = null;
        inAR = false;
        xrButton.textContent = 'Start XR';
        xrButton.disabled = false;
    }
}

function onSessionEnded(event) {
    const session = event.session;
    if (session === vrSession) {
        inVR = false;
        vrSession = null;
        const vrButton = document.getElementById("btn-vr");
        vrButton.textContent = "Start VR";
        vrButton.disabled = false;
    } else if (session === arSession) {
        inAR = false;
        arSession = null;
        const xrButton = document.getElementById('btn-xr');
        xrButton.textContent = 'Start XR';
    }
    session.removeEventListener('end', onSessionEnded);
    // Reset any game state that should be cleaned up on exit
    drag = 'n';
}

async function runXRRendering(session, mode, drawGameCallback) {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", { xrCompatible: true });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    let referenceSpace;
    try {
        referenceSpace = await session.requestReferenceSpace("local-floor");
    } catch (e) {
        console.warn("Could not get 'local-floor' reference space, falling back to 'local'");
        referenceSpace = await session.requestReferenceSpace("local");
    }

    // --- Shader Programs ---
    const textureProgramInfo = setupTextureShaderProgram(gl);
    const solidColorProgramInfo = setupSolidColorShaderProgram(gl);
    const programs = { textureProgramInfo, solidColorProgramInfo };

    // --- Buffers for various models ---
    const genericBuffers = initGenericBuffers(gl);
    const pieceBuffers = initPieceBuffers(gl); // For game pieces (e.g., cards, circles)
    const controllerBuffers = initControllerBuffers(gl); // For rendering controllers
    const buffers = { genericBuffers, pieceBuffers, controllerBuffers };

    // --- Textures ---
    const alertTexture = initTexture(gl, createAlertCanvas());
    const pointerTexture = initTexture(gl, createPointerCanvas());
    const textures = { alertTexture, pointerTexture };

    // --- VR interaction state ---
    let primaryButtonPressedLastFrame = false;
    let bButtonPressedLastFrame = false;
    let activeController = null;
    let lastActiveController = null;
    let vrCanvasPosition = (mode === 'immersive-ar') ? [0, 0.0, -2.0] : [0, 1.0, -2.0];
    let vrCanvasRotationY = 0;
    canvasModelMatrix = glMatrix.mat4.create();

    // --- Event Listeners ---
    session.addEventListener('selectstart', (event) => {
      activeController = event.inputSource;
      if (vrAlertState.shown) {
        if (vrAlertState.onDismiss) vrAlertState.onDismiss();
        vrAlertState.shown = false;
        ignoreNextSelectEnd = true;
        return;
      }
      if (vrIntersection) {
        clkd({ preventDefault: () => {} }); // Assumes game has a global clkd function
      }
    });

    session.addEventListener('selectend', () => {
      if (ignoreNextSelectEnd) {
        ignoreNextSelectEnd = false;
        return;
      }
      if (vrIntersection) {
        clku({ preventDefault: () => {} }); // Assumes game has a global clku function
      }
    });

    function onXRFrame(time, frame) {
        session.requestAnimationFrame(onXRFrame);

        // Update game state before drawing
        if (typeof draw === 'function') draw(1); // Assumes game has a global draw function

        const pose = frame.getViewerPose(referenceSpace);
        if (!pose) return;

        // --- Controller/Input Processing ---
        vrIntersection = null;
        let leftController = null;
        let rightController = null;

        for (const source of session.inputSources) {
            if (source.handedness === 'left') leftController = source;
            else if (source.handedness === 'right') rightController = source;
        }

        activeController = activeController || rightController || leftController;
        if (lastActiveController && activeController !== lastActiveController) drag = 'n';
        lastActiveController = activeController;

        // --- Handle controller inputs for movement, rotation, etc. ---
        // Left controller: movement
        if (leftController && leftController.gamepad) {
            const thumbstickX = leftController.gamepad.axes[2];
            const thumbstickY = leftController.gamepad.axes[3];
            const moveSpeed = 0.02;
            if (Math.abs(thumbstickX) > 0.1) vrCanvasPosition[0] += thumbstickX * moveSpeed;
            if (Math.abs(thumbstickY) > 0.1) vrCanvasPosition[1] -= thumbstickY * moveSpeed;
        }

        // Right controller: zoom and rotate
        if (rightController && rightController.gamepad) {
            const thumbstickY = rightController.gamepad.axes[3];
            const zoomSpeed = 0.02;
            if (Math.abs(thumbstickY) > 0.1) vrCanvasPosition[2] += thumbstickY * zoomSpeed;

            const thumbstickX = rightController.gamepad.axes[2];
            const rotateSpeed = 0.02;
            if (Math.abs(thumbstickX) > 0.4) vrCanvasRotationY += thumbstickX * rotateSpeed;

            const bButton = rightController.gamepad.buttons[5];
            if (bButton && bButton.pressed && !bButtonPressedLastFrame) session.end();
            bButtonPressedLastFrame = bButton ? bButton.pressed : false;
        }

        // Active controller: intersection and actions
        if (activeController && activeController.gripSpace) {
            const gripPose = frame.getPose(activeController.gripSpace, referenceSpace);
            if (gripPose) {
                const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
                if (intersection) {
                    vrIntersection = intersection;
                    // These globals are used by the game logic (e.g., in movr)
                    mx = ((intersection.local[0] + 1) / 2) * ww;
                    my = ((1 - intersection.local[1]) / 2) * hh;
                }
            }

            if (activeController.gamepad) {
                const primaryButton = activeController.gamepad.buttons[4];
                if (primaryButton && primaryButton.pressed && !primaryButtonPressedLastFrame) {
                    if (vrIntersection && typeof rotate === 'function') {
                        let gx_for_rotate = Math.floor((mx/ww)*xx);
                        let gy_for_rotate = Math.floor((my/hh)*yy);
                        if (grid[gx_for_rotate][gy_for_rotate].charAt(1) > 0) {
                            rotate(gx_for_rotate, gy_for_rotate, grid[gx_for_rotate][gy_for_rotate].charAt(1));
                            if(typeof sCook === 'function' && typeof prog === 'function') sCook("prog", prog());
                        }
                    }
                }
                primaryButtonPressedLastFrame = primaryButton ? primaryButton.pressed : false;
            }
        }

        // Update canvas model matrix based on controls
        const aspectRatio = ww / hh; // Assumes global ww, hh from game
        glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);
        glMatrix.mat4.rotateY(canvasModelMatrix, canvasModelMatrix, vrCanvasRotationY);
        glMatrix.mat4.scale(canvasModelMatrix, canvasModelMatrix, [aspectRatio, 1, 1]);


        // --- Rendering ---
        const glLayer = session.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
        if (mode === 'immersive-ar') gl.clearColor(0, 0, 0, 0);
        else gl.clearColor(0.1, 0.2, 0.3, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const view of pose.views) {
            const viewport = glLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            // Let the specific game draw its scene
            if (drawGameCallback) {
                drawGameCallback(gl, programs, buffers, view);
            }

            // Draw controllers, cursor, and alerts on top
            drawControllers(gl, solidColorProgramInfo, controllerBuffers, session, frame, referenceSpace, view);
            if (vrIntersection) {
                drawCursor(gl, programs, buffers.genericBuffers, textures.pointerTexture, view);
            }
            if (vrAlertState.shown) {
                drawAlert(gl, textureProgramInfo, buffers.genericBuffers, textures.alertTexture, pose, view);
            }
        }
    }
    session.requestAnimationFrame(onXRFrame);
}

// --- Drawing Functions ---

function drawControllers(gl, programInfo, buffers, session, frame, referenceSpace, view) {
    if (!session || !session.inputSources) {
        return;
    }
    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    for (let i = 0; i < session.inputSources.length; i++) {
        const source = session.inputSources[i];
        if (source.gripSpace) {
            const gripPose = frame.getPose(source.gripSpace, referenceSpace);
            if (gripPose) {
                // Draw controller sphere
                const controllerMatrix = glMatrix.mat4.clone(gripPose.transform.matrix);
                glMatrix.mat4.scale(controllerMatrix, controllerMatrix, [0.03, 0.03, 0.03]);
                drawSolid(gl, programInfo, buffers.sphere, controllerMatrix, view, [0.8, 0.8, 0.8, 1.0]);

                // Draw controller ray
                const rayMatrix = glMatrix.mat4.clone(gripPose.transform.matrix);
                // Apply the same downward rotation as the intersection test
                glMatrix.mat4.rotate(rayMatrix, rayMatrix, -Math.PI / 6, [1, 0, 0]);
                glMatrix.mat4.translate(rayMatrix, rayMatrix, [0, 0, -0.5]);
                glMatrix.mat4.scale(rayMatrix, rayMatrix, [0.005, 0.005, 1.0]);
                drawSolid(gl, programInfo, buffers.stick, rayMatrix, view, [0.0, 1.0, 0.0, 0.8]);
            }
        }
    }
}

function drawCursor(gl, programs, buffers, texture, view) {
    // 2D textured pointer (optional, can be disabled)
    // const { mat4, vec3, quat } = glMatrix;
    // const pointerModelMatrix = mat4.create();
    // const boardRotation = quat.create();
    // mat4.getRotation(boardRotation, canvasModelMatrix);
    // mat4.fromRotationTranslationScale(pointerModelMatrix, boardRotation, vrIntersection.world, [0.025, 0.025, 0.025]);
    // drawTextured(gl, programs.textureProgramInfo, buffers.quad, texture, pointerModelMatrix, view);

    // 3D cone cursor
    const { solidColorProgramInfo } = programs;
    gl.useProgram(solidColorProgramInfo.program);
    gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexNormal);

    const coneMatrix = glMatrix.mat4.create();
    const coneHoverPos = glMatrix.vec3.clone(vrIntersection.world);
    coneHoverPos[2] += 0.2; // Adjust hover height
    glMatrix.mat4.fromTranslation(coneMatrix, coneHoverPos);
    glMatrix.mat4.scale(coneMatrix, coneMatrix, [0.02, 0.05, 0.02]);
    glMatrix.mat4.rotate(coneMatrix, coneMatrix, Math.PI, [1, 0, 0]);
    drawSolid(gl, solidColorProgramInfo, buffers.cone, coneMatrix, view, [1.0, 1.0, 0.0, 1.0]);
}

function drawAlert(gl, programInfo, buffers, texture, pose, view) {
    if (vrAlertState.needsUpdate) {
        const canvas = createAlertCanvas(vrAlertState.message);
        updateTexture(gl, texture, canvas);
        vrAlertState.needsUpdate = false;
    }
    const alertModelMatrix = glMatrix.mat4.clone(pose.transform.matrix);
    glMatrix.mat4.translate(alertModelMatrix, alertModelMatrix, [0, 0, -1.5]);
    glMatrix.mat4.rotate(alertModelMatrix, alertModelMatrix, Math.PI, [0, 1, 0]);
    glMatrix.mat4.scale(alertModelMatrix, alertModelMatrix, [1.0, 0.5, 1.0]);
    drawTextured(gl, programInfo, buffers.quad, texture, alertModelMatrix, view);
}


function drawSolid(gl, programInfo, bufferInfo, modelMatrix, view, color) {
    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
    const finalModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
    const normalMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(normalMatrix, modelMatrix);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, view.projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, finalModelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    gl.uniform4fv(programInfo.uniformLocations.color, color);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);

    if (bufferInfo.indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferInfo.indices);
        gl.drawElements(gl.TRIANGLES, bufferInfo.vertexCount, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.vertexCount);
    }
}

function drawTextured(gl, programInfo, bufferInfo, texture, modelMatrix, view) {
    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, view.projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferInfo.indices);
    gl.drawElements(gl.TRIANGLES, bufferInfo.vertexCount, gl.UNSIGNED_SHORT, 0);
}


// --- Initialization and Setup ---

function setupTextureShaderProgram(gl) {
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      varying highp vec2 vTextureCoord;
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
      }`;
    const fsSource = `
      precision mediump float;
      varying highp vec2 vTextureCoord;
      uniform sampler2D uSampler;
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
      }`;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    return {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
      },
    };
}

function setupSolidColorShaderProgram(gl) {
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec3 aVertexNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      varying highp vec3 vLighting;
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
      }`;
    const fsSource = `
      precision mediump float;
      uniform vec4 uColor;
      varying highp vec3 vLighting;
      void main(void) {
        gl_FragColor = vec4(uColor.rgb * vLighting, uColor.a);
      }`;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            color: gl.getUniformLocation(shaderProgram, 'uColor'),
        },
    };
}

function initGenericBuffers(gl) {
    const quad = createCuboid(2.0, 2.0, 0); // A flat plane for textures
    const quadBuffers = {
        position: gl.createBuffer(),
        textureCoord: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: quad.indices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, quad.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffers.textureCoord);
    gl.bufferData(gl.ARRAY_BUFFER, quad.textureCoordinates, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quad.indices, gl.STATIC_DRAW);

    const cone = createCone(1.0, 1.0, 12);
    const coneBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: cone.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, cone.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, cone.normals, gl.STATIC_DRAW);

    return { quad: quadBuffers, cone: coneBuffers };
}

function initPieceBuffers(gl) {
    // Buffers for Solitaire cards
    const card = createCuboid(1.0, 1.0, 1.0); // Will be scaled
    const cardBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(), // Use normals for solid color
        textureCoord: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: card.indices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, card.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, card.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.textureCoord);
    gl.bufferData(gl.ARRAY_BUFFER, card.textureCoordinates, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, card.indices, gl.STATIC_DRAW);

    // Buffers for Circles pieces
    const cylinder = createCylinder(0.5, .2, 16);
    const cylinderBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: cylinder.indices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinder.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinder.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cylinder.indices), gl.STATIC_DRAW);

    const halfCylinder = createHalfCylinder(.2,.4, 8);
    const halfCylinderBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: halfCylinder.vertices.length / 3,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(halfCylinder.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(halfCylinder.normals), gl.STATIC_DRAW);

    const stick = createCuboid(1.0, 1.0, 1.0);
    const stickBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: stick.indices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, stick.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, stick.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stickBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, stick.indices, gl.STATIC_DRAW);

    const ring = createRing(0.5, 0.465, 1.0, 16);
    const ringBuffers = {
        position: gl.createBuffer(), normal: gl.createBuffer(), vertexCount: ring.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, ring.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, ring.normals, gl.STATIC_DRAW);

    const arcBottom = createArc(0.5, 0.465, 1.0, 8, 0, Math.PI);
    const arcBottomBuffers = {
        position: gl.createBuffer(), normal: gl.createBuffer(), vertexCount: arcBottom.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBottomBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, arcBottom.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBottomBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, arcBottom.normals, gl.STATIC_DRAW);

    const arcLeft = createArc(0.5, 0.465, 1.0, 8, Math.PI / 2, Math.PI * 1.5);
    const arcLeftBuffers = {
        position: gl.createBuffer(), normal: gl.createBuffer(), vertexCount: arcLeft.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, arcLeftBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, arcLeft.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, arcLeftBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, arcLeft.normals, gl.STATIC_DRAW);

    return { card: cardBuffers, cylinder: cylinderBuffers, halfCylinder: halfCylinderBuffers, stick: stickBuffers, ring: ringBuffers, arcBottom: arcBottomBuffers, arcLeft: arcLeftBuffers };
}

function initControllerBuffers(gl) {
    const sphere = createSphere(1.0, 16, 16);
    const sphereBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: sphere.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    const stick = createCuboid(1.0, 1.0, 1.0);
    const stickBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: stick.indices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, stick.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, stick.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stickBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, stick.indices, gl.STATIC_DRAW);

    return { sphere: sphereBuffers, stick: stickBuffers };
}


// --- Helper Functions ---

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initTexture(gl, source) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}

function updateTexture(gl, texture, source) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function createAlertCanvas(message = "You Won!") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    return canvas;
}

function createPointerCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, 2 * Math.PI);
    ctx.fill();
    return canvas;
}

function intersectPlane(transform, quadModelMatrix) {
  const { vec3, mat4 } = glMatrix;
  const rayOrigin = vec3.fromValues(transform.position.x, transform.position.y, transform.position.z);
  const rayDirection = vec3.fromValues(0, 0, -1);

  // Apply a downward rotation to the ray to match user expectation
  const rotationX = mat4.fromXRotation(mat4.create(), -Math.PI / 6); // -30 degrees
  vec3.transformMat4(rayDirection, rayDirection, rotationX);

  vec3.transformQuat(rayDirection, rayDirection, [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w]);
  const invModelMatrix = mat4.invert(mat4.create(), quadModelMatrix);
  const rayOriginLocal = vec3.transformMat4(vec3.create(), rayOrigin, invModelMatrix);
  const rayDirectionLocal = vec3.transformMat4(vec3.create(), rayDirection, invModelMatrix);
  vec3.subtract(rayDirectionLocal, rayDirectionLocal, vec3.transformMat4(vec3.create(), [0,0,0], invModelMatrix));
  vec3.normalize(rayDirectionLocal, rayDirectionLocal);
  const planeNormal = vec3.fromValues(0, 0, 1);
  const denom = vec3.dot(planeNormal, rayDirectionLocal);
  if (Math.abs(denom) > 0.0001) {
    const t = -rayOriginLocal[2] / denom;
    if (t >= 0) {
      const intersectionLocal = vec3.add(vec3.create(), rayOriginLocal, vec3.scale(vec3.create(), rayDirectionLocal, t));
      if (intersectionLocal[0] >= -1 && intersectionLocal[0] <= 1 && intersectionLocal[1] >= -1 && intersectionLocal[1] <= 1) {
        const intersectionWorld = vec3.transformMat4(vec3.create(), intersectionLocal, quadModelMatrix);
        return { world: intersectionWorld, local: intersectionLocal };
      }
    }
  }
  return null;
}

// --- Geometry Creation ---

function createCuboid(width, height, depth) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const vertices = new Float32Array([
        // Front face
        -w, -h,  d,  w, -h,  d,  w,  h,  d, -w,  h,  d,
        // Back face
        -w, -h, -d, -w,  h, -d,  w,  h, -d,  w, -h, -d,
        // Top face
        -w,  h, -d, -w,  h,  d,  w,  h,  d,  w,  h, -d,
        // Bottom face
        -w, -h, -d,  w, -h, -d,  w, -h,  d, -w, -h,  d,
        // Right face
         w, -h, -d,  w,  h, -d,  w,  h,  d,  w, -h,  d,
        // Left face
        -w, -h, -d, -w, -h,  d, -w,  h,  d, -w,  h, -d,
    ]);
    const normals = new Float32Array([
        // Front
        0,0,1, 0,0,1, 0,0,1, 0,0,1,
        // Back
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        // Top
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
        // Bottom
        0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        // Right
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        // Left
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
    ]);
    const textureCoordinates = new Float32Array([
        // Front
        0.0,  1.0, 1.0,  1.0, 1.0,  0.0, 0.0,  0.0,
        // Back
        1.0,  1.0, 1.0,  0.0, 0.0,  0.0, 0.0,  1.0,
        // Top
        0.0,  1.0, 0.0,  0.0, 1.0,  0.0, 1.0,  1.0,
        // Bottom
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Right
        1.0,  1.0, 1.0,  0.0, 0.0,  0.0, 0.0,  1.0,
        // Left
        0.0,  1.0, 1.0,  1.0, 1.0,  0.0, 0.0,  0.0,
    ]);
    const indices = new Uint16Array([
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);
    return { vertices, normals, textureCoordinates, indices, vertexCount: 36 };
}

function createCylinder(radius, height, segments) {
    const vertices = [];
    const indices = [];
    const normals = [];
    const halfHeight = height / 2;
    // Top cap
    vertices.push(0, halfHeight, 0);
    normals.push(0, 1, 0);
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, halfHeight, z);
        normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 1, ((i + 1) % segments) + 1);
    }
    // Bottom cap
    const bottomCenterIndex = vertices.length / 3;
    vertices.push(0, -halfHeight, 0);
    normals.push(0, -1, 0);
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, -halfHeight, z);
        normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenterIndex, bottomCenterIndex + ((i + 1) % segments) + 1, bottomCenterIndex + i + 1);
    }
    // Sides
    const sideStartIndex = vertices.length / 3;
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, halfHeight, z);
        normals.push(x / radius, 0, z / radius);
        vertices.push(x, -halfHeight, z);
        normals.push(x / radius, 0, z / radius);
    }
    for (let i = 0; i < segments; i++) {
        const topLeft = sideStartIndex + i * 2;
        const bottomLeft = topLeft + 1;
        const topRight = sideStartIndex + ((i + 1) % segments) * 2;
        const bottomRight = topRight + 1;
        indices.push(topLeft, topRight, bottomLeft);
        indices.push(topRight, bottomRight, bottomLeft);
    }
    return { vertices, indices, normals };
}

function createHalfCylinder(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const halfHeight = height/2;
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * Math.PI - Math.PI/2;
        const ang2 = ((i + 1) / segments) * Math.PI - Math.PI/2;
        const x1 = radius * Math.cos(ang1), z1 = radius * Math.sin(ang1);
        const x2 = radius * Math.cos(ang2), z2 = radius * Math.sin(ang2);
        const nx1 = Math.cos(ang1), nz1 = Math.sin(ang1);
        const nx2 = Math.cos(ang2), nz2 = Math.sin(ang2);
        vertices.push(x1, halfHeight, z1,  x2, halfHeight, z2,  x1, -halfHeight, z1);
        normals.push(nx1,0,nz1, nx2,0,nz2, nx1,0,nz1);
        vertices.push(x2, halfHeight, z2,  x2, -halfHeight, z2,  x1, -halfHeight, z1);
        normals.push(nx2,0,nz2, nx2,0,nz2, nx1,0,nz1);
    }
    vertices.push(0, halfHeight, -radius,  0, -halfHeight, -radius,  0, halfHeight, radius);
    normals.push(-1,0,0, -1,0,0, -1,0,0);
    vertices.push(0, -halfHeight, -radius,  0, -halfHeight, radius,  0, halfHeight, radius);
    normals.push(-1,0,0, -1,0,0, -1,0,0);
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * Math.PI - Math.PI/2;
        const ang2 = ((i + 1) / segments) * Math.PI - Math.PI/2;
        const x1 = radius * Math.cos(ang1), z1 = radius * Math.sin(ang1);
        const x2 = radius * Math.cos(ang2), z2 = radius * Math.sin(ang2);
        vertices.push(0, halfHeight, 0,  x1, halfHeight, z1,  x2, halfHeight, z2);
        normals.push(0,1,0, 0,1,0, 0,1,0);
        vertices.push(0, -halfHeight, 0,  x2, -halfHeight, z2,  x1, -halfHeight, z1);
        normals.push(0,-1,0, 0,-1,0, 0,-1,0);
    }
    return { vertices, normals };
}

function createRing(outerRadius, innerRadius, height, segments) {
    const vertices = [];
    const normals = [];
    const halfHeight = height / 2;
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * 2 * Math.PI;
        const ang2 = ((i + 1) / segments) * 2 * Math.PI;
        const o_x1 = outerRadius * Math.cos(ang1), o_z1 = outerRadius * Math.sin(ang1);
        const o_x2 = outerRadius * Math.cos(ang2), o_z2 = outerRadius * Math.sin(ang2);
        const i_x1 = innerRadius * Math.cos(ang1), i_z1 = innerRadius * Math.sin(ang1);
        const i_x2 = innerRadius * Math.cos(ang2), i_z2 = innerRadius * Math.sin(ang2);
        // Top face
        vertices.push(o_x1, halfHeight, o_z1,  o_x2, halfHeight, o_z2,  i_x1, halfHeight, i_z1);
        vertices.push(i_x1, halfHeight, i_z1,  o_x2, halfHeight, o_z2,  i_x2, halfHeight, i_z2);
        for(let j=0; j<6; j++) normals.push(0,1,0);
        // Bottom face
        vertices.push(o_x1, -halfHeight, o_z1,  i_x1, -halfHeight, i_z1,  o_x2, -halfHeight, o_z2);
        vertices.push(i_x1, -halfHeight, i_z1,  i_x2, -halfHeight, i_z2,  o_x2, -halfHeight, o_z2);
        for(let j=0; j<6; j++) normals.push(0,-1,0);
        // Outer face
        const o_nx1 = Math.cos(ang1), o_nz1 = Math.sin(ang1);
        const o_nx2 = Math.cos(ang2), o_nz2 = Math.sin(ang2);
        vertices.push(o_x1, halfHeight, o_z1,  o_x1, -halfHeight, o_z1,  o_x2, halfHeight, o_z2);
        vertices.push(o_x1, -halfHeight, o_z1,  o_x2, -halfHeight, o_z2,  o_x2, halfHeight, o_z2);
        normals.push(o_nx1,0,o_nz1, o_nx1,0,o_nz1, o_nx2,0,o_nz2);
        normals.push(o_nx1,0,o_nz1, o_nx2,0,o_nz2, o_nx2,0,o_nz2);
        // Inner face
        const i_nx1 = -Math.cos(ang1), i_nz1 = -Math.sin(ang1);
        const i_nx2 = -Math.cos(ang2), i_nz2 = -Math.sin(ang2);
        vertices.push(i_x1, halfHeight, i_z1,  i_x2, halfHeight, i_z2,  i_x1, -halfHeight, i_z1);
        vertices.push(i_x1, -halfHeight, i_z1,  i_x2, halfHeight, i_z2,  i_x2, -halfHeight, i_z2);
        normals.push(i_nx1,0,i_nz1, i_nx2,0,i_nz2, i_nx1,0,i_nz1);
        normals.push(i_nx1,0,i_nz1, i_nx2,0,i_nz2, i_nx2,0,i_nz2);
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), vertexCount: vertices.length / 3 };
}

function createArc(outerRadius, innerRadius, height, segments, startAngle, endAngle) {
    const vertices = [];
    const normals = [];
    const halfHeight = height / 2;
    const angleRange = endAngle - startAngle;
    for (let i = 0; i < segments; i++) {
        const ang1 = startAngle + (i / segments) * angleRange;
        const ang2 = startAngle + ((i + 1) / segments) * angleRange;
        const o_x1 = outerRadius * Math.cos(ang1), o_z1 = outerRadius * Math.sin(ang1);
        const o_x2 = outerRadius * Math.cos(ang2), o_z2 = outerRadius * Math.sin(ang2);
        const i_x1 = innerRadius * Math.cos(ang1), i_z1 = innerRadius * Math.sin(ang1);
        const i_x2 = innerRadius * Math.cos(ang2), i_z2 = innerRadius * Math.sin(ang2);
        // Top face
        vertices.push(o_x1, halfHeight, o_z1, o_x2, halfHeight, o_z2, i_x1, halfHeight, i_z1);
        vertices.push(i_x1, halfHeight, i_z1, o_x2, halfHeight, o_z2, i_x2, halfHeight, i_z2);
        for(let j=0; j<6; j++) normals.push(0,1,0);
        // Bottom face
        vertices.push(o_x1, -halfHeight, o_z1, i_x1, -halfHeight, i_z1, o_x2, -halfHeight, o_z2);
        vertices.push(i_x1, -halfHeight, i_z1, i_x2, -halfHeight, i_z2, o_x2, -halfHeight, o_z2);
        for(let j=0; j<6; j++) normals.push(0,-1,0);
        // Outer face
        const o_nx1 = Math.cos(ang1), o_nz1 = Math.sin(ang1);
        const o_nx2 = Math.cos(ang2), o_nz2 = Math.sin(ang2);
        vertices.push(o_x1, halfHeight, o_z1, o_x1, -halfHeight, o_z1, o_x2, halfHeight, o_z2);
        vertices.push(o_x1, -halfHeight, o_z1, o_x2, -halfHeight, o_z2, o_x2, halfHeight, o_z2);
        normals.push(o_nx1,0,o_nz1, o_nx1,0,o_nz1, o_nx2,0,o_nz2);
        normals.push(o_nx1,0,o_nz1, o_nx2,0,o_nz2, o_nx2,0,o_nz2);
        // Inner face
        const i_nx1 = -Math.cos(ang1), i_nz1 = -Math.sin(ang1);
        const i_nx2 = -Math.cos(ang2), i_nz2 = -Math.sin(ang2);
        vertices.push(i_x1, halfHeight, i_z1, i_x1, -halfHeight, i_z1, i_x2, halfHeight, i_z2);
        vertices.push(i_x1, -halfHeight, i_z1, i_x2, -halfHeight, i_z2, i_x2, halfHeight, i_z2);
        normals.push(i_nx1,0,i_nz1, i_nx1,0,i_nz1, i_nx2,0,i_nz2);
        normals.push(i_nx1,0,i_nz1, i_nx2,0,i_nz2, i_nx2,0,i_nz2);
    }
    const ang1 = startAngle;
    const o_x1 = outerRadius * Math.cos(ang1), o_z1 = outerRadius * Math.sin(ang1);
    const i_x1 = innerRadius * Math.cos(ang1), i_z1 = innerRadius * Math.sin(ang1);
    const cap1Normal = [Math.sin(ang1), 0, -Math.cos(ang1)];
    vertices.push(o_x1, halfHeight, o_z1, o_x1, -halfHeight, o_z1, i_x1, halfHeight, i_z1);
    vertices.push(i_x1, halfHeight, i_z1, o_x1, -halfHeight, o_z1, i_x1, -halfHeight, i_z1);
    for(let j=0; j<6; j++) normals.push(...cap1Normal);
    const ang2 = endAngle;
    const o_x2 = outerRadius * Math.cos(ang2), o_z2 = outerRadius * Math.sin(ang2);
    const i_x2 = innerRadius * Math.cos(ang2), i_z2 = innerRadius * Math.sin(ang2);
    const cap2Normal = [-Math.sin(endAngle), 0, Math.cos(endAngle)];
    vertices.push(o_x2, halfHeight, o_z2, i_x2, halfHeight, o_z2, o_x2, -halfHeight, o_z2);
    vertices.push(i_x2, halfHeight, i_z2, i_x2, -halfHeight, i_z2, o_x2, -halfHeight, o_z2);
    for(let j=0; j<6; j++) normals.push(...cap2Normal);
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), vertexCount: vertices.length / 3 };
}

function createCone(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const tip = [0, height / 2, 0];
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * 2 * Math.PI;
        const ang2 = ((i + 1) / segments) * 2 * Math.PI;
        const x1 = radius * Math.cos(ang1), z1 = radius * Math.sin(ang1);
        const x2 = radius * Math.cos(ang2), z2 = radius * Math.sin(ang2);
        const p1 = [x1, -height/2, z1];
        const p2 = [x2, -height/2, z2];
        vertices.push(...tip, ...p1, ...p2);
        const n1 = [x1 * height, radius, z1 * height];
        const n2 = [x2 * height, radius, z2 * height];
        const len1 = Math.sqrt(n1[0]*n1[0] + n1[1]*n1[1] + n1[2]*n1[2]);
        const len2 = Math.sqrt(n2[0]*n2[0] + n2[1]*n2[1] + n2[2]*n2[2]);
        const normal1 = [n1[0]/len1, n1[1]/len1, n1[2]/len1];
        const normal2 = [n2[0]/len2, n2[1]/len2, n2[2]/len2];
        const tipNormal = [(normal1[0]+normal2[0])/2, (normal1[1]+normal2[1])/2, (normal1[2]+normal2[2])/2];
        const tipNormalLen = Math.sqrt(tipNormal[0]*tipNormal[0] + tipNormal[1]*tipNormal[1] + tipNormal[2]*tipNormal[2]);
        normals.push(tipNormal[0]/tipNormalLen, tipNormal[1]/tipNormalLen, tipNormal[2]/tipNormalLen);
        normals.push(...normal1);
        normals.push(...normal2);
    }
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * 2 * Math.PI;
        const ang2 = ((i + 1) / segments) * 2 * Math.PI;
        const x1 = radius * Math.cos(ang1), z1 = radius * Math.sin(ang1);
        const x2 = radius * Math.cos(ang2), z2 = radius * Math.sin(ang2);
        vertices.push(0, -height/2, 0, x2, -height/2, z2, x1, -height/2, z1);
        normals.push(0,-1,0, 0,-1,0, 0,-1,0);
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), vertexCount: vertices.length / 3 };
}

function createSphere(radius, latitudeBands, longitudeBands) {
    const vertices = [];
    const normals = [];
    const indices = [];
    for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        const theta = latNumber * Math.PI / latitudeBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            const phi = longNumber * 2 * Math.PI / longitudeBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;
            normals.push(x, y, z);
            vertices.push(radius * x, radius * y, radius * z);
        }
    }
    for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
            const first = (latNumber * (longitudeBands + 1)) + longNumber;
            const second = first + longitudeBands + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        vertexCount: indices.length
    };
}
