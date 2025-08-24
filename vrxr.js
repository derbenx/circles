var inAR = false;
var inVR = false;
var vrShowAlert = false;
var vrAlertMessage = "";
var vrAlertNeedsUpdate = false;
let ignoreNextSelectEnd = false;
let vrSession = null;
let arSession = null;

function toggleVR() {
  if (vrSession) {
    vrSession.end();
  } else {
    activateVR();
  }
}

function toggleAR() {
    if (arSession) {
        arSession.end();
    } else {
        activateAR();
    }
}

async function activateAR() {
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
        runXRRendering(arSession, 'immersive-ar');
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
}

async function runXRRendering(session, mode, drawGameCallback) {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", { xrCompatible: true });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    let referenceSpace;
    try {
        referenceSpace = await session.requestReferenceSpace("local-floor");
    } catch (e) {
        console.warn("Could not get 'local-floor' reference space, falling back to 'local'");
        referenceSpace = await session.requestReferenceSpace("local");
    }

    function onXRFrame(time, frame) {
        session.requestAnimationFrame(onXRFrame);

        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
            const glLayer = session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
            gl.clearColor(0.1, 0.2, 0.3, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            if (drawGameCallback) {
                drawGameCallback(gl, pose, frame);
            }
        }
    }
    session.requestAnimationFrame(onXRFrame);
}

async function activateVR() {
  const vrButton = document.getElementById("btn-vr");
  try {
    vrSession = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"],
    });
    inVR = true;
    vrSession.addEventListener("end", onSessionEnded);
    vrButton.textContent = "Stop VR";
    vrButton.disabled = false;
    runXRRendering(vrSession, 'immersive-vr');
  } catch (error) {
    console.error("Failed to enter VR mode:", error);
    vrSession = null;
    inVR = false;
    vrButton.textContent = "Start VR";
    vrButton.disabled = false;
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initBuffers(gl) {
  const positionBuffer = gl.createBuffer();
  const textureCoordBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
  };
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

function drawScene(gl, programInfo, buffers, texture, projectionMatrix, modelViewMatrix) {
  gl.useProgram(programInfo.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function intersectPlane(transform, quadModelMatrix) {
  const { vec3, mat4 } = glMatrix;

  const rayOrigin = vec3.fromValues(transform.position.x, transform.position.y, transform.position.z);
  const rayDirection = vec3.fromValues(0, 0, -1);
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
        return {
          world: intersectionWorld,
          local: intersectionLocal
        };
      }
    }
  }
  return null;
}

function createCuboid(width, height, depth) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const vertices = [
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
    ];
    const textureCoordinates = [
        // Front
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Back
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Top
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Bottom
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Right
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
        // Left
        0.0,  0.0, 1.0,  0.0, 1.0,  1.0, 0.0,  1.0,
    ];
    const indices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ];
    return { vertices: new Float32Array(vertices), textureCoordinates: new Float32Array(textureCoordinates), indices: new Uint16Array(indices) };
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
