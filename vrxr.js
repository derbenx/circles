var inAR = false;
var inVR = false;
let vrSession = null;
let arSession = null;

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

    await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, {antialias: true}) });

    let referenceSpace;
    try {
        referenceSpace = await session.requestReferenceSpace("local-floor");
    } catch (e) {
        referenceSpace = await session.requestReferenceSpace("local");
    }

    const textureProgramInfo = setupTextureShaderProgram(gl);
    const solidColorProgramInfo = setupSolidColorShaderProgram(gl);
    const fxaaProgramInfo = setupFxaaShaderProgram(gl);
    const programs = { textureProgramInfo, solidColorProgramInfo, fxaaProgramInfo };

    const genericBuffers = initGenericBuffers(gl);
    const pieceBuffers = initPieceBuffers(gl);
    const controllerBuffers = initControllerBuffers(gl);
    const buffers = { genericBuffers, pieceBuffers, controllerBuffers };

    const fxaaQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fxaaQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);

    const fbo = gl.createFramebuffer();
    let fboTexture = gl.createTexture();
    let fboDepthbuffer = gl.createRenderbuffer();
    let fboWidth = 0;
    let fboHeight = 0;

    const alertTexture = initTexture(gl, createAlertCanvas());
    const pointerTexture = initTexture(gl, createPointerCanvas());
    const textures = { alertTexture, pointerTexture };

    let activeController = null;
    let vrCanvasPosition = (mode === 'immersive-ar') ? [0, 0.0, -2.0] : [0, 1.0, -2.0];
    let vrCanvasRotationY = 0;
    canvasModelMatrix = glMatrix.mat4.create();
    let sessionActive = true;

    session.addEventListener('end', () => {
        sessionActive = false;
        if (session === vrSession) { inVR = false; vrSession = null; }
        if (session === arSession) { inAR = false; arSession = null; }
        if (onEndCallback) onEndCallback();
        const vrButton = document.getElementById("btn-vr");
        if(vrButton) vrButton.textContent = "Start VR";
        const xrButton = document.getElementById('btn-xr');
        if(xrButton) xrButton.textContent = 'Start XR';
    });

    session.addEventListener('selectstart', (event) => {
      activeController = event.inputSource;
      if (vrAlertState.shown) {
        if (vrAlertState.onDismiss) vrAlertState.onDismiss();
        vrAlertState.shown = false;
        ignoreNextSelectEnd = true;
        return;
      }
      if (vrIntersection) clkd({ preventDefault: () => {}, stopPropagation: () => {} }, vrIntersection.local);
    });

    session.addEventListener('selectend', () => {
      if (ignoreNextSelectEnd) { ignoreNextSelectEnd = false; return; }
      if (vrIntersection) clku({ preventDefault: () => {}, stopPropagation: () => {} }, vrIntersection.local);
    });

    function onXRFrame(time, frame) {
        if (!sessionActive) return;
        session.requestAnimationFrame(onXRFrame);
        if (typeof draw === 'function') draw(1);
        const pose = frame.getViewerPose(referenceSpace);
        if (!pose) return;

        vrIntersection = null;
        let rightController = null;
        for (const source of session.inputSources) {
            if (source.handedness === 'right') rightController = source;
        }
        if (!activeController) activeController = rightController || session.inputSources[0] || null;

        if (rightController && rightController.gamepad) {
            const thumbstickY = rightController.gamepad.axes[3];
            if (Math.abs(thumbstickY) > 0.1) vrCanvasPosition[2] += thumbstickY * 0.02;
            const thumbstickX = rightController.gamepad.axes[2];
            if (Math.abs(thumbstickX) > 0.4) vrCanvasRotationY += thumbstickX * 0.02;
        }

        if (activeController && activeController.gripSpace) {
            const gripPose = frame.getPose(activeController.gripSpace, referenceSpace);
            if (gripPose) {
                const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
                if (intersection) vrIntersection = { ...intersection, gripPose, controller: activeController };
            }
        }

        glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);
        glMatrix.mat4.rotateY(canvasModelMatrix, canvasModelMatrix, vrCanvasRotationY);
        glMatrix.mat4.scale(canvasModelMatrix, canvasModelMatrix, [boardAspectRatio || (gameXx / gameYy), 1, 1]);

        const glLayer = session.renderState.baseLayer;
        for (const view of pose.views) {
            const viewport = glLayer.getViewport(view);
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

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboDepthbuffer);
            gl.viewport(0, 0, fboWidth, fboHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            if (drawGameCallback) drawGameCallback(gl, programs, buffers, view);
            drawControllers(gl, solidColorProgramInfo, controllerBuffers, session, frame, referenceSpace, view);
            if (vrIntersection) drawCursor(gl, programs, buffers.genericBuffers, textures.pointerTexture, view);
            if (vrAlertState.shown) drawAlert(gl, textureProgramInfo, buffers.genericBuffers, textures.alertTexture, pose, view);

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

function drawControllers(gl, programInfo, buffers, session, frame, referenceSpace, view) { /* ... same as before ... */ }
function drawCursor(gl, programs, buffers, texture, view) { /* ... same as before ... */ }
function drawAlert(gl, programInfo, buffers, texture, pose, view) { /* ... same as before ... */ }
function drawSolid(gl, programInfo, bufferInfo, modelMatrix, view, color) { /* ... same as before ... */ }
function drawTextured(gl, programInfo, bufferInfo, texture, modelMatrix, view) { /* ... same as before ... */ }
function setupTextureShaderProgram(gl) { /* ... same as before ... */ }
function setupSolidColorShaderProgram(gl) { /* ... same as before ... */ }

function setupFxaaShaderProgram(gl) {
    const vsSource = `
      attribute vec4 aVertexPosition; attribute vec2 aTextureCoord;
      uniform vec2 u_resolution;
      varying vec2 v_rgbNW; varying vec2 v_rgbNE; varying vec2 v_rgbSW; varying vec2 v_rgbSE; varying vec2 v_rgbM;
      varying vec2 vTextureCoord;
      void main(void) {
          gl_Position = aVertexPosition; vTextureCoord = aTextureCoord;
          vec2 inverseVP = 1.0 / u_resolution; vec2 fragCoord = vTextureCoord * u_resolution;
          v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP; v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
          v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP; v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
          v_rgbM = fragCoord * inverseVP;
      }`;
    const fsSource = `
      precision highp float;
      #define FXAA_REDUCE_MIN (1.0/128.0)
      #define FXAA_REDUCE_MUL (1.0/8.0)
      #define FXAA_SPAN_MAX 8.0
      uniform sampler2D u_sceneTexture; uniform vec2 u_resolution;
      varying vec2 v_rgbNW; varying vec2 v_rgbNE; varying vec2 v_rgbSW; varying vec2 v_rgbSE; varying vec2 v_rgbM;
      varying vec2 vTextureCoord;
      vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution, vec2 v_rgbNW, vec2 v_rgbNE, vec2 v_rgbSW, vec2 v_rgbSE, vec2 v_rgbM) {
          vec4 color; vec2 inverseVP = 1.0 / resolution;
          vec3 rgbNW = texture2D(tex, v_rgbNW).xyz; vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;
          vec3 rgbSW = texture2D(tex, v_rgbSW).xyz; vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;
          vec4 texColor = texture2D(tex, v_rgbM); vec3 rgbM  = texColor.xyz;
          vec3 luma = vec3(0.299, 0.587, 0.114);
          float lumaNW = dot(rgbNW, luma); float lumaNE = dot(rgbNE, luma);
          float lumaSW = dot(rgbSW, luma); float lumaSE = dot(rgbSE, luma);
          float lumaM  = dot(rgbM,  luma);
          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
          vec2 dir; dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE)); dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));
          float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
          dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;
          vec3 rgbA = 0.5 * (texture2D(tex, vTextureCoord + dir * (1.0/3.0 - 0.5)).xyz + texture2D(tex, vTextureCoord + dir * (2.0/3.0 - 0.5)).xyz);
          vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, vTextureCoord + dir * -0.5).xyz + texture2D(tex, vTextureCoord + dir * 0.5).xyz);
          float lumaB = dot(rgbB, luma);
          if ((lumaB < lumaMin) || (lumaB > lumaMax)) color = vec4(rgbA, texColor.a); else color = vec4(rgbB, texColor.a);
          return color;
      }
      void main() {
          vec2 fragCoord = vTextureCoord * u_resolution;
          gl_FragColor = fxaa(u_sceneTexture, fragCoord, u_resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
      }`;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    return {
      program: shaderProgram,
      attribLocations: { vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"), textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord") },
      uniformLocations: { u_sceneTexture: gl.getUniformLocation(shaderProgram, "u_sceneTexture"), u_resolution: gl.getUniformLocation(shaderProgram, "u_resolution") },
    };
}

function initGenericBuffers(gl) { /* ... same as before ... */ }
function initPieceBuffers(gl) { /* ... same as before ... */ }
function initControllerBuffers(gl) { /* ... same as before ... */ }
function initShaderProgram(gl, vsSource, fsSource) { /* ... same as before ... */ }
function loadShader(gl, type, source) { /* ... same as before ... */ }

function initTexture(gl, source) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}

function updateTexture(gl, texture, source) { /* ... same as before ... */ }
function createAlertCanvas(message = "You Won!") { /* ... same as before ... */ }
function createPointerCanvas() { /* ... same as before ... */ }
function intersectPlane(transform, quadModelMatrix) { /* ... same as before ... */ }

function createRoundedCuboid(width, height, depth, radius, segments) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const iw = w - radius, ih = h - radius;
    const vertices = [], normals = [], uvs = [], frontIndices = [], backIndices = [];
    const profile = [], edgeNormals = [];
    const u_offset = 128 / 512, v_offset = 128 / 512, u_scale = 256 / 512, v_scale = 384 / 512;
    const cornerSegments = segments;
    for (let i = 0; i <= cornerSegments; i++) { const angle = (i/cornerSegments)*(Math.PI/2); profile.push({x:iw+radius*Math.cos(angle),y:ih+radius*Math.sin(angle)}); edgeNormals.push({x:Math.cos(angle),y:Math.sin(angle)}); }
    for (let i = 0; i <= cornerSegments; i++) { const angle = Math.PI/2+(i/cornerSegments)*(Math.PI/2); profile.push({x:-iw+radius*Math.cos(angle),y:ih+radius*Math.sin(angle)}); edgeNormals.push({x:Math.cos(angle),y:Math.sin(angle)}); }
    for (let i = 0; i <= cornerSegments; i++) { const angle = Math.PI+(i/cornerSegments)*(Math.PI/2); profile.push({x:-iw+radius*Math.cos(angle),y:-ih+radius*Math.sin(angle)}); edgeNormals.push({x:Math.cos(angle),y:Math.sin(angle)}); }
    for (let i = 0; i <= cornerSegments; i++) { const angle = 1.5*Math.PI+(i/cornerSegments)*(Math.PI/2); profile.push({x:iw+radius*Math.cos(angle),y:-ih+radius*Math.sin(angle)}); edgeNormals.push({x:Math.cos(angle),y:Math.sin(angle)}); }
    const profileLen = profile.length;
    for (let i = 0; i < profileLen; i++) {
        const p = profile[i], n = edgeNormals[i];
        const u = 0.5 + p.x/width, v = 0.5 - p.y/height;
        const scaled_u = u_offset + u*u_scale, scaled_v = v_offset + v*v_scale;
        vertices.push(p.x, p.y, d); normals.push(0,0,1); uvs.push(scaled_u, scaled_v);
        vertices.push(p.x, p.y, -d); normals.push(0,0,-1); uvs.push(scaled_u, scaled_v);
        vertices.push(p.x, p.y, d); normals.push(n.x,n.y,0); uvs.push(0.01,0.01);
        vertices.push(p.x, p.y, -d); normals.push(n.x,n.y,0); uvs.push(0.01,0.01);
    }
    for (let i = 0; i < profileLen; i++) {
        const back_v_idx = i*4+1, p_x = vertices[back_v_idx*3], u_flipped = 0.5 - p_x/width;
        uvs[back_v_idx*2] = u_offset + u_flipped*u_scale;
    }
    const frontCenterIndex = vertices.length/3; vertices.push(0,0,d); normals.push(0,0,1); uvs.push(u_offset+0.5*u_scale, v_offset+0.5*v_scale);
    const backCenterIndex = vertices.length/3; vertices.push(0,0,-d); normals.push(0,0,-1); uvs.push(u_offset+0.5*u_scale, v_offset+0.5*v_scale);
    for (let i = 0; i < profileLen; i++) {
        const next_i = (i+1)%profileLen;
        const v_front = i*4, v_next_front = next_i*4; frontIndices.push(v_front, v_next_front, frontCenterIndex);
        const v_back = i*4+1, v_next_back = next_i*4+1; backIndices.push(v_back, backCenterIndex, v_next_back);
        const v_edge1 = i*4+2, v_edge2 = i*4+3, v_next_edge1 = next_i*4+2, v_next_edge2 = next_i*4+3;
        backIndices.push(v_edge1, v_next_edge1, v_edge2); backIndices.push(v_next_edge1, v_next_edge2, v_edge2);
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), textureCoordinates: new Float32Array(uvs), frontIndices: new Uint16Array(frontIndices), backIndices: new Uint16Array(backIndices) };
}

function createCuboid(width, height, depth) { /* ... same as before ... */ }
function createCylinder(radius, height, segments) { /* ... same as before ... */ }
function createHalfCylinder(radius, height, segments) { /* ... same as before ... */ }
function createRing(outerRadius, innerRadius, height, segments) { /* ... same as before ... */ }
function createArc(outerRadius, innerRadius, height, segments, startAngle, endAngle) { /* ... same as before ... */ }
function createCone(radius, height, segments) { /* ... same as before ... */ }
function createSphere(radius, latitudeBands, longitudeBands) { /* ... same as before ... */ }
