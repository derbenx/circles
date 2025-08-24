//https://www.youtube.com/watch?v=TZWI0wqewXc

var game,can,spr,bw,bh;
//var dbug,dbtm;
var done=0;
var mx,my;// current pointer location
var gx,gy;// grabbed square
var fx=fy=-1;// mouse grabbed coords
var px,py,pz;// phone/touch grabbed
var drag=0; //draggable
var xx=7; //cards across
var yy=25; //vertical sections
var cs=5; //card grid length
var sprd=[]; // main area
var flow=[]; // dragged cards
var aces=[[],[],[],[]]; // aces storage
// deck[] and pile[] in cards.js
var flox=[];var floy=[];
var flod=0;
var flower;
var bgsk;
var inAR = false;
var inVR = false;
var vrShowAlert = false;
var vrAlertMessage = "";
var vrAlertNeedsUpdate = false;
let ignoreNextSelectEnd = false;
let vrSession = null;
co1='lime';co2='green';drw=1;fre=1;
start();
 
document.getElementById("soldrw").onchange = function(){
 drw=document.getElementById("soldrw").value*1;
}
document.getElementById("solfre").onchange = function(){
 fre=document.getElementById("solfre").value*1;
}
document.getElementById("co1").onchange = function(){
 co1=document.getElementById("co1").value;
 redraw();
}
document.getElementById("co2").onchange = function(){
 co2=document.getElementById("co2").value;
 redraw();
}


document.getElementById("soltogsetup").onclick = function(){
 var soltog=document.getElementById("solsetup");
 if (soltog.style.display !== "none") {
  soltog.style.display = "none";
 } else {
  soltog.style.display = "block";
 }
}
document.getElementById("solstart").onclick = function(){
 done=0;
 aces=[[],[],[],[]]
 start();
}
/*
function debug(t){
// use debug(time-in-ms,arg,arg,etc) to display popup messages
 clearTimeout(dbtm);
 if (!dbug){
  dbug=document.createElement('div'); dbug.id="dbug";document.body.appendChild(dbug);
 }
 for (var x in arguments){
  if (x!=0){dbug.innerHTML+=arguments[x]+'<br>';}
 }
 dbtm=setTimeout(function(){dbug.remove();dbug='';}, t);
}
*/

function flowdn(){
 if (flod<1){return;}
 flod--;
 flox.pop();floy.pop();
 flox.reverse();floy.reverse();
 flox.push(mx-(tmpw/2));
 floy.push(my);
 flox.reverse();floy.reverse();
 clrcan(spr);
 for (i=0;i<flow.length;i++){
   dcd(spr,flox[i],floy[i]+((bw/yy)*i)-(tmpw/2),flow[i],tmpw,co1,co2);
 }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function clku(evn){
 evn.stopPropagation();
 evn.preventDefault();
 //console.log(evn);
 clearInterval(flower);
 clrcan(spr);
 if (done) { return; }


 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 //fx=mx;fy=my;
 tx=Math.floor((mx/bw)*xx); ty=Math.floor((my/bh)*yy);
 
 if (flow.length<1 && tx==0 && ty>=1 && ty<=4){
  //in pile (top left)
  //console.log('in pile',drw);
  tmpw=bw/xxx;
  ccc=dr(drw);

  //animate to show x cards here


  if (ccc.length>0) {
   pile.push(...ccc); //Uses items not arrays
   for (ii=0;ii<drw-1;ii++){
    //console.log('>>',ccc[ii]);
    //pile.push(ccc[ii]);
    //console.log('>',pile);
    dcd(can,(1*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),ccc[ii],tmpw,co1,co2);
    await sleep(300);
   }


  }else{
   deck=pile;
   deck.reverse();
   pile=[];
   tc='';
  }
  //console.log(deck.length);
  if (deck.length<1) {
   //console.log('poof',(tmpw/xxx),(bw/yy));
  }
   //console.log(pile, deck);
   tc=pile[pile.length-1];
   //console.log(tc,ccc.length);
  
  //dcd(can,(tmpw+(tmpw/xxx))+(tmpw/xxx),(bw/yy),tc,tmpw,co1,co2);
  //return;
 } else if (drag){
  //in spread
  ffx=Math.floor((fx/bw)*xx); ffy=Math.floor((fy/bh)*yy);
  
  //console.log('fy:',fy,'ffy:',ffy);
  
  
  //console.log('>>',tx);
  if (ty<5 && tx>2){
   dbtc=aces[tx-3][aces[tx-3].length-1]; //aces card
   //console.log('>>>',dbtc);
  }else{
   dbtc=sprd[tx][sprd[tx].length-1];
  }
  cvz=[ crdval(flow[0],0), crdval(dbtc,0) ];
  cvz.push( crdcol(flow[0],dbtc) );
  //debug(5000,ffx,flow[0],tx,dbtc);
  //console.log(sprd);


  if (ffy>5){ //split line
   //console.log('taken below');
   var tmp=undefined; //sprd[gx][gy-5];
   for (i=0;i<(cs);i++){
    tmp= tmp===undefined ? sprd[ffx][ffy-6-i] :  tmp;
    if (tmp!=undefined) break;
   }
  }else{
   //console.log('taken above:',flow);
   if (fre){
    //tx=-tx-1;
   }
  }
 
 //console.log('dropped',tx ,ty,flow.length,flow);
  
  if (flow.length==1 && ty<6 && tx>2 && tx<7){
   //console.log('dropped in aces area');

   //console.log('aces in:',flow,'sc:',sc[tx-3],'tx:',tx,'ffx:',ffx);
   //console.log('aces in:',cvz);
   fail=0;
   if (flow[0][0]!=sc[tx-3]){
    //failed shape matches sc[]
    //console.log('aces fail shape');
    fail= !fre ? 0 : 1;
   }
   if (cvz[0]!=cvz[1]+1){
     //console.log('aces fail seq');
     fail= !fre || (cvz[0]==0 && cvz[1]==-1) ? fail : 1; // if not 0-0: fail
   }

   if (fail>0){
    if (ffy<5 && ffx<3){
     pile.push(flow[0]);
    } else if (ffy<5 && ffx>2){
     (aces[ffx-3]).push(flow[0]);
    }else{
     sprd[ffx].push(...flow);
    }
   }else{
    (aces[tx-3]).push(flow[0]);
    flp=0;
   }
  }else if(flow.length && ty>5){
   //console.log('dropped in spread');

   if (flow[0]!=undefined){
    //console.log('flow0:',flow," tx:",tx);
    fail=0;
    if (cvz[2] && cvz[2][3]==true) {
     //console.log('colour fail');
     fail= !fre ? 0 : 1;
    }
    if (cvz[0]!=cvz[1]-1 && cvz[1]!=-1) {
     //console.log('num fail');
     fail= !fre ? 0 : 1;
    }
    
    if (fail){
     if (ffy>5){ //from spread
      sprd[ffx].push(...flow);
     }else if (ffx>2 && ffx<7){ //from aces
      //console.log('tst2');
      (aces[ffx-3]).push(flow[0]);
     } else { // from pile
      pile.push(flow[0]);
     }
    }else{
     //tx=tx<0 && ffy<6 ? tx=-tx-1 : tx;
     sprd[tx].push(...flow);
    }

/*
    if (tx<0 && fre){
     console.log('taken above');
     //console.log('cvz:',cvz,'cvz2:',cvz[2]);
     if (fail){
      
      flow=[];
     } else {
      tx=-tx-1;
     }
    }
    if (flow){
     sprd[tx].push(...flow);
    }
*/
    
   }
   var flp= tx==ffx ? 1:0;
  }else{
   if (flow[0]){
   //console.log('drop invalid');
    if (ffy>5){ //from spread
     sprd[ffx].push(...flow);
    }else if (ffx>2 && ffx<7){ //from aces
     (aces[ffx-3]).push(flow[0]);
    }else{ //from pile
     pile.push(flow[0]);
    }
   }
  }
  clrcan(can);
 }
 drag=0;fx=-1;fy=-1;
 redraw(flp);
 flow=[];
 tc="";

 if (aces[0].length>12 && aces[1].length>12 && aces[2].length>12 && aces[3].length>12){
   done=1;
   //debug(99999,'Congrats!','Congrats!','Congrats!','Congrats!','Congrats!')
   dnm(spr,(bw/4),(bh/3),25,"Congrats, Game Over!",1);
  }
}

function clkd(evn){
 if (flow.length) { return; }
 flox=[];floy=[];
 clrcan(can);
 redraw(1);
 bgsk=0;
 if (done) { return; }
 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 fx=mx;fy=my;
 gx=Math.floor((mx/bw)*xx); gy=Math.floor((my/bh)*yy);
 if (gy>5 && sprd[gx][gy-6] && sprd[gx][gy-6].substr(0,1)=='x'){
  fx=-1;fy=-1;gx=-1;gy=-1;
 }
}

function movr(evn){

 if (done) { return; }
 mx=evn.offsetX; my=evn.offsetY;
 if (!mx && evn.changedTouches!=undefined){
  //console.log("f",fx,fy,"g",gx,gy);
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 //console.log('m:',mx,my,drag,"f",fx,fy,"g",gx,gy);
  
 if (fx==-1){ return; }
 drag=1;
 tmpw=bw/xxx;
 tx=Math.floor((fx/bw)*xx); ty=Math.floor((fy/bh)*yy);
 
 if (tx>-1){
  if (!tc){
   //console.log('t:',tx,ty); //console.log('f:',fx,fy); //   console.log('g:',gx,gy);
   var tc=undefined; //sprd[gx][gy-5];
   if (gy<5 && gx==1){
    tc=pile[pile.length-1];
   } else {
    for (i=0;i<(cs);i++){
     tc= tc===undefined ? sprd[tx][ty-6-i] :  tc;
     if (tc!=undefined) break;
    }
   }
  }
  //console.log('tc:'+tc);

  //collect dragged cards
  if (!flow[0]) {
   if (gy<5 && gx>2 && gx<7 && aces[gx-3]!=undefined){ //aces area
    //console.log('drag aces');
    //console.log('aces',aces[gx-3]);
    //console.log('aces out:',aces);
    flow[0]=aces[gx-3].pop();
   }
   if (gy<5 && gx==1){// drag from pile
    if (pile.length>0){
     flow[0]=pile.pop();
    }else{
     fx=-1;
    }

  } else { // spread
   i=0;
   var tmpz;
   while (tmpz!=tc){
    var tmpz=sprd[tx].pop();
    if (tmpz){
     flow[i]=tmpz;
     flox[i]=mx-(tmpw/2);
     floy[i]=my+((bw/yy)*i);
     i++;
    }
   }
   flow.reverse();
   flox.reverse();
   floy.reverse();
 }
   //console.log(mx,my,tc,flow);
   if (flow[0]==undefined){   
    flow=[];
   }

  } else {
   if (flow.length){
    flox.pop();floy.pop();
    flox.unshift(mx-(tmpw/2));
    floy.unshift(my);
    clearInterval(flower);
    flower=setInterval(flowdn,60);
   }
  }

  //clear spr layer
  clrcan(spr);
  for (i=0;i<flow.length;i++){
   dcd(spr,flox[i],floy[i]+((bw/yy)*i)-(tmpw/2),flow[i],tmpw,co1,co2);
  }
  flod=i;
  }
  if (!bgsk) {
   clrcan(can);
   redraw(1);
   bgsk=1;
  }
}

function redraw(flip=0) {
 //flip 1 = don't flip
 //console.log('flip:'+flip);
 
  xxx=xx+1; //used to add space between cards
 var tmpw=bw/xxx;
 //top row
 for (ii=0;ii<7;ii++) {
  if (ii!=2) {
   var tc='';
   if (ii==0){
    tc=deck.length>0 ? 'b1' : '';
   }
   if (ii==1){
    tc=pile.length>0 ? pile[pile.length-1] : '';
   }
   if (ii==3){
    tmp=aces[0].length;
    //console.log(tmp);
    tc=tmp ? aces[0][tmp-1] : 'c';
   }
   if (ii==4){
    tmp=aces[1].length;
    //console.log(tmp);
    tc=tmp ? aces[1][tmp-1] : 't';
   }
   if (ii==5){
    tmp=aces[2].length;
    //console.log(tmp);
    tc=tmp ? aces[2][tmp-1] : 's';
   }
   if (ii==6){
    tmp=aces[3].length;
    //console.log(tmp);
    tc=tmp ? aces[3][tmp-1] : 'd';

   }
   dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),tc,tmpw,co1,co2);
  }
 }
 //console.log(deck);
 //card tree
 for (ii=0;ii<7;ii++) {
  var tmp=[];
  for (i=0;i<sprd[ii].length;i++) {
   var crd=sprd[ii][i];
   //tc changed based on X substr
   if (crd){
    if (flip==0 && crd.substr(0,1)=='x' && i==sprd[ii].length-1){
     //console.log('flipping ',tc,i,sprd[ii].length-1);
     sprd[ii][i]=crd.substr(1,2);
     crd=sprd[ii][i];
    }
    //console.log(crd);
    crd=crd.substr(0,1)=='x' ? 'b1' : crd;
    dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy)*(i+6),crd,tmpw,co1,co2);
   }
  }
 }
return;
 
}

function start(){
 game=document.body; //document.getElementById('game');
 bw=game.clientWidth<game.clientHeight ? game.clientWidth*.8 : game.clientHeight*.8;
 bh=bw;
 can=document.getElementById('can');
 can.width=bw; can.height=bh;
 spr=document.getElementById('spr');
 spr.width=bw; spr.height=bh;
 shf();
 //console.log(deck);
 //draw spread cards
  for (ii=0;ii<7;ii++) {
  var tmp=[];
  for (i=0;i<=ii;i++) {
   tc=dr(1)[0];
   tmp[i]= ii==i ? tc : 'x'+tc;
  }
  sprd[ii]=tmp;
 }

 redraw();
 //console.log(sprd.length,deck.length);
 
 /*for (ii=0;ii<7;ii++) {
  for (i=0;i<=6;i++) {
 dcd((ii*(tmpw+(tmpw/8)))+(tmpw/8),(tmpw*1.5)*i,'b1',tmpw);
  }
 }*/
 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 //spr.addEventListener("touchcancel", handleCancel, false);
 spr.addEventListener("touchmove", movr, {passive: true});
 
 if (1==2) {
  // grid lines
  var spx = spr.getContext("2d");
  for (y = 0; y < yy; y++) {
   for (x = 0; x < xx; x++) {
    spx.beginPath();
    spx.rect(x*(bw/xx), y*(bh/yy), bw/xx, bh/yy);
    spx.stroke();
   }
  }
 }
}
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

// VR
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

async function runXRRendering(session, mode) {
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

    let vrIntersection = null;
    let primaryButtonPressedLastFrame = false;

    session.addEventListener('selectstart', (event) => {
      if (vrShowAlert) {
        vrShowAlert = false;
        ignoreNextSelectEnd = true;
        return;
      }
      if (vrIntersection) {
        clkd({ stopPropagation: () => {}, preventDefault: () => {} });
      }
    });

    session.addEventListener('selectend', () => {
      if (ignoreNextSelectEnd) {
        ignoreNextSelectEnd = false;
        return;
      }
      if (vrIntersection) {
        clku({ stopPropagation: () => {}, preventDefault: () => {} });
      }
    });

    const sourceCanvas = document.getElementById("can");
    const spriteCanvas = document.getElementById("spr");
    const compositeCanvas = document.createElement("canvas");
    const compositeCtx = compositeCanvas.getContext("2d");

    const pointerCanvas = document.createElement("canvas");
    pointerCanvas.width = 64;
    pointerCanvas.height = 64;
    const pointerCtx = pointerCanvas.getContext("2d");
    pointerCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
    pointerCtx.beginPath();
    pointerCtx.arc(32, 32, 30, 0, 2 * Math.PI);
    pointerCtx.fill();
    const pointerTexture = initTexture(gl, pointerCanvas);

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
      },
    };

    const buffers = initBuffers(gl);
    let texture = initTexture(gl, sourceCanvas);

    const vrCanvasPosition = (mode === 'immersive-ar') ? [0, 1.0, -1.5] : [0, 1.0, -1.5];
    const canvasModelMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);

    function onXRFrame(time, frame) {
        session.requestAnimationFrame(onXRFrame);

        redraw(1);

        compositeCanvas.width = sourceCanvas.width;
        compositeCanvas.height = sourceCanvas.height;
        compositeCtx.drawImage(sourceCanvas, 0, 0);
        compositeCtx.drawImage(spriteCanvas, 0, 0);

        updateTexture(gl, texture, compositeCanvas);

        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
            const glLayer = session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
            if (mode === 'immersive-ar') {
                gl.clearColor(0, 0, 0, 0);
            } else {
                gl.clearColor(0.1, 0.2, 0.3, 1.0);
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            vrIntersection = null;

            for (const source of frame.session.inputSources) {
                if (source.gripSpace) {
                    const gripPose = frame.getPose(source.gripSpace, referenceSpace);
                    if (gripPose) {
                        const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
                        if (intersection) {
                            vrIntersection = intersection;
                            mx = ((intersection.local[0] + 1) / 2) * bw;
                            my = ((1 - intersection.local[1]) / 2) * bh;
                            movr({ offsetX: mx, offsetY: my });
                        }
                    }
                }
            }

            const aspectRatio = bw / bh;
            glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);
            glMatrix.mat4.scale(canvasModelMatrix, canvasModelMatrix, [aspectRatio, 1, 1]);

            for (const view of pose.views) {
                const viewport = glLayer.getViewport(view);
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

                const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, canvasModelMatrix);

                drawScene(gl, programInfo, buffers, texture, view.projectionMatrix, modelViewMatrix);

                if (vrIntersection) {
                    const { mat4, vec3, quat } = glMatrix;
                    const pointerModelMatrix = mat4.create();
                    const boardRotation = quat.create();
                    mat4.getRotation(boardRotation, canvasModelMatrix);
                    mat4.fromRotationTranslationScale(
                        pointerModelMatrix,
                        boardRotation,
                        vrIntersection.world,
                        [0.025, 0.025, 0.025]
                    );
                    const pointerModelViewMatrix = mat4.multiply(mat4.create(), view.transform.inverse.matrix, pointerModelMatrix);
                    drawScene(gl, programInfo, buffers, pointerTexture, view.projectionMatrix, pointerModelViewMatrix);
                }
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

function drawScene(gl, programInfo, buffers, texture, projectionMatrix, modelViewMatrix) {
  gl.useProgram(programInfo.program);

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

document.getElementById("btn-vr").onclick = toggleVR;
document.getElementById("btn-xr").onclick = toggleAR;

(async () => {
    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                document.getElementById('btn-xr').style.display = 'inline';
            }
        } catch (e) {
            console.error("Error checking for AR support:", e);
        }
    }
})();
