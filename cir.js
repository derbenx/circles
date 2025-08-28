//console.log('circJS');
let ver = 25;
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
var axPressInfo = { left: null, right: null }; // For VR hybrid click
var mx,my;// current pointer location
var gx,gy;// grabbed square
var fx,fy;// mouse grabbed coords
var px,py,pz;// phone/touch grabbed
var drag='n'; //draggable
var xx,yy,grid,ww,hh,sz,xxx,yyy,outt; //from json
let lvl=['',' 32091550',' 42152550',' 54141551',' 64332551',' 74341551',' 84351601',' 94360701','154340801'];

loadCirclesSettings();

const inputs = ['wxh', 'mov', 'rot', 'clr', 'pct', 'pnt'];
inputs.forEach(id => {
    const slider = document.getElementById(id);
    const display = document.getElementById(`${id}-val`);
    slider.oninput = () => {
        display.textContent = slider.value;
        ttf();
        saveCirclesSettings();
    };
});

document.getElementById("rat").onchange = function(){
    const label = document.getElementById('rat-label');
    label.textContent = this.checked ? "Ratio: Screen" : "Ratio: Square";
    ttf();
    saveCirclesSettings();
}

document.getElementById("sgcirc").onclick = function(){ sav('save original game to play from start?') }
document.getElementById("spcirc").onclick = function(){ sav('save your progress to play later?',1) }
document.getElementById("ldcirc").onclick = function(){ openFileDialog('.dbs',loadr) }
document.getElementById("circstart").onclick = function(){ wipe(); }
document.getElementById("circstart2").onclick = function(){ wipe(); }
window.addEventListener('resize', function(event) { rstim=setTimeout(scale,150); }, true);

document.getElementById("circtogsetup").onclick = function(){
    const cirtog = document.getElementById("circsetup");
    const wrpDiv = document.getElementById("wrp");
    if (cirtog.style.display !== "none") {
        cirtog.style.display = "none";
        wrpDiv.style.display = "block";
    } else {
        cirtog.style.display = "block";
        wrpDiv.style.display = "none";
    }
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
 sc=document.getElementById("rat").checked ? 1 : 0;
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
 localStorage.removeItem('circlesGameState');
 sCook("prog",""); // Clear old cookie just in case
 newg();
}

function newg(){
 document.getElementById('version-display').value = ver;
 document.getElementById("circhelp").style.display='none';
 document.getElementById("circsetup").style.display='none';
 document.getElementById("wrp").style.display = "block";
 var elem = document.getElementById("spr").style.display='block';
 done=0;

 // Load settings first
 loadCirclesSettings();

 // Try to load game state, otherwise create new game
 const savedGame = localStorage.getItem('circlesGameState');
 if (savedGame) {
    const gameState = JSON.parse(savedGame);
    xx = gameState.xx;
    yy = gameState.yy;
    grid = gameState.grid;
    outt = gameState.outt; // Keep original puzzle data
    scale();
    main();
 } else {
  var rat = document.getElementById("rat").checked ? 1 : 0;
  var ts = document.getElementById("wxh").value * 1;
  var tx = window.innerWidth;
  var ty = window.innerHeight;
  var tw, th;
  if (rat) {
      if (tx > ty) { th = ts; tw = tx / (ty / ts); }
      else { tw = ts; th = ty / (tx / ts); }
  } else { tw = ts; th = ts; }
  var options = {
      wdh: Math.floor(tw), hgt: Math.floor(th),
      mov: document.getElementById('mov').value, rot: document.getElementById('rot').value,
      clr: document.getElementById('clr').value, pnt: document.getElementById('pnt').value,
      pct: document.getElementById('pct').value, rat: document.getElementById('rat').value
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

function saveCirclesSettings() {
    const settings = {
        wxh: document.getElementById('wxh').value,
        mov: document.getElementById('mov').value,
        rot: document.getElementById('rot').value,
        clr: document.getElementById('clr').value,
        pct: document.getElementById('pct').value,
        pnt: document.getElementById('pnt').value,
        rat: document.getElementById('rat').checked,
    };
    localStorage.setItem('circlesSettings', JSON.stringify(settings));
}

function loadCirclesSettings() {
    const settings = JSON.parse(localStorage.getItem('circlesSettings'));
    if (settings) {
        document.getElementById('wxh').value = settings.wxh;
        document.getElementById('mov').value = settings.mov;
        document.getElementById('rot').value = settings.rot;
        document.getElementById('clr').value = settings.clr;
        document.getElementById('pct').value = settings.pct;
        document.getElementById('pnt').value = settings.pnt;
        document.getElementById('rat').checked = settings.rat;
        updateAllSliderDisplays();
        ttf();
    }
}

function saveGameState() {
    const gameState = {
        grid: grid,
        xx: xx,
        yy: yy,
        outt: outt // Persist original puzzle data
    };
    localStorage.setItem('circlesGameState', JSON.stringify(gameState));
}

function updateAllSliderDisplays() {
    inputs.forEach(id => {
        const slider = document.getElementById(id);
        const display = document.getElementById(`${id}-val`);
        if (display) {
            display.textContent = slider.value;
        }
    });
    const ratCheckbox = document.getElementById('rat');
    const ratLabel = document.getElementById('rat-label');
    ratLabel.textContent = ratCheckbox.checked ? "Ratio: Screen" : "Ratio: Square";
}

function butt(x){
    const s = document.getElementById('wxh');
    const m = document.getElementById('mov');
    const r = document.getElementById('rot');
    const c = document.getElementById('clr');
    const p = document.getElementById('pct');
    const f = document.getElementById('pnt');
    const t = document.getElementById('rat');

    s.value = lvl[x].substr(0,2).trim();
    m.value = lvl[x].substr(2,1).trim();
    r.value = lvl[x].substr(3,1).trim();
    c.value = lvl[x].substr(4,1).trim();
    f.value = lvl[x].substr(5,1).trim();
    p.value = lvl[x].substr(6,2).trim();
    t.checked = (lvl[x].substr(8,1).trim() == '1');

    updateAllSliderDisplays();
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

function clku(evn, vrIntersectionLocal){
 if (done) { return; }
  let tx, ty;
  if (vrIntersectionLocal) {
    const coords = getCircleAtIntersection(vrIntersectionLocal);
    if (coords) {
        tx = coords.gx;
        ty = coords.gy;
    } else {
        tx = -1; ty = -1;
    }
  } else {
    tx = Math.floor((mx/ww)*xx);
    ty = Math.floor((my/hh)*yy);
  }

 // In VR, fx and fy are -1, so this click-vs-drag check will be false, which is ok.
 if (fx+'x'+fy+'x'+gx+'x'+gy==mx+'x'+my+'x'+tx+'x'+ty){
  if (grid[gx] && grid[gx][gy] && grid[gx][gy].charAt(1) > 0 && !evn.changedTouches){
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
 saveGameState();
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
function clkd(evn, vrIntersectionLocal){
 if (done) { return; }
 if (vrIntersectionLocal) {
    const coords = getCircleAtIntersection(vrIntersectionLocal);
    if (coords) {
        gx = coords.gx;
        gy = coords.gy;
    } else {
        gx = -1; gy = -1;
    }
    fx = -1; fy = -1; // No 2D mouse coords in VR
 } else {
    if (evn.changedTouches){
        var rect = can.getBoundingClientRect();
        mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
        my=Math.floor(evn.changedTouches[0].clientY-rect.top);
    }
    fx=mx;fy=my;
    gx=Math.floor((mx/ww)*xx); gy=Math.floor((my/hh)*yy);
 }

 if (grid[gx] && grid[gx][gy] && grid[gx][gy].charAt(0)>1) {
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
 mx = Math.max(0, Math.min(mx, ww));
 my = Math.max(0, Math.min(my, hh));
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
 var sc=document.getElementById("rat").checked ? 1 : 0;
 spr.width=ww; spr.height=hh;
 can.width=ww; can.height=hh;
 wrp.style.height=(hh+5)+'px';
 draw(1);
}
function draw(pri=0){
 if (inVR || inAR) return; // Don't draw 2D canvas if in VR/AR
 var fc= new Date();
 var fps = 1000 / (fc - fo);
 fo = fc;
 if (fps<30 && pri<1) { return; }
 ctx = can.getContext('2d');
 ctx.fillStyle = "black";
 ctx.fillRect(0, 0, can.width, can.height);
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
   tmp.beginPath(); tmp.strokeStyle = 'black'; tmp.moveTo(x, y-(rad/3)); tmp.lineTo(x,y+(rad/3)); tmp.stroke();
  }
  if (pp.charAt($i)=='2' || pp.charAt($i)=='4') {
   tmp.beginPath(); tmp.strokeStyle = 'black'; tmp.moveTo(x-(rad/3), y); tmp.lineTo(x+(rad/3), y); tmp.stroke();
  }
 $i++;
 if (pp.charAt($i)!='0') {
  if (pp.charAt($i)=='1') {
   tmp.beginPath(); tmp.arc(x, y, rad/2, 0, 2 * Math.PI); tmp.strokeStyle = 'black'; tmp.lineWidth = 3; tmp.stroke();
  }
  if (pp.charAt($i)=='2') {
   tmp.beginPath(); tmp.arc(x, y, rad/2, 0, 1 * Math.PI); tmp.strokeStyle = 'black'; tmp.lineWidth = 3; tmp.stroke();
  }
  if (pp.charAt($i)=='3') {
   tmp.beginPath(); tmp.arc(x, y, rad/2, 1.5, 1.5 * Math.PI); tmp.strokeStyle = 'black'; tmp.lineWidth = 3; tmp.stroke();
  }
 }
  $i++;
 if (pp.charAt($i)!='0') {
  tmp.beginPath(); tmp.arc(x-rad, y, rx, 1.5 * Math.PI, .5 * Math.PI, false); tmp.fillStyle = gc(pp.charAt($i)); tmp.fill();
  tmp.beginPath(); tmp.arc(x-rad, y, rx, 1.5 * Math.PI, .5 * Math.PI, false); tmp.strokeStyle = ol; tmp.stroke();
 }
 $i++;
 if (pp.charAt($i)!='0') {
  tmp.beginPath(); tmp.arc(x, y-rad, rx, 0, 1 * Math.PI, false); tmp.fillStyle = gc(pp.charAt($i)); tmp.fill();
  tmp.beginPath(); tmp.arc(x, y-rad, rx, 0, 1 * Math.PI, false); tmp.strokeStyle = ol; tmp.stroke();
 }
 $i++;
 if (pp.charAt($i)!='0') {
  tmp.beginPath(); tmp.arc(x+rad, y, rx, .5 * Math.PI, 1.5 * Math.PI, false); tmp.fillStyle = gc(pp.charAt($i)); tmp.fill();
  tmp.beginPath(); tmp.arc(x+rad, y, rx, .5 * Math.PI, 1.5 * Math.PI, false); tmp.strokeStyle = ol; tmp.stroke();
}
$i++;
 if (pp.charAt($i)!='0') {
  tmp.beginPath(); tmp.arc(x, y+rad, rx, 1 * Math.PI, 2 * Math.PI, false); tmp.fillStyle = gc(pp.charAt($i)); tmp.fill();
  tmp.beginPath(); tmp.arc(x, y+rad, rx, 1 * Math.PI, 2 * Math.PI, false); tmp.strokeStyle = ol; tmp.stroke();
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
      chk=grid[x-1][y].substr(4,1); if (bit!=chk) { return 1; } tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y>0) {
      chk=grid[x][y-1].substr(5,1); if (bit!=chk) { return 1; } tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && x<(xx-1)) {
      chk=grid[x+1][y].substr(2,1); if (bit!=chk) { return 1; } tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y<(yy-1)) {
      chk=grid[x][y+1].substr(3,1); if (bit!=chk) { return 1; } tt++;
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
    showVROverlay(msg, wipe);
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
    while (c.charAt(0) == ' ') { c = c.substring(1); }
    if (c.indexOf(name) == 0) { return c.substring(name.length, c.length); }
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

const colorMap = {
    'g': [0.0, 1.0, 0.0, 1.0], 'r': [1.0, 0.0, 0.0, 1.0],
    'y': [1.0, 1.0, 0.0, 1.0], 'b': [0.0, 0.0, 1.0, 1.0],
    'v': [0.5, 0.0, 0.5, 1.0], 'c': [0.0, 1.0, 1.0, 1.0],
    'p': [1.0, 0.5, 0.0, 1.0], 'l': [0.5, 1.0, 0.5, 1.0],
    'e': [0.5, 0.5, 0.5, 1.0],
};

function draw3dPiece(gl, programs, buffers, pieceData, pieceModelMatrix, view) {
    const { solidColorProgramInfo } = programs;
    const { cylinder, halfCylinder, stick, ring, arcBottom, arcLeft } = buffers.pieceBuffers;

    gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexNormal);

    // Draw main cylinder body
    drawSolid(gl, solidColorProgramInfo, cylinder, pieceModelMatrix, view, [0.0, 0.8, 0.0, 1.0]);

    // Draw nubs
    const nubColors = pieceData.substr(2, 4);
    for (let i = 0; i < 4; i++) {
        const colorChar = nubColors.charAt(i);
        if (colorChar !== '0') {
            const nubLocalMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(nubLocalMatrix, nubLocalMatrix, [0, 0.05, 0]);
            const translations = [ [-0.51, 0, 0], [0, 0, -0.51], [0.51, 0, 0], [0, 0, 0.51] ];
            const orientations = [ Math.PI, Math.PI / 2, 0, -Math.PI / 2 ];
            glMatrix.mat4.translate(nubLocalMatrix, nubLocalMatrix, translations[i]);
            glMatrix.mat4.rotate(nubLocalMatrix, nubLocalMatrix, orientations[i] + Math.PI, [0, 1, 0]);
            const finalNubMatrix = glMatrix.mat4.create();
            glMatrix.mat4.multiply(finalNubMatrix, pieceModelMatrix, nubLocalMatrix);
            const nubScale = 1 / 1.2;
            glMatrix.mat4.scale(finalNubMatrix, finalNubMatrix, [nubScale, nubScale, nubScale]);
            const color = colorMap[colorChar] || [1,1,1,1];
            drawSolid(gl, solidColorProgramInfo, halfCylinder, finalNubMatrix, view, color);
        }
    }

    // Draw markers
    const markerColor = [0.0, 0.0, 0.0, 1.0];
    const moveMarker = pieceData.charAt(0);
    const rotateMarker = pieceData.charAt(1);
    const markerHeight = 0.15;
    if (moveMarker === '2' || moveMarker === '4') {
        const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
        glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
        glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.25, 0.02, 0.02]);
        drawSolid(gl, solidColorProgramInfo, stick, markerMatrix, view, markerColor);
    }
    if (moveMarker === '2' || moveMarker === '3') {
        const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
        glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
        glMatrix.mat4.rotate(markerMatrix, markerMatrix, Math.PI / 2, [0, 1, 0]);
        glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.25, 0.02, 0.02]);
        drawSolid(gl, solidColorProgramInfo, stick, markerMatrix, view, markerColor);
    }
    if (rotateMarker === '1') {
        const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
        glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
        glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
        drawSolid(gl, solidColorProgramInfo, ring, markerMatrix, view, markerColor);
    }
    if (rotateMarker === '2') {
        const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
        glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
        glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
        drawSolid(gl, solidColorProgramInfo, arcBottom, markerMatrix, view, markerColor);
    }
    if (rotateMarker === '3') {
        const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
        glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
        glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
        drawSolid(gl, solidColorProgramInfo, arcLeft, markerMatrix, view, markerColor);
    }
}

function getCircleAtIntersection(local) {
    if (!local) return null;

    // Convert the [-1, 1] local coordinates to grid coordinates
    const gx = Math.floor(((local[0] + 1.0) / 2.0) * xx);
    const gy = Math.floor(((1.0 - local[1]) / 2.0) * yy);

    // Basic bounds check
    if (gx >= 0 && gx < xx && gy >= 0 && gy < yy) {
        return { gx, gy };
    }

    return null;
}

function drawCircles(gl, programs, buffers, view) {
    // --- Handle delayed drag initiation for hybrid click ---
    for (const hand in axPressInfo) {
        if (axPressInfo[hand] && drag !== 'y') {
            if (performance.now() - axPressInfo[hand].time > 200) {
                // Long press detected, start the drag
                if (axPressInfo[hand].intersection) {
                    clkd({ preventDefault: () => {}, stopPropagation: () => {} }, axPressInfo[hand].intersection.local);
                }
            }
        }
    }

    const { solidColorProgramInfo } = programs;
    const { stick } = buffers.pieceBuffers; // grid lines use the stick buffer

    // Draw 3D grid
    const pieceHeight = 0.36 / yy;
    const gridHeight = pieceHeight / 3;
    const lineWidth = 0.0075;
    const gridColor = [0.0, 1.0, 0.0, 1.0];

    for (let y = 0; y <= yy; y++) {
        const y_pos = (y / yy) * 2.0 - 1.0;
        const gridLineModelMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(gridLineModelMatrix, [0, -y_pos, gridHeight / 2 + 0.001]);
        glMatrix.mat4.scale(gridLineModelMatrix, gridLineModelMatrix, [2.0, lineWidth, gridHeight]);
        const finalMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(finalMatrix, getCanvasModelMatrix(), gridLineModelMatrix);
        drawSolid(gl, solidColorProgramInfo, stick, finalMatrix, view, gridColor);
    }

    for (let x = 0; x <= xx; x++) {
        const x_pos = (x / xx) * 2.0 - 1.0;
        const gridLineModelMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(gridLineModelMatrix, [x_pos, 0, gridHeight / 2 + 0.001]);
        glMatrix.mat4.scale(gridLineModelMatrix, gridLineModelMatrix, [lineWidth / (xx/yy), 2.0, gridHeight]);
        const finalMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(finalMatrix, getCanvasModelMatrix(), gridLineModelMatrix);
        drawSolid(gl, solidColorProgramInfo, stick, finalMatrix, view, gridColor);
    }

    // Draw pieces
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
             if (drag === 'y' && x === gx && y === gy) continue;
            if (grid[x][y].charAt(0) > 0) {
                const localPieceMatrix = glMatrix.mat4.create();
                const x_local = (x + 0.5) / xx * 2.0 - 1.0;
                const y_local = (y + 0.5) / yy * 2.0 - 1.0;
                glMatrix.mat4.translate(localPieceMatrix, localPieceMatrix, [x_local, -y_local, 0.02]);
                glMatrix.mat4.rotate(localPieceMatrix, localPieceMatrix, Math.PI / 2, [1, 0, 0]);
                const tileDim = 2.0 / yy;
                const diameter = tileDim * 0.95;
                glMatrix.mat4.scale(localPieceMatrix, localPieceMatrix, [diameter / (xx/yy), diameter, diameter]);
                const pieceModelMatrix = glMatrix.mat4.create();
                glMatrix.mat4.multiply(pieceModelMatrix, getCanvasModelMatrix(), localPieceMatrix);
                draw3dPiece(gl, programs, buffers, grid[x][y], pieceModelMatrix, view);
            }
        }
    }

    // Draw dragged piece
    if (drag === 'y' && vrIntersection) {
        const pieceData = grid[gx][gy];
        if (pieceData && pieceData.charAt(0) > 1) {
            const pieceModelMatrix = glMatrix.mat4.clone(getCanvasModelMatrix());
            const moveMarker = pieceData.charAt(0);

            let x = vrIntersection.local[0];
            let y = vrIntersection.local[1];

            // Clamp to board edges
            x = Math.max(-1, Math.min(x, 1));
            y = Math.max(-1, Math.min(y, 1));

            // Constrain visual drag position
            if (moveMarker === '3' || moveMarker === '4') { // Restricted movement
                const startXLocal = (gx + 0.5) / xx * 2.0 - 1.0;
                const startYLocal = -((gy + 0.5) / yy * 2.0 - 1.0); // Negated to match rendering convention
                if (moveMarker === '3') { // Vertical only
                    x = startXLocal;
                } else { // Horizontal only
                    y = startYLocal;
                }
            }

            const z = 0.1; // Pull forward
            glMatrix.mat4.translate(pieceModelMatrix, pieceModelMatrix, [x, y, z]);

            // Rotate to be flat on the board
            glMatrix.mat4.rotate(pieceModelMatrix, pieceModelMatrix, Math.PI / 2, [1, 0, 0]);

            // Apply same scaling as on-board pieces
            const tileDim = 2.0 / yy;
            const diameter = tileDim * 0.95;
            const aspectRatio = xx / yy;
            glMatrix.mat4.scale(pieceModelMatrix, pieceModelMatrix, [diameter / aspectRatio, diameter, diameter]);

            draw3dPiece(gl, programs, buffers, pieceData, pieceModelMatrix, view);
        }
    }
}

function vrButtonHandler(buttonIndex, isPressed, intersection, handedness) {
    if (buttonIndex === 4) { // A/X buttons
        if (isPressed) {
            axPressInfo[handedness] = { time: performance.now(), intersection: intersection };
        } else { // Button released
            if (axPressInfo[handedness]) {
                if (drag !== 'y') { // Drag was not initiated, so it's a short click
                    if (axPressInfo[handedness].intersection) {
                         const coords = getCircleAtIntersection(axPressInfo[handedness].intersection.local);
                         if (coords && grid[coords.gx][coords.gy].charAt(1) > 0) {
                            rotate(coords.gx, coords.gy, grid[coords.gx][coords.gy].charAt(1));
                         }
                    }
                }
                // Always call clku on release to end the action/drag
                clku({ preventDefault: () => {}, stopPropagation: () => {} }, intersection ? intersection.local : null);
                axPressInfo[handedness] = null;
            }
        }
    }
}

document.getElementById("btn-vr").onclick = () => toggleVR(drawCircles, xx, yy, null, draw, vrButtonHandler);
document.getElementById("btn-xr").onclick = () => toggleAR(drawCircles, xx, yy, null, draw, vrButtonHandler);

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
