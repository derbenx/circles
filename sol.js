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
 clearInterval(flower);
 clrcan(spr);
 if (done) { return; }


 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 tx=Math.floor((mx/bw)*xx); ty=Math.floor((my/bh)*yy);

 if (flow.length<1 && tx==0 && ty>=1 && ty<=4){
  tmpw=bw/xxx;
  ccc=dr(drw);

  if (ccc.length>0) {
   pile.push(...ccc);
   for (ii=0;ii<drw-1;ii++){
    dcd(can,(1*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),ccc[ii],tmpw,co1,co2);
    await sleep(300);
   }
  }else{
   deck=pile;
   deck.reverse();
   pile=[];
   tc='';
  }
   tc=pile[pile.length-1];
 } else if (drag){
  ffx=Math.floor((fx/bw)*xx); ffy=Math.floor((fy/bh)*yy);

  if (ty<5 && tx>2){
   dbtc=aces[tx-3][aces[tx-3].length-1];
  }else{
   dbtc=sprd[tx][sprd[tx].length-1];
  }
  cvz=[ crdval(flow[0],0), crdval(dbtc,0) ];
  cvz.push( crdcol(flow[0],dbtc) );

  if (ffy>5){
   var tmp=undefined;
   for (i=0;i<(cs);i++){
    tmp= tmp===undefined ? sprd[ffx][ffy-6-i] :  tmp;
    if (tmp!=undefined) break;
   }
  }else{
   if (fre){
   }
  }

  if (flow.length==1 && ty<6 && tx>2 && tx<7){
   fail=0;
   if (flow[0][0]!=sc[tx-3]){
    fail= !fre ? 0 : 1;
   }
   if (cvz[0]!=cvz[1]+1){
     fail= !fre || (cvz[0]==0 && cvz[1]==-1) ? fail : 1;
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
   if (flow[0]!=undefined){
    fail=0;
    if (cvz[2] && cvz[2][3]==true) {
     fail= !fre ? 0 : 1;
    }
    if (cvz[0]!=cvz[1]-1 && cvz[1]!=-1) {
     fail= !fre ? 0 : 1;
    }

    if (fail){
     if (ffy>5){
      sprd[ffx].push(...flow);
     }else if (ffx>2 && ffx<7){
      (aces[ffx-3]).push(flow[0]);
     } else {
      pile.push(flow[0]);
     }
    }else{
     sprd[tx].push(...flow);
    }
   }
   var flp= tx==ffx ? 1:0;
  }else{
   if (flow[0]){
    if (ffy>5){
     sprd[ffx].push(...flow);
    }else if (ffx>2 && ffx<7){
     (aces[ffx-3]).push(flow[0]);
    }else{
     pile.push(flow[0]);
    }
   }
  }
 }
 drag=0;fx=-1;fy=-1;
 redraw(flp);
 flow=[];
 tc="";

 if (aces[0].length>12 && aces[1].length>12 && aces[2].length>12 && aces[3].length>12){
   done=1;
   dnm(spr,(bw/4),(bh/3),25,"Congrats, Game Over!",1);
  }
}

function clkd(evn){
 if (flow.length) { return; }
 flox=[];floy=[];
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
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }

 if (fx==-1){ return; }
 drag=1;
 tmpw=bw/xxx;
 tx=Math.floor((fx/bw)*xx); ty=Math.floor((fy/bh)*yy);

 if (tx>-1){
  if (!tc){
   var tc=undefined;
   if (gy<5 && gx==1){
    tc=pile[pile.length-1];
   } else {
    for (i=0;i<(cs);i++){
     tc= tc===undefined ? sprd[tx][ty-6-i] :  tc;
     if (tc!=undefined) break;
    }
   }
  }

  if (!flow[0]) {
   if (gy<5 && gx>2 && gx<7 && aces[gx-3]!=undefined){
    flow[0]=aces[gx-3].pop();
   }
   if (gy<5 && gx==1){
    if (pile.length>0){
     flow[0]=pile.pop();
    }else{
     fx=-1;
    }
  } else {
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

  clrcan(spr);
  for (i=0;i<flow.length;i++){
   dcd(spr,flox[i],floy[i]+((bw/yy)*i)-(tmpw/2),flow[i],tmpw,co1,co2);
  }
  flod=i;
  }
  if (!bgsk) {
   redraw(1);
   bgsk=1;
  }
}

function redraw(flip=0) {
    if (inVR || inAR) {
        for (let i = 0; i < sprd.length; i++) {
            if (sprd[i].length > 0) {
                const card = sprd[i][sprd[i].length - 1];
                if (flip == 0 && card.startsWith('x')) {
                    sprd[i][sprd[i].length - 1] = card.substr(1, 2);
                }
            }
        }
        return;
    }

    clrcan(can);
    xxx=xx+1;
    var tmpw=bw/xxx;
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
                tc=tmp ? aces[0][tmp-1] : 'c';
            }
            if (ii==4){
                tmp=aces[1].length;
                tc=tmp ? aces[1][tmp-1] : 't';
            }
            if (ii==5){
                tmp=aces[2].length;
                tc=tmp ? aces[2][tmp-1] : 's';
            }
            if (ii==6){
                tmp=aces[3].length;
                tc=tmp ? aces[3][tmp-1] : 'd';
            }
            dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),tc,tmpw,co1,co2);
        }
    }
    for (ii=0;ii<7;ii++) {
        var tmp=[];
        for (i=0;i<sprd[ii].length;i++) {
            var crd=sprd[ii][i];
            if (crd){
                if (flip==0 && crd.substr(0,1)=='x' && i==sprd[ii].length-1){
                    sprd[ii][i]=crd.substr(1,2);
                    crd=sprd[ii][i];
                }
                crd=crd.substr(0,1)=='x' ? 'b1' : crd;
                dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy)*(i+6),crd,tmpw,co1,co2);
            }
        }
    }
}

function start(){
 game=document.body;
 bw=game.clientWidth<game.clientHeight ? game.clientWidth*.8 : game.clientHeight*.8;
 bh=bw;
 can=document.getElementById('can');
 can.width=bw; can.height=bh;
 spr=document.getElementById('spr');
 spr.width=bw; spr.height=bh;
 shf();
  for (ii=0;ii<7;ii++) {
  var tmp=[];
  for (i=0;i<=ii;i++) {
   tc=dr(1)[0];
   tmp[i]= ii==i ? tc : 'x'+tc;
  }
  sprd[ii]=tmp;
 }

 redraw(1);
 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 spr.addEventListener("touchmove", movr, {passive: true});

 if (1==2) {
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

document.getElementById("btn-vr").onclick = () => {
    activateVR(drawSolitaire);
};
document.getElementById("btn-xr").onclick = () => {
    activateAR(drawSolitaire);
};

function drawSolitaire(gl, pose, frame) {
    const cardWidth3D = 0.2;
    const cardHeight3D = cardWidth3D * 1.5;
    const cardDepth3D = 0.01;
    const cardModel = createCuboid(cardWidth3D, cardHeight3D, cardDepth3D);
    const cardBuffers = initBuffers(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, cardModel.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuffers.textureCoord);
    gl.bufferData(gl.ARRAY_BUFFER, cardModel.textureCoordinates, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cardModel.indices, gl.STATIC_DRAW);

    for (const view of pose.views) {
        const viewport = glLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // Draw tableau
        for (let i = 0; i < sprd.length; i++) {
            for (let j = 0; j < sprd[i].length; j++) {
                const card = sprd[i][j];
                const cardTexture = card.startsWith('x') ? cardTextures['b1'] : cardTextures[card];

                const modelMatrix = glMatrix.mat4.create();
                glMatrix.mat4.translate(modelMatrix, modelMatrix, [-0.7 + i * 0.22, 0.5 - j * 0.05, -1.5]);

                const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
                drawScene(gl, programInfo, cardBuffers, cardTexture, view.projectionMatrix, modelViewMatrix);
            }
        }

        // Draw deck
        if (deck.length > 0) {
            const modelMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(modelMatrix, modelMatrix, [-0.7, 0.5, -1.5]);
            const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
            drawScene(gl, programInfo, cardBuffers, cardTextures['b1'], view.projectionMatrix, modelViewMatrix);
        }

        // Draw pile
        if (pile.length > 0) {
            const card = pile[pile.length - 1];
            const modelMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(modelMatrix, modelMatrix, [-0.48, 0.5, -1.5]);
            const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
            drawScene(gl, programInfo, cardBuffers, cardTextures[card], view.projectionMatrix, modelViewMatrix);
        }

        // Draw aces
        for (let i = 0; i < aces.length; i++) {
            if (aces[i].length > 0) {
                const card = aces[i][aces[i].length - 1];
                const modelMatrix = glMatrix.mat4.create();
                glMatrix.mat4.translate(modelMatrix, modelMatrix, [0.2 + i * 0.22, 0.5, -1.5]);
                const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
                drawScene(gl, programInfo, cardBuffers, cardTextures[card], view.projectionMatrix, modelViewMatrix);
            }
        }
    }

    for (const source of frame.session.inputSources) {
        if (source.gripSpace) {
            const gripPose = frame.getPose(source.gripSpace, referenceSpace);
            if (gripPose) {
                const controllerMatrix = glMatrix.mat4.clone(gripPose.transform.matrix);
                glMatrix.mat4.scale(controllerMatrix, controllerMatrix, [0.03, 0.03, 0.03]);

                const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), pose.views[0].transform.inverse.matrix, controllerMatrix);

                const sphere = createSphere(1.0, 16, 16);
                const sphereBuffers = initBuffers(gl);
                gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.position);
                gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.indices);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

                // This is a simplified draw call, we'll need a proper shader for this
                // For now, just using the existing shader
                drawScene(gl, programInfo, sphereBuffers, initTexture(gl, document.createElement('canvas')), pose.views[0].projectionMatrix, modelViewMatrix);
            }
        }
    }
}
