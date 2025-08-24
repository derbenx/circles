//console.log('circJS');
const col='grybvcplei';
const nxc=0; // nextcloud or normal webserver?
const scal=.95;
const hdr=document.getElementById('hdr');
const wrp=document.getElementById('wrp');
const can=document.getElementById('can');
const spr=document.getElementById('spr');
var dbtm,dbug,fo,rstim;
var fc= new Date(); //for cookie?
var done=0;
var mx,my;// current pointer location
var gx,gy;// grabbed square
var fx,fy;// mouse grabbed coords
var px,py,pz;// phone/touch grabbed
var drag='n'; //draggable
var xx,yy,grid,ww,hh,sz,xxx,yyy,outt; //from json
let lvl=['',' 32091550',' 42152550',' 54141551',' 64332551',' 74341551',' 84351601',' 94360701','154340801'];

document.getElementById("wxh").onchange = function(){ ttf(); }
document.getElementById("rat").onchange = function(){ ttf(); }
document.getElementById("sgcirc").onclick = function(){ sav('save original game to play from start?') }
document.getElementById("spcirc").onclick = function(){ sav('save your progress to play later?',1) }
document.getElementById("ldcirc").onclick = function(){ openFileDialog('.dbs',loadr) }
document.getElementById("circstart").onclick = function(){ wipe(); }
document.getElementById("circstart2").onclick = function(){ wipe(); }
window.addEventListener('resize', function(event) { rstim=setTimeout(scale,150); }, true);

document.getElementById("circtogsetup").onclick = function(){
 var cirtog=document.getElementById("circsetup");
 if (cirtog.style.display !== "none") { cirtog.style.display = "none"; }
 else {  cirtog.style.display = "block"; }
}
document.getElementById("circtoghelp").onclick = function(){
 var cirtog=document.getElementById("circhelp");
 if (cirtog.style.display !== "none") { cirtog.style.display = "none"; }
 else {  cirtog.style.display = "block"; }
}
for (var tmp=1;tmp<9;tmp++){
 document.getElementById("v"+tmp).onclick = function(e){ butt(e.target.id.replace("v", "")); }
}
newg();

function ttf(){ // time to finish
 sz=document.getElementById("wxh").value;
 pc=document.getElementById("pct").value;
 sc=document.getElementById("rat").selectedIndex;
 tmp=((pc/10)+sz**4)*(sc+1);
 var hs = Math.floor(tmp / 60 / 60);
 var ms = Math.floor(tmp / 60) - (hs * 60);
 var ss = tmp % 60;
 let est='';
 if (tmp<=100){ est="mere seconds"; }
 if (tmp>100 && tmp<=300){ est="few minutes"; }
 if (tmp>300 && tmp<=2600){ est="half hour"; }
 if (tmp>2600 && tmp<=4000){ est="a few hours"; }
 if (tmp>4000 && tmp<=8000){ est="several hours"; }
 if (tmp>8000 && tmp<=10000){ est="many hours"; }
 if (tmp>10000 && tmp<=80000){ est="too many hours"; }
 if (tmp>80000){ est="maybe days?"; }
 document.getElementById("ttf").innerHTML=est;
}

function wipe(){
 sCook("prog","");
 newg();
}

function newg(){
  //reset
 document.getElementById("circhelp").style.display='none';
 document.getElementById("circsetup").style.display='none';
 var elem = document.getElementById("spr").style.display='block';
 done=0;

 tmp=gCook("prog");
 if (tmp) {
  tmp=tmp.split('!');
  var szxy=tmp[tmp.length-1].split('=')[0].split('x');
  xx=(szxy[0]*1)+1;
  yy=(szxy[1]*1)+1;
  z=1;

  grid = new Array(xx).fill(null).map(()=>new Array(yy).fill(null));
  for (var x=0;x<xx;x++){
   for (var y=0;y<yy;y++){
    var temp=tmp[z].split('=');
    var xy=temp[0].split('x');
    grid[xy[0]][xy[1]]=temp[1];
    z++;
   }
  }
  scale();main();
 } else {
  var rat = document.getElementById("rat").value * 1;
  var ts = document.getElementById("wxh").value * 1;
  var tx = window.innerWidth;
  var ty = window.innerHeight;
  var tw, th;
  if (rat) {
      if (tx > ty) {
          th = ts;
          tw = tx / (ty / ts);
      } else {
          tw = ts;
          th = ty / (tx / ts);
      }
  } else {
      tw = ts;
      th = ts;
  }

  var options = {
      wdh: Math.floor(tw),
      hgt: Math.floor(th),
      mov: document.getElementById('mov').value,
      rot: document.getElementById('rot').value,
      clr: document.getElementById('clr').value,
      pnt: document.getElementById('pnt').value,
      pct: document.getElementById('pct').value,
      rat: document.getElementById('rat').value
  };

  var puzzleData = generatePuzzle(options);
  dbstart(puzzleData);
 }
}

function dbstart(data){
 xx=data.xx*1;
 yy=data.yy*1;
 outt=xx;

 grid = new Array(xx).fill(null).map(()=>new Array(yy).fill(null));
 for (var y=0;y<yy;y++){
  for (var x=0;x<xx;x++){
   grid[x][y]=data.grid["grid["+x+"]["+y+"]"];
   if (grid[x][y] && grid[x][y]!='000000' && grid[x][y].substr(2, 4)=='0000'){
    grid[x][y]='000000';
   }
   outt=outt+"!"+x+"x"+y+"="+grid[x][y];
  }
 }
 sCook('orig',outt);
 scale();main();
}

function butt(x){
 s=document.getElementById('wxh');
 m=document.getElementById('mov');
 r=document.getElementById('rot');
 c=document.getElementById('clr');
 p=document.getElementById('pct');
 f=document.getElementById('pnt');
 t=document.getElementById('rat');
 s.value=lvl[x].substr(0,2);
 m.value=lvl[x].substr(2,1);
 r.value=lvl[x].substr(3,1);
 c.value=lvl[x].substr(4,1);
 f.value=lvl[x].substr(5,1);
 p.value=lvl[x].substr(6,2);
 t.selectedIndex=lvl[x].substr(8,1);
 ttf();
}

function debug(t){
 clearTimeout(dbtm);
 if (!dbug){
  dbug=document.createElement('div'); dbug.id="dbug";document.body.appendChild(dbug);
 }
 for (var x in arguments){
  if (x!=0){dbug.innerHTML=arguments[x]+'<br>';}
 }
 dbtm=setTimeout(function(){dbug.remove();dbug='';}, t);
}

function clku(evn){
 if (done) { return; }
  tx=Math.floor((mx/ww)*xx); ty=Math.floor((my/hh)*yy);
 if (fx+'x'+fy+'x'+gx+'x'+gy==mx+'x'+my+'x'+tx+'x'+ty){
  if (grid[gx][gy].charAt(1)>0 && !evn.changedTouches){
   rotate(gx,gy,grid[gx][gy].charAt(1));
  }
 }
 if (drag!='n') {
  if(tx+''+ty!=gx+''+gy){
   if (grid[gx][gy].charAt(0)=='2'){
    if (grid[tx][ty].charAt(0)=='0'){
     grid[tx][ty]=grid[gx][gy];
     grid[gx][gy]='000000';
    }
   }
   if (grid[gx][gy].charAt(0)=='3'){
    if (grid[gx][ty].charAt(0)=='0'){
     grid[gx][ty]=grid[gx][gy];
     grid[gx][gy]='000000';
    }
   }
   if (grid[gx][gy].charAt(0)=='4'){
    if (grid[tx][gy].charAt(0)=='0'){
     grid[tx][gy]=grid[gx][gy];
     grid[gx][gy]='000000';
    }
   }
  }
 drag='n';
 }
 sCook("prog",prog());
 sCook("c",col);
 draw(1);
 stx = spr.getContext('2d');
 stx.clearRect(0, 0, can.width, can.height);
 gx=tx; gy=ty;
 if (solve()!=1) {
  done=1;
  setTimeout(fini, 300);
 }
}
function clkd(evn){
 if (done) { return; }
 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 fx=mx;fy=my;
 gx=Math.floor((mx/ww)*xx); gy=Math.floor((my/hh)*yy);
 if (grid[gx][gy].charAt(0)>1) {
  drag='y';
 }
}
function movr(evn){
 if (done) { return; }
 mx=evn.offsetX; my=evn.offsetY;
 if (evn&& !mx){
  var rect = can.getBoundingClientRect();
  me=evn.changedTouches[0];
  if (me) {
   mx=Math.floor(me.clientX-rect.left);
   my=Math.floor(me.clientY-rect.top);
  }
 }
 if (drag=='n'){
  gx=Math.floor((mx/ww)*xx); gy=Math.floor((my/hh)*yy);
 } else { draw(); }
}
function main(){
 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 spr.addEventListener("touchmove", movr, {passive: true});
 draw();
}
function scale(){
 var iw=window.innerWidth;
 var ih=window.innerHeight-(document.getElementById('hdr').getBoundingClientRect().height*3);
 var sc1=iw/ih;
 var sc2=xx/yy;
 if (sc2!=1 && ( (sc1>1 && sc2<1) || (sc1<1 && sc2>=1) ) ) {
  var tgrd = new Array(yy).fill(null).map(()=>new Array(xx).fill(null));
  for (var y=0;y<yy;y++){
   for (var x=0;x<xx;x++){
    var t1=grid[x][y].slice(0,1);
    var t2=grid[x][y].slice(1,2);
    if (t1==3) {t1=4;}
    else if (t1==4) {t1=3;}
    if (t2==2) {t2=3;}
    else if (t2==3) {t2=2;}
    tgrd[y][x]=t1+t2+grid[x][y].slice(3,6)+grid[x][y].slice(2,3);
   }
   tgrd[y].reverse();
  }
  xx=grid[0].length
  yy=grid.length
  grid=tgrd;
  sc2=xx/yy;
 }
 var tv=sc1>sc2 ? yy : xx;
 var tz=window.innerWidth/tv*scal;
 ww=tz*xx;
 hh=tz*yy;
 if (sc1>sc2){
  ww=ih/yy*xx*scal;
  hh=ih/yy*yy*scal;
 }else{
  ww=iw/xx*xx*scal;
  hh=iw/xx*yy*scal;
 }
 xxx=ww/xx;yyy=hh/yy;
 sz=xxx<yyy ? xxx*0.48 : yyy*0.48;
 var sc=document.getElementById("rat").selectedIndex;
 spr.width=ww; spr.height=hh;
 can.width=ww; can.height=hh;
 wrp.style.height=(hh+5)+'px';
 draw(1);
}
function draw(pri=0){
 var fc= new Date();
 var fps = 1000 / (fc - fo);
 fo = fc;
 if (fps<30 && pri<1) { return; }
 ctx = can.getContext('2d');
 if (inAR) {
    ctx.clearRect(0, 0, can.width, can.height);
 } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, can.width, can.height);
 }
 if (px){
  gx=px;gy=py;
 }
 for (y = 0; y < yy; y++) {
  for (x = 0; x < xx; x++) {
   if (drag=='y' && y==gy && x==gx){
    var stx = spr.getContext('2d');
    stx.clearRect(0, 0, can.width, can.height);
    if (grid[gx][gy].charAt(0)=='2'){
     drci(sz,mx,my,grid[x][y],1);
    }
    if (grid[gx][gy].charAt(0)=='3'){
     drci(sz,(x*xxx)+(xxx/2),my,grid[x][y],1);
    }
    if (grid[gx][gy].charAt(0)=='4'){
     drci(sz,mx,(y*yyy)+(yyy/2),grid[x][y],1);
    }
   }else{
    drci(sz,(x*xxx)+(xxx/2),(y*yyy)+(yyy/2),grid[x][y]);
   }
   ctx.lineWidth = 3;
   ctx.strokeStyle = gc("g");
   ctx.strokeRect(x*xxx, y*yyy, xxx, yyy);
  }
 }
}
function rd(x,y=0){
 return Math.floor(Math.random()*x)+y;
}
function rotate(x,y,t=1){
 pos=grid[x][y];
 if (t==1){
  grid[x][y]=pos.charAt(0)+pos.charAt(1)+pos.charAt(5)+pos.charAt(2)+pos.charAt(3)+pos.charAt(4);
 }
 if (t==2){
  grid[x][y]=pos.charAt(0)+pos.charAt(1)+pos.charAt(2)+pos.charAt(5)+pos.charAt(4)+pos.charAt(3);
 }
 if (t==3){
  grid[x][y]=pos.charAt(0)+pos.charAt(1)+pos.charAt(4)+pos.charAt(3)+pos.charAt(2)+pos.charAt(5);
 }
}
function gc(cc){
 var o='ivory';
 if (cc=='g'){ o='#008800' }
 if (cc=='r'){ o='#dd0000' }
 if (cc=='y'){ o='#cccc00' }
 if (cc=='b'){ o='#0000cc' }
 if (cc=='v'){ o='#8800dd' }
 if (cc=='c'){ o='#00cccc' }
 if (cc=='p'){ o='#dd7700' }
 if (cc=='l'){ o='#00cc00' }
 if (cc=='e'){ o='#666666' }
 return o;
}
function drci(rad,x,y,p,s=0) {
 if (rad<4) { return; }
 ol='gray';
 pp=p.toString().padStart(4,'0');
 if (s==1){
 tmp = spr.getContext('2d');
 }else{
 tmp = can.getContext('2d');
 }
 if (pp.charAt(0)>0) {
  tmp.beginPath();

  tmp.arc(x, y, rad-3, 0, 2 * Math.PI, false);
  tmp.fillStyle = gc(col.charAt(0));
  tmp.fill();
  tmp.beginPath();
  tmp.arc(x, y, rad-3, 0, 2 * Math.PI);
  tmp.strokeStyle = s==1 ? 'red' : ol;
  tmp.lineWidth = 3;
  tmp.stroke();

 rx=rad/3;
 $i=0;

  if (pp.charAt($i)=='2' || pp.charAt($i)=='3') {
   tmp.beginPath();
   tmp.strokeStyle = 'black';
   tmp.moveTo(x, y-(rad/3));
   tmp.lineTo(x,y+(rad/3));
   tmp.stroke();
  }
  if (pp.charAt($i)=='2' || pp.charAt($i)=='4') {
   tmp.beginPath();
   tmp.strokeStyle = 'black';
   tmp.moveTo(x-(rad/3), y);
   tmp.lineTo(x+(rad/3), y);
   tmp.stroke();
  }

 $i++;
 if (pp.charAt($i)!='0') {
  if (pp.charAt($i)=='1') {
   tmp.beginPath();
   tmp.arc(x, y, rad/2, 0, 2 * Math.PI);
   tmp.strokeStyle = 'black';
   tmp.lineWidth = 3;
   tmp.stroke();
  }
  if (pp.charAt($i)=='2') {
   tmp.beginPath();
   tmp.arc(x, y, rad/2, 0, 1 * Math.PI);
   tmp.strokeStyle = 'black';
   tmp.lineWidth = 3;
   tmp.stroke();
  }
  if (pp.charAt($i)=='3') {
   tmp.beginPath();
   tmp.arc(x, y, rad/2, 1.5, 1.5 * Math.PI);
   tmp.strokeStyle = 'black';
   tmp.lineWidth = 3;
   tmp.stroke();
  }

 }
  $i++;
 if (pp.charAt($i)!='0') {

  tmp.beginPath();
  tmp.arc(x-rad, y, rx, 1.5 * Math.PI, .5 * Math.PI, false);
  tmp.fillStyle = gc(pp.charAt($i));
  tmp.fill();
  tmp.beginPath();
  tmp.arc(x-rad, y, rx, 1.5 * Math.PI, .5 * Math.PI, false);
  tmp.strokeStyle = ol;
  tmp.stroke();
 }
 $i++;
 if (pp.charAt($i)!='0') {

  tmp.beginPath();
  tmp.arc(x, y-rad, rx, 0, 1 * Math.PI, false);
  tmp.fillStyle = gc(pp.charAt($i));
  tmp.fill();
  tmp.beginPath();
  tmp.arc(x, y-rad, rx, 0, 1 * Math.PI, false);
  tmp.strokeStyle = ol;
  tmp.stroke();
 }
 $i++;
 if (pp.charAt($i)!='0') {

  tmp.beginPath();
  tmp.arc(x+rad, y, rx, .5 * Math.PI, 1.5 * Math.PI, false);
  tmp.fillStyle = gc(pp.charAt($i));
  tmp.fill();
  tmp.beginPath();
  tmp.arc(x+rad, y, rx, .5 * Math.PI, 1.5 * Math.PI, false);
  tmp.strokeStyle = ol;
  tmp.stroke();
}
$i++;
 if (pp.charAt($i)!='0') {

  tmp.beginPath();
  tmp.arc(x, y+rad, rx, 1 * Math.PI, 2 * Math.PI, false);
  tmp.fillStyle = gc(pp.charAt($i));
  tmp.fill();
  tmp.beginPath();
  tmp.arc(x, y+rad, rx, 1 * Math.PI, 2 * Math.PI, false);
  tmp.strokeStyle = ol;
  tmp.stroke();
  }
 }
}
function solve(){
 var bit,chk,ii,tt;
 for (y = 0; y < yy; y++) {
  for (x = 0; x < xx; x++) {
   tt=0; tmp=grid[x][y].substr(2);
   if (grid[x][y].charAt(0)>0){
    ii=0; bit=tmp.charAt(ii);
    if (bit!='0' && x>0) {
      chk=grid[x-1][y].substr(4,1);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y>0) {
      chk=grid[x][y-1].substr(5,1);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && x<(xx-1)) {
      chk=grid[x+1][y].substr(2,1);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y<(yy-1)) {
      chk=grid[x][y+1].substr(3,1);
      if (bit!=chk) { return 1; }
      tt++;
    }
    if (tt<1) { return 1; }
   }
  }
 }
 return 0;
}
function fini(){
 sCook("prog","");
 var elem = document.getElementById("spr");
 elem.style.display='none';
 var msg='Congrats you won!\n\nTry a new puzzle, change some settings!\n\nYou can now save this image to share with others!\n\n';
 if (inVR || inAR) {
    vrShowAlert = true;
    vrAlertMessage = msg;
    vrAlertNeedsUpdate = true;
 } else {
    alert(msg);
 }
 return;
}

function prog(){
 var sg=xx;
 for (y = 0; y < yy; y++) {
  for (x = 0; x < xx; x++) {
   sg=sg+"!"+x+"x"+y+"="+grid[x][y];
  }
 }
 return sg;
}

function sav(msg='Click Ok to save this game.',sav=0){
 var aa = document.createElement('a');
 if (sav==1) {
  temp= prog();
 } else {
  temp=outt ? outt: gCook('orig');
 }
 console.log('temp: ',temp);
 aa.href = 'data:attachment/text,' + encodeURI(temp);
 aa.target = '_blank';
 aa.download = 'circles.dbs';
 aa.id = 'dl';
 var yn=confirm(msg);
 if (yn==true) {
  aa.click();
 }
 return;
}

function sCook(cname, cvalue, exdays=999) {
 if (cvalue.length>4096){ console.log('Cannot save huge levels in cookies!'); return; }
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function gCook(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}


function loadr(event){
 file=this.files[0];
 const reader = new FileReader();
 reader.addEventListener('load', (event) => {
  const result = event.target.result;
  sCook('prog',result);
  sCook('orig',result);
  newg()
 });
 reader.readAsText(file);
}
function openFileDialog(accept, callback) {
 var inputElement = document.createElement("input");
 inputElement.type = "file";
 inputElement.accept = accept;
 inputElement.addEventListener("change", callback);
 inputElement.dispatchEvent(new MouseEvent("click"));
}

document.getElementById("btn-vr").onclick = () => {
    activateVR(drawCircles);
};
document.getElementById("btn-xr").onclick = () => {
    activateAR(drawCircles);
};

function drawCircles(gl, pose, frame) {
    const glLayer = session.renderState.baseLayer;
    const compositeCanvas = document.createElement("canvas");
    const compositeCtx = compositeCanvas.getContext("2d");
    const sourceCanvas = document.getElementById("can");
    const spriteCanvas = document.getElementById("spr");
    let texture = initTexture(gl, sourceCanvas);
    const buffers = initBuffers(gl);
    const pointerTexture = initTexture(gl, pointerCanvas);

    for (const view of pose.views) {
        const viewport = glLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, canvasModelMatrix);

        draw(1);

        compositeCanvas.width = sourceCanvas.width;
        compositeCanvas.height = sourceCanvas.height;
        compositeCtx.drawImage(sourceCanvas, 0, 0);
        compositeCtx.drawImage(spriteCanvas, 0, 0);

        updateTexture(gl, texture, compositeCanvas);

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
