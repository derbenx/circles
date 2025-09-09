// --- Start of vrxr.js content ---
var inAR = false;
var inVR = false;
let vrSession = null;
let arSession = null;
let gltfRenderData = null;

// --- Public API ---

function toggleVR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler) {
  if (vrSession) {
    vrSession.end();
  } else {
    activateVR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler);
  }
}

function toggleAR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler) {
    if (arSession) {
        arSession.end();
    } else {
        activateAR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler);
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

async function activateVR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler) {
  const vrButton = document.getElementById("btn-vr");
  try {
    vrSession = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"],
    });
    inVR = true;
    vrButton.textContent = "Stop VR";
    vrButton.disabled = false;
    runXRRendering(vrSession, 'immersive-vr', drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler);
  } catch (error) {
    console.error("Failed to enter VR mode:", error);
    vrSession = null;
    inVR = false;
    vrButton.textContent = "Start VR";
    vrButton.disabled = false;
  }
}

async function activateAR(drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler) {
    const xrButton = document.getElementById('btn-xr');
    try {
        arSession = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        inAR = true;
        xrButton.textContent = 'Stop XR';
        xrButton.disabled = false;
        runXRRendering(arSession, 'immersive-ar', drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler);
    } catch (e) {
        console.error("Failed to start AR session:", e);
        arSession = null;
        inAR = false;
        xrButton.textContent = 'Start XR';
        xrButton.disabled = false;
    }
}

async function runXRRendering(session, mode, drawGameCallback, gameXx, gameYy, boardAspectRatio, onEndCallback, buttonHandler) {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", { antialias: true, xrCompatible: true });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    // --- Load VR Background Settings ---
    const VR_SETTINGS_KEY = 'vr-background-settings';
    const USER_IMAGE_CACHE_NAME = 'user-image-cache';
    const USER_IMAGE_KEY = 'user-360-image';
    const GLTF_SCENE_CACHE_NAME = 'gltf-scene-cache';
    const GLTF_SCENE_KEY = 'user-gltf-scene';
    let vrBackgroundColor = [0.0, 0.0, 0.0, 1.0]; // Default black
    let vrBackgroundTexture = null;
    gltfRenderData = null; // Reset on new session

    try {
        const settingsString = localStorage.getItem(VR_SETTINGS_KEY);
        if (settingsString) {
            const settings = JSON.parse(settingsString);
            if (settings.mode === 'solid' && settings.color) {
                vrBackgroundColor = [
                    settings.color.r / 255.0,
                    settings.color.g / 255.0,
                    settings.color.b / 255.0,
                    1.0
                ];
            } else if (settings.mode === '360' && settings.hasImage) {
                const cache = await caches.open(USER_IMAGE_CACHE_NAME);
                const response = await cache.match(USER_IMAGE_KEY);
                if (response) {
                    const blob = await response.blob();
                    const imageBitmap = await createImageBitmap(blob);

                    vrBackgroundTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, vrBackgroundTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
                }
            } else if (settings.mode === 'scene' && settings.hasScene) {
                const cache = await caches.open(GLTF_SCENE_CACHE_NAME);
                const response = await cache.match(GLTF_SCENE_KEY);
                if (response) {
                    const sceneData = await response.arrayBuffer();
                    const gltf = await loaders.parse(sceneData, loaders.GLTFLoader);
                    processGltfScene(gl, gltf);
                }
            }
        }
    } catch (e) {
        console.error("Could not load VR background settings", e);
    }

    await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, {antialias: true}) });

    let referenceSpace;
    try {
        referenceSpace = await session.requestReferenceSpace("local-floor");
    } catch (e) {
        referenceSpace = await session.requestReferenceSpace("local");
    }

    // --- Shader Programs ---
    const textureProgramInfo = setupTextureShaderProgram(gl);
    const solidColorProgramInfo = setupSolidColorShaderProgram(gl);
    const fxaaProgramInfo = setupFxaaShaderProgram(gl);
    const texturedSphereProgramInfo = setupTexturedSphereShaderProgram(gl);
    const programs = { textureProgramInfo, solidColorProgramInfo, fxaaProgramInfo, texturedSphereProgramInfo };

    // --- Buffers for various models ---
    const genericBuffers = initGenericBuffers(gl);
    const pieceBuffers = initPieceBuffers(gl);
    const controllerBuffers = initControllerBuffers(gl);

    // --- Textured Sphere Buffers ---
    let texturedSphereBuffers = null;
    if (vrBackgroundTexture) { // Only create if we have a texture
        const sphere = createTextureableSphere(5.0, 32, 32); // Radius 5.0m
        texturedSphereBuffers = {
            position: gl.createBuffer(),
            textureCoord: gl.createBuffer(),
            indices: gl.createBuffer(),
            vertexCount: sphere.vertexCount,
        };
        gl.bindBuffer(gl.ARRAY_BUFFER, texturedSphereBuffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, texturedSphereBuffers.textureCoord);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.textureCoordinates, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, texturedSphereBuffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
    }

    const buffers = { genericBuffers, pieceBuffers, controllerBuffers, texturedSphereBuffers };

    // --- FXAA Fullscreen Quad ---
    const fxaaQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fxaaQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0,
        1, -1, 1, 0,
        -1, 1, 0, 1,
        1, 1, 1, 1,
    ]), gl.STATIC_DRAW);


    // --- Render-to-Texture setup for FXAA ---
    const fbo = gl.createFramebuffer();
    let fboTexture = gl.createTexture();
    let fboDepthbuffer = gl.createRenderbuffer();
    let fboWidth = 0;
    let fboHeight = 0;

    // --- Textures ---
    const alertTexture = initTexture(gl, createAlertCanvas());
    const pointerTexture = initTexture(gl, createPointerCanvas());
    const textures = { alertTexture, pointerTexture };

    // --- VR interaction state ---
    let primaryButtonPressedLastFrame = false;
    let bButtonPressedLastFrame = false;
    let buttonStatesLastFrame = {};
    let activeController = null;
    let lastActiveController = null;
    let vrCanvasPosition = (mode === 'immersive-ar') ? [0, 0.0, -2.0] : [0, 1.0, -2.0];
    let vrCanvasRotationY = 0;
    canvasModelMatrix = glMatrix.mat4.create();
    let sessionActive = true;

    function onSessionEnded(event) {
        sessionActive = false;
        activeController = null;
        lastActiveController = null;

        if (event.session === vrSession) {
            inVR = false;
            vrSession = null;
        } else if (event.session === arSession) {
            inAR = false;
            arSession = null;
        }

        if (onEndCallback) onEndCallback();

        const vrButton = document.getElementById("btn-vr");
        if(vrButton && !vrSession) vrButton.textContent = "Start VR";
        const xrButton = document.getElementById('btn-xr');
        if(xrButton && !arSession) xrButton.textContent = 'Start XR';
    }
    session.addEventListener('end', onSessionEnded);


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
        clkd({ preventDefault: () => {}, stopPropagation: () => {} }, vrIntersection.local);
      }
    });

    session.addEventListener('selectend', () => {
      if (ignoreNextSelectEnd) {
        ignoreNextSelectEnd = false;
        return;
      }
      if (vrIntersection) {
        clku({ preventDefault: () => {}, stopPropagation: () => {} }, vrIntersection.local);
      }
    });

    function onXRFrame(time, frame) {
        if (!sessionActive) return;
        session.requestAnimationFrame(onXRFrame);

        if (typeof draw === 'function') draw(1);

        const pose = frame.getViewerPose(referenceSpace);
        if (!pose) return;

        // ... (Input processing logic remains the same) ...
        vrIntersection = null;
        let leftController = null;
        let rightController = null;
        for (const source of session.inputSources) {
            if (source.handedness === 'left') leftController = source;
            else if (source.handedness === 'right') rightController = source;
        }
        if (activeController && !Array.from(session.inputSources).includes(activeController)) {
            activeController = null;
        }
        if (!activeController) {
            activeController = rightController || leftController || session.inputSources[0] || null;
        }
        lastActiveController = activeController;
        if (leftController && leftController.gamepad) {
            const thumbstickX = leftController.gamepad.axes[2];
            const thumbstickY = leftController.gamepad.axes[3];
            const moveSpeed = 0.02;
            if (Math.abs(thumbstickX) > 0.1) vrCanvasPosition[0] += thumbstickX * moveSpeed;
            if (Math.abs(thumbstickY) > 0.1) vrCanvasPosition[1] -= thumbstickY * moveSpeed;
        }
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
        if (activeController && activeController.gripSpace) {
            const gripPose = frame.getPose(activeController.gripSpace, referenceSpace);
            if (gripPose) {
                const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
                if (intersection) {
                    vrIntersection = { ...intersection, gripPose, controller: activeController };
                }
            }
        }
        if (buttonHandler && session.inputSources) {
            for (let i = 0; i < session.inputSources.length; i++) {
                const source = session.inputSources[i];
                if (source.gamepad && source.handedness) {
                    const handedness = source.handedness;
                    if (!buttonStatesLastFrame[handedness]) {
                        buttonStatesLastFrame[handedness] = [];
                    }
                    source.gamepad.buttons.forEach((button, index) => {
                        const wasPressed = buttonStatesLastFrame[handedness][index] || false;
                        if (button.pressed !== wasPressed) {
                            buttonHandler(index, button.pressed, vrIntersection, handedness);
                        }
                    });
                    buttonStatesLastFrame[handedness] = source.gamepad.buttons.map(b => b.pressed);
                }
            }
        }
        const aspectRatio = boardAspectRatio || (gameXx / gameYy);
        glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);
        glMatrix.mat4.rotateY(canvasModelMatrix, canvasModelMatrix, vrCanvasRotationY);
        glMatrix.mat4.scale(canvasModelMatrix, canvasModelMatrix, [aspectRatio, 1, 1]);


        // --- Rendering ---
        const glLayer = session.renderState.baseLayer;

        for (const view of pose.views) {
            const viewport = glLayer.getViewport(view);

            // --- Resize FBO if necessary ---
            if (fboWidth !== viewport.width || fboHeight !== viewport.height) {
                fboWidth = viewport.width;
                fboHeight = viewport.height;

                gl.bindTexture(gl.TEXTURE_2D, fboTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboWidth, fboHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.bindRenderbuffer(gl.RENDERBUFFER, fboDepthbuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, fboWidth, fboHeight);
            }

            // --- 1. Render scene to FBO ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboDepthbuffer);

            gl.viewport(0, 0, fboWidth, fboHeight);
            if (mode === 'immersive-ar') {
                gl.clearColor(0, 0, 0, 0);
            } else {
                gl.clearColor(...vrBackgroundColor);
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            if (mode === 'immersive-vr') {
                if (vrBackgroundTexture && buffers.texturedSphereBuffers) {
                    const sphereModelMatrix = glMatrix.mat4.create();
                    glMatrix.mat4.rotateY(sphereModelMatrix, sphereModelMatrix, -Math.PI / 2); // -90 degrees
                    drawTexturedSphere(gl, programs.texturedSphereProgramInfo, buffers.texturedSphereBuffers, vrBackgroundTexture, sphereModelMatrix, view);
                } else if (gltfRenderData) {
                    drawGltfScene(gl, programs.solidColorProgramInfo, gltfRenderData, view);
                }
            }

            if (drawGameCallback) {
                drawGameCallback(gl, programs, buffers, view);
            }
            drawControllers(gl, solidColorProgramInfo, controllerBuffers, session, frame, referenceSpace, view);
            if (vrIntersection) {
                drawCursor(gl, programs, buffers.genericBuffers, textures.pointerTexture, view);
            }
            if (vrAlertState.shown) {
                drawAlert(gl, textureProgramInfo, buffers.genericBuffers, textures.alertTexture, pose, view);
            }

            // --- 2. Render FBO texture to screen with FXAA ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(fxaaProgramInfo.program);

            gl.bindBuffer(gl.ARRAY_BUFFER, fxaaQuadBuffer);
            gl.vertexAttribPointer(fxaaProgramInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(fxaaProgramInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 16, 8);
            gl.enableVertexAttribArray(fxaaProgramInfo.attribLocations.vertexPosition);
            gl.enableVertexAttribArray(fxaaProgramInfo.attribLocations.textureCoord);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, fboTexture);
            gl.uniform1i(fxaaProgramInfo.uniformLocations.u_sceneTexture, 0);
            gl.uniform2f(fxaaProgramInfo.uniformLocations.u_resolution, fboWidth, fboHeight);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.disable(gl.SCISSOR_TEST);
        }
    }
    session.requestAnimationFrame(onXRFrame);
}

// --- glTF Rendering ---

function processGltfScene(gl, gltf) {
    gltfRenderData = { models: [] };
    // Ensure gltf.json and its properties exist before trying to access them
    if (!gltf.json || !gltf.json.scenes || gltf.json.scene === undefined) {
        console.error("Invalid glTF structure: a default scene is not defined.");
        return;
    }
    const defaultScene = gltf.json.scenes[gltf.json.scene];

    // A recursive function to traverse the scene graph
    function traverseNode(node, parentMatrix) {
        const localMatrix = node.matrix || glMatrix.mat4.create();
        if (node.translation || node.rotation || node.scale) {
            const translation = node.translation || [0, 0, 0];
            const rotation = node.rotation || [0, 0, 0, 1];
            const scale = node.scale || [1, 1, 1];
            glMatrix.mat4.fromRotationTranslationScale(localMatrix, rotation, translation, scale);
        }

        const worldMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), parentMatrix, localMatrix);

        if (node.mesh !== undefined) {
            const mesh = gltf.json.meshes[node.mesh];
            for (const primitive of mesh.primitives) {
                const attributes = primitive.attributes;
                if (!attributes.POSITION || !attributes.NORMAL) {
                    continue;
                }

                const positionBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, attributes.POSITION.value, gl.STATIC_DRAW);

                const normalBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, attributes.NORMAL.value, gl.STATIC_DRAW);

                let indexBuffer = null;
                let vertexCount = attributes.POSITION.count;
                let indexType = null;

                if (primitive.indices !== undefined) {
                    const indexAccessor = gltf.json.accessors[primitive.indices];
                    if (!indexAccessor || indexAccessor.value === undefined) {
                        console.error("Primitive has indices but accessor or value is missing.", primitive);
                        continue;
                    }

                    indexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexAccessor.value, gl.STATIC_DRAW);
                    vertexCount = indexAccessor.count;

                    // componentType is a WebGL enum value, e.g., 5123 for UNSIGNED_SHORT
                    indexType = indexAccessor.componentType;
                    if (indexType === gl.UNSIGNED_INT && !gl.getExtension('OES_element_index_uint')) {
                        console.error("32-bit indices not supported on this device.");
                        continue;
                    }
                }

                let color = [0.8, 0.8, 0.8, 1.0]; // Default grey
                if (primitive.material !== undefined) {
                    const material = gltf.json.materials[primitive.material];
                    if (material && material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor) {
                        color = material.pbrMetallicRoughness.baseColorFactor;
                    }
                }

                gltfRenderData.models.push({
                    buffers: {
                        position: positionBuffer,
                        normal: normalBuffer,
                        indices: indexBuffer,
                    },
                    vertexCount: vertexCount,
                    indexType: indexType,
                    color: color,
                    modelMatrix: worldMatrix,
                });
            }
        }

        if (node.children) {
            for (const childIndex of node.children) {
                traverseNode(gltf.json.nodes[childIndex], worldMatrix);
            }
        }
    }

    const rootMatrix = glMatrix.mat4.create();
    for (const nodeIndex of defaultScene.nodes) {
        traverseNode(gltf.json.nodes[nodeIndex], rootMatrix);
    }
    console.log("glTF scene processed into render data:", gltfRenderData);
}

function drawGltfScene(gl, programInfo, renderData, view) {
    for (const model of renderData.models) {
        drawGltfMesh(gl, programInfo, model, view);
    }
}

function drawGltfMesh(gl, programInfo, model, view) {
    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    const finalModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, model.modelMatrix);
    const normalMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(normalMatrix, finalModelViewMatrix);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, view.projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, finalModelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    gl.uniform4fv(programInfo.uniformLocations.color, model.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);

    if (model.buffers.indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers.indices);
        gl.drawElements(gl.TRIANGLES, model.vertexCount, model.indexType, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
    }
}


// --- Drawing Functions ---

function drawTexturedSphere(gl, programInfo, bufferInfo, texture, modelMatrix, view) {
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
    //glMatrix.mat4.rotate(alertModelMatrix, alertModelMatrix, Math.PI, [0, 1, 0]);
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

function setupTexturedSphereShaderProgram(gl) {
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
        highp vec3 ambientLight = vec3(0.2, 0.2, 0.2);
        highp vec3 directionalLightColor = vec3(.7, .7, .7);
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

function setupFxaaShaderProgram(gl) {
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;

      uniform vec2 u_resolution;

      varying vec2 v_rgbNW;
      varying vec2 v_rgbNE;
      varying vec2 v_rgbSW;
      varying vec2 v_rgbSE;
      varying vec2 v_rgbM;

      varying vec2 vTextureCoord;

      void main(void) {
          gl_Position = aVertexPosition;
          vTextureCoord = aTextureCoord;

          vec2 inverseVP = 1.0 / u_resolution;
          vec2 fragCoord = vTextureCoord * u_resolution;
          v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
          v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
          v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
          v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
          v_rgbM = fragCoord * inverseVP;
      }
    `;
    const fsSource = `
      precision highp float;

      #ifndef FXAA_REDUCE_MIN
          #define FXAA_REDUCE_MIN   (1.0/ 128.0)
      #endif
      #ifndef FXAA_REDUCE_MUL
          #define FXAA_REDUCE_MUL   (1.0 / 8.0)
      #endif
      #ifndef FXAA_SPAN_MAX
          #define FXAA_SPAN_MAX     8.0
      #endif

      uniform sampler2D u_sceneTexture;
      uniform vec2 u_resolution;

      varying vec2 v_rgbNW;
      varying vec2 v_rgbNE;
      varying vec2 v_rgbSW;
      varying vec2 v_rgbSE;
      varying vec2 v_rgbM;

      varying vec2 vTextureCoord;

      vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,
                  vec2 v_rgbNW, vec2 v_rgbNE,
                  vec2 v_rgbSW, vec2 v_rgbSE,
                  vec2 v_rgbM) {
          vec4 color;
          vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);
          vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;
          vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;
          vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;
          vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;
          vec4 texColor = texture2D(tex, v_rgbM);
          vec3 rgbM  = texColor.xyz;
          vec3 luma = vec3(0.299, 0.587, 0.114);
          float lumaNW = dot(rgbNW, luma);
          float lumaNE = dot(rgbNE, luma);
          float lumaSW = dot(rgbSW, luma);
          float lumaSE = dot(rgbSE, luma);
          float lumaM  = dot(rgbM,  luma);
          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

          vec2 dir;
          dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
          dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

          float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *
                                (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);

          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
          dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
                    max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
                    dir * rcpDirMin)) * inverseVP;

          vec3 rgbA = 0.5 * (
              texture2D(tex, vTextureCoord + dir * (1.0 / 3.0 - 0.5)).xyz +
              texture2D(tex, vTextureCoord + dir * (2.0 / 3.0 - 0.5)).xyz);
          vec3 rgbB = rgbA * 0.5 + 0.25 * (
              texture2D(tex, vTextureCoord + dir * -0.5).xyz +
              texture2D(tex, vTextureCoord + dir * 0.5).xyz);

          float lumaB = dot(rgbB, luma);
          if ((lumaB < lumaMin) || (lumaB > lumaMax))
              color = vec4(rgbA, texColor.a);
          else
              color = vec4(rgbB, texColor.a);
          return color;
      }

      void main() {
          vec2 fragCoord = vTextureCoord * u_resolution;
          gl_FragColor = fxaa(u_sceneTexture, fragCoord, u_resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
      }
    `;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    return {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      },
      uniformLocations: {
        u_sceneTexture: gl.getUniformLocation(shaderProgram, "u_sceneTexture"),
        u_resolution: gl.getUniformLocation(shaderProgram, "u_resolution"),
      },
    };
}

function initGenericBuffers(gl) {
    const quad = createCuboid(2.0, 2.0, 0);
    const quadIndices = new Uint16Array([...quad.frontIndices, ...quad.backIndices]);
    const quadBuffers = {
        position: gl.createBuffer(),
        textureCoord: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: quadIndices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, quad.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffers.textureCoord);
    gl.bufferData(gl.ARRAY_BUFFER, quad.textureCoordinates, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);

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
    const card = createRoundedCuboid(1, 1.5, .75, 0.2, 8);
    const cardBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        textureCoord: gl.createBuffer(),
        frontIndices: gl.createBuffer(),
        backIndices: gl.createBuffer(),
        frontVertexCount: card.frontIndices.length,
        backVertexCount: card.backIndices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, card.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, card.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.textureCoord);
    gl.bufferData(gl.ARRAY_BUFFER, card.textureCoordinates, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardBuffers.frontIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, card.frontIndices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardBuffers.backIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, card.backIndices, gl.STATIC_DRAW);

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
    const stickIndices = new Uint16Array([...stick.frontIndices, ...stick.backIndices]);
    const stickBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: stickIndices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, stick.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, stick.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stickBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, stickIndices, gl.STATIC_DRAW);

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
    const stickIndices = new Uint16Array([...stick.frontIndices, ...stick.backIndices]);
    const stickBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        indices: gl.createBuffer(),
        vertexCount: stickIndices.length,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, stick.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, stick.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stickBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, stickIndices, gl.STATIC_DRAW);

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
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
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
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
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
    const { vec3, mat4, quat } = glMatrix;
    const rayOrigin = vec3.fromValues(transform.position.x, transform.position.y, transform.position.z);

    // Create a quaternion for the downward rotation
    const rotX = quat.create();
    quat.setAxisAngle(rotX, [1, 0, 0], -Math.PI / 6); // -30 degrees

    // Combine the controller's orientation with the downward rotation
    const finalRot = quat.multiply(quat.create(), [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w], rotX);

    // Get the forward direction from the final rotation
    const rayDirection = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(rayDirection, rayDirection, finalRot);

    // The rest of the function remains the same, but this is a safer way to handle rotations.
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

function createRoundedCuboid(width, height, depth, radius, segments) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const iw = w - radius, ih = h - radius;

    const vertices = [];
    const normals = [];
    const uvs = [];
    let frontIndices = [];
    let backIndices = [];

    const profile = [];
    const edgeNormals = [];

    // UV mapping constants for the card texture sub-region
    const u_offset = 128 / 512; // 0.25
    const v_offset = 128 / 512;  // 0.125
    const u_scale = 256 / 512;  // 0.5
    const v_scale = 384 / 512;  // 0.75

    // Generate a 2D rounded rectangle profile and its edge normals
    const cornerSegments = segments;
    // Top-right corner
    for (let i = 0; i <= cornerSegments; i++) {
        const angle = (i / cornerSegments) * (Math.PI / 2);
        profile.push({ x: iw + radius * Math.cos(angle), y: ih + radius * Math.sin(angle) });
        edgeNormals.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    // Top-left corner
    for (let i = 0; i <= cornerSegments; i++) {
        const angle = Math.PI / 2 + (i / cornerSegments) * (Math.PI / 2);
        profile.push({ x: -iw + radius * Math.cos(angle), y: ih + radius * Math.sin(angle) });
        edgeNormals.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    // Bottom-left corner
    for (let i = 0; i <= cornerSegments; i++) {
        const angle = Math.PI + (i / cornerSegments) * (Math.PI / 2);
        profile.push({ x: -iw + radius * Math.cos(angle), y: -ih + radius * Math.sin(angle) });
        edgeNormals.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    // Bottom-right corner
    for (let i = 0; i <= cornerSegments; i++) {
        const angle = 1.5 * Math.PI + (i / cornerSegments) * (Math.PI / 2);
        profile.push({ x: iw + radius * Math.cos(angle), y: -ih + radius * Math.sin(angle) });
        edgeNormals.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }

    // Generate vertices, normals, and UVs for the front, back, and edge faces
    const profileLen = profile.length;
    for (let i = 0; i < profileLen; i++) {
        const p = profile[i];
        const n = edgeNormals[i];

        const u = 0.5 + p.x / width;
        const v = 0.5 - p.y / height;
        const scaled_u = u_offset + u * u_scale;
        const scaled_v = v_offset + v * v_scale;

        // Front vertex
        vertices.push(p.x, p.y, d);
        normals.push(0, 0, 1);
        uvs.push(scaled_u, scaled_v);
        // Back vertex
        vertices.push(p.x, p.y, -d);
        normals.push(0, 0, -1);
        uvs.push(scaled_u, scaled_v); // Back UVs fixed later
        // Edge vertex 1
        vertices.push(p.x, p.y, d);
        normals.push(n.x, n.y, 0);
        uvs.push(0.01, 0.01); // Small portion of texture for solid edge color
        // Edge vertex 2
        vertices.push(p.x, p.y, -d);
        normals.push(n.x, n.y, 0);
        uvs.push(0.01, 0.01);
    }

    // Fix back UVs to be flipped horizontally
    for (let i = 0; i < profileLen; i++) {
        const back_v_idx = i * 4 + 1;
        const p_x = vertices[back_v_idx * 3];
        const u_flipped = 0.5 - p_x / width;
        uvs[back_v_idx * 2] = u_offset + u_flipped * u_scale;
    }

    // Generate indices
    const frontCenterIndex = vertices.length / 3;
    vertices.push(0, 0, d); normals.push(0, 0, 1); uvs.push(u_offset + 0.5 * u_scale, v_offset + 0.5 * v_scale);
    const backCenterIndex = vertices.length / 3;
    vertices.push(0, 0, -d); normals.push(0, 0, -1); uvs.push(u_offset + 0.5 * u_scale, v_offset + 0.5 * v_scale);


    for (let i = 0; i < profileLen; i++) {
        const next_i = (i + 1) % profileLen;

        // Front face indices
        const v_front = i * 4;
        const v_next_front = next_i * 4;
        frontIndices.push(v_front, v_next_front, frontCenterIndex);

        // Back face indices
        const v_back = i * 4 + 1;
        const v_next_back = next_i * 4 + 1;
        backIndices.push(v_back, backCenterIndex, v_next_back);

        // Edge face indices
        const v_edge1 = i * 4 + 2;
        const v_edge2 = i * 4 + 3;
        const v_next_edge1 = next_i * 4 + 2;
        const v_next_edge2 = next_i * 4 + 3;
        backIndices.push(v_edge1, v_next_edge1, v_edge2);
        backIndices.push(v_next_edge1, v_next_edge2, v_edge2);
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        textureCoordinates: new Float32Array(uvs),
        frontIndices: new Uint16Array(frontIndices),
        backIndices: new Uint16Array(backIndices)
    };
}

function createCuboid(width, height, depth) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const vertices = new Float32Array([
        // Front face (0-3)
        -w, -h,  d,  w, -h,  d,  w,  h,  d, -w,  h,  d,
        // Back face (4-7)
        -w, -h, -d, -w,  h, -d,  w,  h, -d,  w, -h, -d,
        // Top face (8-11)
        -w,  h,  d,  w,  h,  d,  w,  h, -d, -w,  h, -d,
        // Bottom face (12-15)
        -w, -h,  d, -w, -h, -d,  w, -h, -d,  w, -h,  d,
        // Right face (16-19)
         w, -h,  d,  w, -h, -d,  w,  h, -d,  w,  h,  d,
        // Left face (20-23)
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
        // Front face (maps to the whole texture)
        0.0,  1.0, 1.0,  1.0, 1.0,  0.0, 0.0,  0.0,
        // Back face (maps to the whole texture, for the card back)
        0.0,  1.0, 0.0,  0.0, 1.0,  0.0, 1.0,  1.0,
        // Top, Bottom, Right, Left faces (map to a single white pixel for the edge)
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, // Top
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, // Bottom
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, // Right
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, // Left
    ]);

    // Indices for the front face
    const frontIndices = new Uint16Array([
        0,  1,  2,      0,  2,  3,
    ]);

    // Indices for the back and edge faces
    const backIndices = new Uint16Array([
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);

    return { vertices, normals, textureCoordinates, frontIndices, backIndices };
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

function createTextureableSphere(radius, latitudeBands, longitudeBands) {
    const vertices = [];
    const normals = [];
    const uvs = [];
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
            uvs.push(longNumber / longitudeBands, latNumber / latitudeBands);
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
        textureCoordinates: new Float32Array(uvs),
        indices: new Uint16Array(indices),
        vertexCount: indices.length
    };
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
