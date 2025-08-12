
// VR
function onSessionEnded(session) {
  session.removeEventListener("end", onSessionEnded);
  document.getElementById("btn-vr").disabled = false;
}

async function activateVR() {
  let vrIntersectionPoint = null;
  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      requiredFeatures: ["local-floor"],
    });
    session.addEventListener("end", onSessionEnded);

    let vrSelectIsDown = false;
    let yButtonPressedLastFrame = false;

    session.addEventListener('selectstart', () => {
      if (vrIntersectionPoint) {
        vrSelectIsDown = true;
        clkd({ preventDefault: () => {} });
      }
    });

    session.addEventListener('selectend', () => {
      if (vrIntersectionPoint) {
        vrSelectIsDown = false;
        clku({ preventDefault: () => {} });
      }
    });

    const sourceCanvas = document.getElementById("can");
    const spriteCanvas = document.getElementById("spr");
    const compositeCanvas = document.createElement("canvas");
    const compositeCtx = compositeCanvas.getContext("2d");

    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", { xrCompatible: true });

    // Vertex shader
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;

      varying highp vec2 vTextureCoord;

      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `;

    // Fragment shader
    const fsSource = `
      precision mediump float;
      varying highp vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform bool uUseSolidColor;
      uniform vec4 uSolidColor;

      void main(void) {
        if (uUseSolidColor) {
          gl_FragColor = uSolidColor;
        } else {
          gl_FragColor = texture2D(uSampler, vTextureCoord);
        }
      }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
        uUseSolidColor: gl.getUniformLocation(shaderProgram, "uUseSolidColor"),
        uSolidColor: gl.getUniformLocation(shaderProgram, "uSolidColor"),
      },
    };

    const buffers = initBuffers(gl);
    let texture = initTexture(gl, sourceCanvas);

    const vrCanvasPosition = [0, 1.6, -2.0];
    const canvasModelMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    const referenceSpace = await session.requestReferenceSpace("local-floor");

    function onXRFrame(time, frame) {
      const session = frame.session;
      session.requestAnimationFrame(onXRFrame);

      draw(1);

      compositeCanvas.width = sourceCanvas.width;
      compositeCanvas.height = sourceCanvas.height;
      compositeCtx.drawImage(sourceCanvas, 0, 0);
      compositeCtx.drawImage(spriteCanvas, 0, 0);

      updateTexture(gl, texture, compositeCanvas);

      const pose = frame.getViewerPose(referenceSpace);
      if (pose) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        vrIntersectionPoint = null;
        for (const source of frame.session.inputSources) {
          if (source.handedness === 'left' && source.gamepad) {
            const thumbstickX = source.gamepad.axes[2];
            const thumbstickY = source.gamepad.axes[3];
            const moveSpeed = 0.02;

            if (Math.abs(thumbstickX) > 0.1) {
              vrCanvasPosition[0] += thumbstickX * moveSpeed;
            }
            if (Math.abs(thumbstickY) > 0.1) {
              vrCanvasPosition[1] -= thumbstickY * moveSpeed;
            }
            glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);

            const yButton = source.gamepad.buttons[3]; // Y button
            if (yButton && yButton.pressed && !yButtonPressedLastFrame) {
              document.getElementById("btn-vr").disabled = false;
              session.end();
            }
            yButtonPressedLastFrame = yButton ? yButton.pressed : false;
          }

          if (source.gripSpace) {
            const gripPose = frame.getPose(source.gripSpace, referenceSpace);
            if (gripPose) {
              const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
              if (intersection) {
                vrIntersectionPoint = intersection.world;
                // Convert intersection point to canvas coordinates
                mx = ((intersection.local[0] + 1) / 2) * ww;
                my = ((1 - intersection.local[1]) / 2) * hh;
              }
            }
          }
        }

        for (const view of pose.views) {
          const viewport = session.renderState.baseLayer.getViewport(view);
          gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

          const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, canvasModelMatrix);
          drawScene(gl, programInfo, buffers, texture, view.projectionMatrix, modelViewMatrix);

          if (vrIntersectionPoint) {
            const { mat4 } = glMatrix;
            const pointerMatrix = mat4.create();
            mat4.translate(pointerMatrix, pointerMatrix, vrIntersectionPoint);
            mat4.scale(pointerMatrix, pointerMatrix, [0.05, 0.05, 0.05]);
            mat4.multiply(pointerMatrix, view.transform.inverse.matrix, pointerMatrix);
            drawScene(gl, programInfo, buffers, texture, view.projectionMatrix, pointerMatrix, true, [1, 0, 0, 1]);
          }
        }
      }
    }

    session.requestAnimationFrame(onXRFrame);
    document.getElementById("btn-vr").disabled = true;
  } catch (error) {
    console.error(error);
    alert("Failed to enter VR mode.");
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
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  const textureCoordinates = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
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

function drawScene(gl, programInfo, buffers, texture, projectionMatrix, modelViewMatrix, useSolidColor = false, solidColor = [1, 0, 0, 1]) {
  gl.useProgram(programInfo.program);

  gl.uniform1i(programInfo.uniformLocations.uUseSolidColor, useSolidColor);
  if (useSolidColor) {
    gl.uniform4fv(programInfo.uniformLocations.uSolidColor, solidColor);
  }

  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function intersectPlane(transform, quadModelMatrix) {
  const { vec3, mat4 } = glMatrix;

  // Ray in world space
  const rayOrigin = vec3.fromValues(transform.position.x, transform.position.y, transform.position.z);
  const rayDirection = vec3.fromValues(0, 0, -1);
  vec3.transformQuat(rayDirection, rayDirection, [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w]);

  // Transform ray to quad's local space
  const invModelMatrix = mat4.invert(mat4.create(), quadModelMatrix);
  const rayOriginLocal = vec3.transformMat4(vec3.create(), rayOrigin, invModelMatrix);
  const rayDirectionLocal = vec3.transformMat4(vec3.create(), rayDirection, invModelMatrix);
  vec3.subtract(rayDirectionLocal, rayDirectionLocal, vec3.transformMat4(vec3.create(), [0,0,0], invModelMatrix));
  vec3.normalize(rayDirectionLocal, rayDirectionLocal);

  // Intersect with Z=0 plane in local space
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

document.getElementById("btn-vr").onclick = activateVR;
