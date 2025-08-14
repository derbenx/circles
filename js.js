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
//const colr='grybvcplei';
let lvl=['',' 32091550',' 42152550',' 54141551',' 64332551',' 74341551',' 84351601',' 94360701','154340801'];
var inAR = false;
var inVR = false;
var vrShowAlert = false;
var vrAlertMessage = "";
var vrAlertNeedsUpdate = false;
let ignoreNextSelectEnd = false;
let vrSession = null;

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
 //console.log(sz,sc,tmp,'-time:',hs,ms,ss);
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

 //check cookie
 tmp=gCook("prog"); //progress
 if (tmp) {
  //console.log('game found');
  //console.log('orig: ',gCook('orig'));

  //col=gCook('c');
  //col='grybvcplei';
  //console.log('col',col);
/*
  ww=350;
  hh=350;
  xxx=ww/xx;yyy=hh/yy;
  sz=xxx<yyy ? xxx*0.48 : yyy*0.48;
*/
  //convert cookie to game
  //console.log(tmp);
  //console.log('prog::',tmp);
  tmp=tmp.split('!');
  //console.log('split::',tmp);
  //console.log('leng::',tmp.length);
  var szxy=tmp[tmp.length-1].split('=')[0].split('x');
  xx=(szxy[0]*1)+1;
  yy=(szxy[1]*1)+1;
  //console.log('size::',xx,' x ',yy);
  z=1;

  grid = new Array(xx).fill(null).map(()=>new Array(yy).fill(null));
  //console.log('x',grid);
  for (var x=0;x<xx;x++){
   //console.log('x');
   for (var y=0;y<yy;y++){
    //console.log(z, tmp[z]);
    var temp=tmp[z].split('=');
    var xy=temp[0].split('x');
    grid[xy[0]][xy[1]]=temp[1];
    //console.log(z,xy[0],'x',xy[1],grid[xy[0]][xy[1]]);
    z++;
   }
  }
  scale();main();
 } else {
 //console.log('new');
 //get puzzle
 var xhttp = new XMLHttpRequest();
 xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) { dbstart(this.responseText); }
 };
 var data=''; var tmp,th,tw;
 var rat=document.getElementById("rat").value*1;
 var ts=document.getElementById("wxh").value*1;
 var tx=window.innerWidth;
 var ty=window.innerHeight;
 if (rat){
  if (tx>ty){
   //console.log('w');
   th=ts;
   tw=tx/(ty/ts);
  }else {
   //console.log('h');
   tw=ts;
   th=ty/(tx/ts);
  }
 }else{
  tw=ts; th=ts;
 }
 data+='wdh='+Math.floor(tw)+'&hgt='+Math.floor(th)+'&';
 tmp='mov'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 tmp='rot'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 tmp='clr'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 tmp='pnt'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 tmp='pct'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 tmp='rat'; data+=tmp+'='+document.getElementById(tmp).value+'&';
 //data+='ww='+window.innerWidth+'&';
 //data+='hh='+window.innerHeight;

 //console.log(window.location.href+'gen');

 if (nxc==1){
  xhttp.open("POST", window.location.href+"gen", true);  //nextcloud
 }else{
  xhttp.open("POST", "gen.php", true); //regular
 }
 xhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
 xhttp.send(data);
 }
}
//console.log(window.location.pathname);
//console.log(window.location);

function dbstart(json){
 //parse data into variables
 //console.log('#'+json+'#');
 var data = JSON.parse(json);
 if (nxc==1){
  data = JSON.parse(data); //parse twice, yeah..
 }
 //console.log(data);
 xx=data.xx*1;
 yy=data.yy*1;
 //ww=data.ww*1;
 //hh=data.hh*1;
 //col=data.col;
 //xxx=ww/xx;yyy=hh/yy;
 //sz=xxx<yyy ? xxx*0.48 : yyy*0.48;
 outt=xx;

 grid = new Array(xx).fill(null).map(()=>new Array(yy).fill(null));
 for (var y=0;y<yy;y++){
  for (var x=0;x<xx;x++){
   //console.log(x,y,data["grid["+x+"]["+y+"]"]);
   grid[x][y]=data["grid["+x+"]["+y+"]"];
   if (grid[x][y]!='000000' && grid[x][y].substr(2, 4)=='0000'){
    //check for & remove islands
    grid[x][y]='000000';
   }
   outt=outt+"!"+x+"x"+y+"="+grid[x][y];
  }
 }

 //console.log(grid);
 //console.log('ot: '+outt);
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
 //if (document.getElementById('file')){
  //document.getElementById('file').remove();
 //}
 ttf();
}

function debug(t){
// use debug(time-in-ms,arg,arg,etc) to display popup messages
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
 //console.log('UU',fx,fy,mx,my,drag,gx,gy,tx,ty);
 if (fx+'x'+fy+'x'+gx+'x'+gy==mx+'x'+my+'x'+tx+'x'+ty){
  //click only
  //console.log('rotate function');
  if (grid[gx][gy].charAt(1)>0 && !evn.changedTouches){
   //rotate
   rotate(gx,gy,grid[gx][gy].charAt(1));
  }
 }
 //console.log(evn.changedTouches);
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
   //solve();
  }
 drag='n';
 }
 sCook("prog",prog());
 //sCook("g",grid.toString());
 //sCook("y",grid[0].length);
 //sCook("x",grid.length);
 sCook("c",col);
 //console.log(document.cookie);
 draw(1);
 stx = spr.getContext('2d');
 stx.clearRect(0, 0, can.width, can.height);
 gx=tx; gy=ty;
 //db.value='u:'+gx+'x'+gy;
 if (solve()!=1) {
  done=1;
  setTimeout(fini, 300);
  //fini();
 }
}
function clkd(evn){
 if (done) { return; }
 //evn.preventDefault();
 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 fx=mx;fy=my;
 gx=Math.floor((mx/ww)*xx); gy=Math.floor((my/hh)*yy);
 //console.log('DD',mx,my,"g",gx,gy);
 //db.value='d:'+gx+'x'+gy;
 //console.log(grid[gx][gy]);
 if (grid[gx][gy].charAt(0)>1) {
  drag='y';
 }
}
function movr(evn){
 if (done) { return; }
 //evn.preventDefault();
 mx=evn.offsetX; my=evn.offsetY;
 if (evn&& !mx){
  //console.log("f",fx,fy,"g",gx,gy);
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 //console.log('m:',mx,my,drag,"f",fx,fy,"g",gx,gy);
 if (drag=='n'){
  gx=Math.floor((mx/ww)*xx); gy=Math.floor((my/hh)*yy);
 } else { draw(); }
 //document.getElementById('debug').value=mx+'x'+my+' : '+gx+'x'+gy;

 //db.value=drag+':'+gx+'x'+gy;
}
function main(){
 //db=document.getElementById('debug');
 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 //spr.addEventListener("touchcancel", handleCancel, false);
 spr.addEventListener("touchmove", movr, {passive: true});
 draw();
}
function scale(){
 var iw=window.innerWidth;
 var ih=window.innerHeight-(document.getElementById('hdr').getBoundingClientRect().height*3);
 //ratio >1=hori <1=vert
 var sc1=iw/ih;
 var sc2=xx/yy;
 //console.log(sc1,sc2);
 if (sc2!=1 && ( (sc1>1 && sc2<1) || (sc1<1 && sc2>=1) ) ) {
  //console.log('flip');
  var tgrd = new Array(yy).fill(null).map(()=>new Array(xx).fill(null));
  for (var y=0;y<yy;y++){
   for (var x=0;x<xx;x++){
    //console.log(y,x,grid[x][y].slice(0,1));
    //if first digit 3/4 chg to 4/3
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
  //console.log('scr land');
  ww=ih/yy*xx*scal;
  hh=ih/yy*yy*scal;
 }else{
  //console.log('scr port');
  ww=iw/xx*xx*scal;
  hh=iw/xx*yy*scal;
 }

 //console.log(sc1,sc2)
 //console.log(xx,yy,ww,hh,sc1,sc2);

 xxx=ww/xx;yyy=hh/yy;
 sz=xxx<yyy ? xxx*0.48 : yyy*0.48;
 var sc=document.getElementById("rat").selectedIndex;
 spr.width=ww; spr.height=hh;
 can.width=ww; can.height=hh;
 wrp.style.height=(hh+5)+'px';
 draw(1);
}
function draw(pri=0){ //priority, drag low, drop high.

 var fc= new Date();
 var fps = 1000 / (fc - fo);
 fo = fc;
 if (fps<30 && pri<1) { return; } //skip low FPS
 //debug(2000,fps.toFixed(1));
 //console.log(drag,gx,gy);
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
   ctx.strokeStyle = "green";
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
 //console.log(grid[x][y]);
}
function gc(cc){
 //console.log(cc);
//$col='grybvcplei';
 var o='ivory';
 if (cc=='g'){ o='green' }
 if (cc=='r'){ o='red' }
 if (cc=='y'){ o='yellow' }
 if (cc=='b'){ o='blue' }
 if (cc=='v'){ o='blueviolet' }
 if (cc=='c'){ o='cyan' }
 if (cc=='p'){ o='darkorange' }
 if (cc=='l'){ o='limegreen' }
 if (cc=='e'){ o='grey' }
 return o;
}
function drci(rad,x,y,p,s=0) {
 if (rad<4) { return; }
 ol='gray';
 pp=p.toString().padStart(4,'0');
 //console.log(pp);
 if (s==1){
 tmp = spr.getContext('2d');
 }else{
 tmp = can.getContext('2d');
 }
 if (pp.charAt(0)>0) {
 //console.log('big');
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

  //drag: 0=blank 1=fixed 2=move:+ 3=LR:- 4=UD:|
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
  //click: 0=nothing 1=rotate:O 2=flipH:U 3=flipV:C
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
 //2+: tag colors 0=null ryvb
 if (pp.charAt($i)!='0') {
  //console.log('left');

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
  //console.log('up');

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
  //console.log('righ');

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
  //console.log('down');

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
   //console.log(x,y,tmp);
   if (grid[x][y].charAt(0)>0){
    ii=0; bit=tmp.charAt(ii);
    if (bit!='0' && x>0) {
     //left console.log(tmp.charAt(0));
      chk=grid[x-1][y].substr(4,1);
      //console.log('l',x,y,bit,chk);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y>0) {
     //up console.log(tmp.charAt(1));
      chk=grid[x][y-1].substr(5,1);
      //console.log('u',x,y,bit,chk);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && x<(xx-1)) {
     //right console.log(tmp.charAt(2));
      chk=grid[x+1][y].substr(2,1);
      //console.log('r',x,y,bit,chk);
      if (bit!=chk) { return 1; }
      tt++;
    }
    ii++; bit=tmp.charAt(ii);
    if (bit!='0' && y<(yy-1)) {
     //down console.log(tmp.charAt(3));
      chk=grid[x][y+1].substr(3,1);
      //console.log('r',x,y,bit,chk);
      if (bit!=chk) { return 1; }
      tt++;
    }
    if (tt<1) { return 1; }
   }
   //console.log('tt',tt);
  }
 }
 return 0;
}
function fini(){
 sCook("prog","");
 var elem = document.getElementById("spr");
 //elem.remove();
 elem.style.display='none';
 var msg='Congrats you won!\n\nTry a new puzzle, change some settings!\n\nYou can now save this image to share with others!\n\n';
 //sav(msg);
 if (inVR || inAR) {
    vrShowAlert = true;
    vrAlertMessage = msg;
    vrAlertNeedsUpdate = true;
 } else {
    alert(msg);
 }
 return;
}

//save game
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
  //console.log('progress');
  temp= prog();
 } else {
  //console.log('original');
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

//cookies
function sCook(cname, cvalue, exdays=999) {
 if (cvalue.length>4096){ console.log('Cannot save huge levels in cookies!'); return; }
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  //console.log(cvalue.length);
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

//load file ??

function loadr(event){
 //readFile();
 file=this.files[0];
 const reader = new FileReader();
 reader.addEventListener('load', (event) => {
  const result = event.target.result;
  //console.log(result);
  // put data into cookie
  sCook('prog',result);
  sCook('orig',result);
  // start game
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

let arSession = null;

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

    let vrIntersectionPoint = null;
    let yButtonPressedLastFrame = false;
    let aButtonPressedLastFrame = false;

    session.addEventListener('selectstart', () => {
      if (vrShowAlert) {
        vrShowAlert = false;
        ignoreNextSelectEnd = true;
        wipe();
        return;
      }
      if (vrIntersectionPoint) {
        clkd({ preventDefault: () => {} });
      }
    });

    session.addEventListener('selectend', () => {
      if (ignoreNextSelectEnd) {
        ignoreNextSelectEnd = false;
        return;
      }
      if (vrIntersectionPoint) {
        clku({ preventDefault: () => {} });
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
      uniform bool uUseSolidColor;
      uniform vec4 uSolidColor;
      void main(void) {
        if (uUseSolidColor) {
          gl_FragColor = uSolidColor;
        } else {
          gl_FragColor = texture2D(uSampler, vTextureCoord);
        }
      }`;
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const textureProgramInfo = {
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

    const solidColorVsSource = `
      attribute vec4 aVertexPosition;
      attribute vec3 aVertexNormal;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;

      varying highp vec3 vLighting;

      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

        // Apply lighting effect
        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
      }
    `;
    const solidColorFsSource = `
      precision mediump float;
      uniform vec4 uColor;
      varying highp vec3 vLighting;

      void main(void) {
        gl_FragColor = vec4(uColor.rgb * vLighting, uColor.a);
      }
    `;
    const solidColorShaderProgram = initShaderProgram(gl, solidColorVsSource, solidColorFsSource);

    const solidColorProgramInfo = {
        program: solidColorShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(solidColorShaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(solidColorShaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(solidColorShaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(solidColorShaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(solidColorShaderProgram, 'uNormalMatrix'),
            color: gl.getUniformLocation(solidColorShaderProgram, 'uColor'),
        },
    };

    const cylinder = createCylinder(0.5, .2, 16);
    const cylinderPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinder.vertices), gl.STATIC_DRAW);

    const cylinderNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinder.normals), gl.STATIC_DRAW);

    const cylinderIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cylinder.indices), gl.STATIC_DRAW);

    const cylinderBuffers = {
        position: cylinderPositionBuffer,
        normal: cylinderNormalBuffer,
        indices: cylinderIndexBuffer,
        vertexCount: cylinder.indices.length,
    };

    const halfCylinder = createHalfCylinder(.2,.5, 8);
    const halfCylinderPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(halfCylinder.vertices), gl.STATIC_DRAW);
    const halfCylinderNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(halfCylinder.normals), gl.STATIC_DRAW);
    const halfCylinderBuffers = {
        position: halfCylinderPositionBuffer,
        normal: halfCylinderNormalBuffer,
        vertexCount: halfCylinder.vertices.length / 3,
    };

    // Marker models
    const stick = createCuboid(1.0, 1.0, 1.0); // Will be scaled
    const stickBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: stick.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, stick.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, stickBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, stick.normals, gl.STATIC_DRAW);

    const ring = createRing(0.5, 0.465, 1.0, 16); // Will be scaled
    const ringBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: ring.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, ring.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, ring.normals, gl.STATIC_DRAW);

    const arcBottom = createArc(0.5, 0.465, 1.0, 8, 0, Math.PI);
    const arcBottomBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: arcBottom.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBottomBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, arcBottom.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBottomBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, arcBottom.normals, gl.STATIC_DRAW);

    const arcLeft = createArc(0.5, 0.465, 1.0, 8, Math.PI / 2, Math.PI * 1.5);
    const arcLeftBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: arcLeft.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, arcLeftBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, arcLeft.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, arcLeftBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, arcLeft.normals, gl.STATIC_DRAW);

    const cone = createCone(1.0, 1.0, 12); // Unit cone
    const coneBuffers = {
        position: gl.createBuffer(),
        normal: gl.createBuffer(),
        vertexCount: cone.vertexCount,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, cone.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, cone.normals, gl.STATIC_DRAW);

    function drawMarker(gl, programInfo, buffers, modelMatrix, view) {
        const finalModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, modelMatrix);
        const normalMatrix = glMatrix.mat4.create();
        glMatrix.mat4.invert(normalMatrix, modelMatrix);
        glMatrix.mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, finalModelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
    }

    const colorMap = {
        'g': [0.0, 1.0, 0.0, 1.0], // green
        'r': [1.0, 0.0, 0.0, 1.0], // red
        'y': [1.0, 1.0, 0.0, 1.0], // yellow
        'b': [0.0, 0.0, 1.0, 1.0], // blue
        'v': [0.5, 0.0, 0.5, 1.0], // violet
        'c': [0.0, 1.0, 1.0, 1.0], // cyan
        'p': [1.0, 0.5, 0.0, 1.0], // orange
        'l': [0.5, 1.0, 0.5, 1.0], // limegreen
        'e': [0.5, 0.5, 0.5, 1.0], // grey
    };

    const buffers = initBuffers(gl);
    let texture = initTexture(gl, sourceCanvas);

    const vrCanvasPosition = [0, 1.0, -2.0];
    const canvasModelMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);

    function onXRFrame(time, frame) {
        session.requestAnimationFrame(onXRFrame);

        draw(1);

        compositeCanvas.width = sourceCanvas.width;
        compositeCanvas.height = sourceCanvas.height;
        compositeCtx.drawImage(sourceCanvas, 0, 0);
        compositeCtx.drawImage(spriteCanvas, 0, 0);

        if (vrShowAlert) {
            compositeCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
            compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
            compositeCtx.fillStyle = "white";
            compositeCtx.font = "40px sans-serif";
            compositeCtx.textAlign = "center";
            compositeCtx.fillText("You Won!", compositeCanvas.width / 2, compositeCanvas.height / 2);
        }

        updateTexture(gl, texture, compositeCanvas);

        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
            const glLayer = session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
            if (mode === 'immersive-ar') {
                gl.clearColor(0, 0, 0, 0);
            } else {
                gl.clearColor(0, 0, 0, 1);
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            vrIntersectionPoint = null;
            let leftController = null;
            let rightController = null;

            for (const source of frame.session.inputSources) {
                if (source.handedness === 'left') {
                    leftController = source;
                } else if (source.handedness === 'right') {
                    rightController = source;
                }
            }

            if (leftController && leftController.gamepad) {
                const thumbstickX = leftController.gamepad.axes[2];
                const thumbstickY = leftController.gamepad.axes[3];
                const moveSpeed = 0.02;
                if (Math.abs(thumbstickX) > 0.1) { vrCanvasPosition[0] += thumbstickX * moveSpeed; }
                if (Math.abs(thumbstickY) > 0.1) { vrCanvasPosition[1] -= thumbstickY * moveSpeed; }
                const yButton = leftController.gamepad.buttons[5];
                if (yButton && yButton.pressed && !yButtonPressedLastFrame) {
                    document.getElementById("btn-vr").disabled = false;
                    session.end();
                }
                yButtonPressedLastFrame = yButton ? yButton.pressed : false;
            }

            if (rightController) {
                if (rightController.gripSpace) {
                    const gripPose = frame.getPose(rightController.gripSpace, referenceSpace);
                    if (gripPose) {
                        const intersection = intersectPlane(gripPose.transform, canvasModelMatrix);
                        if (intersection) {
                            vrIntersectionPoint = intersection.world;
                            mx = ((intersection.local[0] + 1) / 2) * ww;
                            my = ((1 - intersection.local[1]) / 2) * hh;
                        }
                    }
                }
                if (rightController.gamepad) {
                    const thumbstickY = rightController.gamepad.axes[3];
                    const zoomSpeed = 0.05;
                    if (Math.abs(thumbstickY) > 0.1) { vrCanvasPosition[2] += thumbstickY * zoomSpeed; }
                    const aButton = rightController.gamepad.buttons[4];
                    if (aButton && aButton.pressed && !aButtonPressedLastFrame) {
                        if (vrIntersectionPoint) {
                            let gx_for_rotate = Math.floor((mx/ww)*xx);
                            let gy_for_rotate = Math.floor((my/hh)*yy);
                            if (grid[gx_for_rotate][gy_for_rotate].charAt(1) > 0) {
                                rotate(gx_for_rotate, gy_for_rotate, grid[gx_for_rotate][gy_for_rotate].charAt(1));
                                sCook("prog", prog());
                            }
                        }
                    }
                    aButtonPressedLastFrame = aButton ? aButton.pressed : false;
                }
            }

            const aspectRatio = ww / hh;
            glMatrix.mat4.fromTranslation(canvasModelMatrix, vrCanvasPosition);
            glMatrix.mat4.scale(canvasModelMatrix, canvasModelMatrix, [aspectRatio, 1, 1]);

            for (const view of pose.views) {
                const viewport = glLayer.getViewport(view);
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                const modelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, canvasModelMatrix);
                drawScene(gl, textureProgramInfo, buffers, texture, view.projectionMatrix, modelViewMatrix);

                // Draw 3D cylinders for the green pieces
                gl.useProgram(solidColorProgramInfo.program);
                gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexPosition);
                gl.enableVertexAttribArray(solidColorProgramInfo.attribLocations.vertexNormal);

                // 3D Grid is a work in progress, disabled for now.

                for (let y = 0; y < yy; y++) {
                    for (let x = 0; x < xx; x++) {
                        if (grid[x][y].charAt(0) > 0) { // This condition checks if it's a piece
                            const pieceModelMatrix = glMatrix.mat4.create();
                            glMatrix.mat4.fromTranslation(pieceModelMatrix, vrCanvasPosition);
                            glMatrix.mat4.scale(pieceModelMatrix, pieceModelMatrix, [xx/yy, 1, 1]);
                            const x_local = (x + 0.5) / xx * 2.0 - 1.0;
                            const y_local = (y + 0.5) / yy * 2.0 - 1.0;
                            glMatrix.mat4.translate(pieceModelMatrix, pieceModelMatrix, [x_local, -y_local, 0.02]);
                            glMatrix.mat4.rotate(pieceModelMatrix, pieceModelMatrix, Math.PI / 2, [1, 0, 0]);
                            const tileDim = 2.0 / yy;
                            const diameter = tileDim * 0.90;
                            glMatrix.mat4.scale(pieceModelMatrix, pieceModelMatrix, [diameter / (xx/yy), diameter, diameter]);
                            const finalModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, pieceModelMatrix);

                            const normalMatrix = glMatrix.mat4.create();
                            glMatrix.mat4.invert(normalMatrix, pieceModelMatrix);
                            glMatrix.mat4.transpose(normalMatrix, normalMatrix);

                            gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.projectionMatrix, false, view.projectionMatrix);
                            gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.modelViewMatrix, false, finalModelViewMatrix);
                            gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.normalMatrix, false, normalMatrix);

                            // Draw main cylinder
                            gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffers.position);
                            gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                            gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffers.normal);
                            gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderBuffers.indices);
                            gl.uniform4fv(solidColorProgramInfo.uniformLocations.color, [0.0, 0.8, 0.0, 1.0]); // Main cylinder is green
                            gl.drawElements(gl.TRIANGLES, cylinderBuffers.vertexCount, gl.UNSIGNED_SHORT, 0);

                            // Draw nubs
                            gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderBuffers.position);
                            gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                            gl.bindBuffer(gl.ARRAY_BUFFER, halfCylinderBuffers.normal);
                            gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);

                            const pieceData = grid[x][y];
                            const nubColors = pieceData.substr(2, 4);
                            for (let i = 0; i < 4; i++) {
                                const colorChar = nubColors.charAt(i);
                                if (colorChar !== '0') {
                                    const nubLocalMatrix = glMatrix.mat4.create();
                                    const translations = [ [-0.5, 0, 0], [0, 0, -0.5], [0.5, 0, 0], [0, 0, 0.5] ];
                                    const orientations = [ Math.PI, Math.PI / 2, 0, -Math.PI / 2 ];
                                    glMatrix.mat4.translate(nubLocalMatrix, nubLocalMatrix, translations[i]);
                                    glMatrix.mat4.rotate(nubLocalMatrix, nubLocalMatrix, orientations[i] + Math.PI, [0, 1, 0]);
                                    const finalNubMatrix = glMatrix.mat4.create();
                                    glMatrix.mat4.multiply(finalNubMatrix, pieceModelMatrix, nubLocalMatrix);
                                    const nubScale = 1 / 1.2;
                                    glMatrix.mat4.scale(finalNubMatrix, finalNubMatrix, [nubScale, nubScale, nubScale]);
                                    const finalNubModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, finalNubMatrix);

                                    const nubNormalMatrix = glMatrix.mat4.create();
                                    glMatrix.mat4.invert(nubNormalMatrix, finalNubMatrix);
                                    glMatrix.mat4.transpose(nubNormalMatrix, nubNormalMatrix);

                                    gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.modelViewMatrix, false, finalNubModelViewMatrix);
                                    gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.normalMatrix, false, nubNormalMatrix);
                                    const color = colorMap[colorChar] || [1,1,1,1];
                                    gl.uniform4fv(solidColorProgramInfo.uniformLocations.color, color);
                                    gl.drawArrays(gl.TRIANGLES, 0, halfCylinderBuffers.vertexCount);
                                }
                            }

                            // Draw Markers
                            const markerColor = [0.0, 0.0, 0.0, 1.0]; // Black
                            gl.uniform4fv(solidColorProgramInfo.uniformLocations.color, markerColor);

                            const moveMarker = pieceData.charAt(0);
                            const rotateMarker = pieceData.charAt(1);
                            const markerHeight = 0.15;

                            // Draw movement markers (+, -, |)
                            if (moveMarker === '2' || moveMarker === '4') { // Horizontal bar
                                const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
                                glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
                                glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.25, 0.02, 0.02]);
                                drawMarker(gl, solidColorProgramInfo, stickBuffers, markerMatrix, view);
                            }
                            if (moveMarker === '2' || moveMarker === '3') { // Vertical bar
                                const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
                                glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
                                glMatrix.mat4.rotate(markerMatrix, markerMatrix, Math.PI / 2, [0, 1, 0]);
                                glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.25, 0.02, 0.02]);
                                drawMarker(gl, solidColorProgramInfo, stickBuffers, markerMatrix, view);
                            }

                            // Draw rotation/flip markers (O, U, C)
                            if (rotateMarker === '1') { // O
                                const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
                                glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
                                glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
                                drawMarker(gl, solidColorProgramInfo, ringBuffers, markerMatrix, view);
                            }
                            if (rotateMarker === '2') { // Bottom semi-circle
                                const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
                                glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
                                glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
                                drawMarker(gl, solidColorProgramInfo, arcBottomBuffers, markerMatrix, view);
                            }
                            if (rotateMarker === '3') { // Left-opening semi-circle
                                const markerMatrix = glMatrix.mat4.clone(pieceModelMatrix);
                                glMatrix.mat4.translate(markerMatrix, markerMatrix, [0, markerHeight, 0]);
                                glMatrix.mat4.scale(markerMatrix, markerMatrix, [0.6, 0.02, 0.6]);
                                drawMarker(gl, solidColorProgramInfo, arcLeftBuffers, markerMatrix, view);
                            }
                        }
                    }
                }

                if (vrIntersectionPoint) {
                    const { mat4 } = glMatrix;
                    const pointerMatrix = mat4.create();
                    mat4.translate(pointerMatrix, pointerMatrix, vrIntersectionPoint);
                    mat4.scale(pointerMatrix, pointerMatrix, [0.025, 0.025, 0.025]);
                    mat4.multiply(pointerMatrix, view.transform.inverse.matrix, pointerMatrix);
                    drawScene(gl, textureProgramInfo, buffers, pointerTexture, view.projectionMatrix, pointerMatrix);

                    // Draw 3D cone cursor
                    gl.useProgram(solidColorProgramInfo.program);
                    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.position);
                    gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffers.normal);
                    gl.vertexAttribPointer(solidColorProgramInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);

                    const coneMatrix = glMatrix.mat4.create();
                    // Hover 5cm above the board
                    glMatrix.mat4.fromTranslation(coneMatrix, [vrIntersectionPoint[0], vrIntersectionPoint[1] + 0.05, vrIntersectionPoint[2]]);
                    // Scale it to be small, and point it downwards
                    glMatrix.mat4.scale(coneMatrix, coneMatrix, [0.02, 0.05, 0.02]);
                    glMatrix.mat4.rotate(coneMatrix, coneMatrix, Math.PI, [1, 0, 0]); // Rotate 180 deg on X to point down

                    const finalConeModelViewMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), view.transform.inverse.matrix, coneMatrix);
                    const coneNormalMatrix = glMatrix.mat4.create();
                    glMatrix.mat4.invert(coneNormalMatrix, coneMatrix);
                    glMatrix.mat4.transpose(coneNormalMatrix, coneNormalMatrix);

                    gl.uniform4fv(solidColorProgramInfo.uniformLocations.color, [1.0, 1.0, 0.0, 1.0]); // Yellow
                    gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.modelViewMatrix, false, finalConeModelViewMatrix);
                    gl.uniformMatrix4fv(solidColorProgramInfo.uniformLocations.normalMatrix, false, coneNormalMatrix);
                    gl.drawArrays(gl.TRIANGLES, 0, coneBuffers.vertexCount);
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
        // Top vertex
        vertices.push(x, halfHeight, z);
        normals.push(x / radius, 0, z / radius);
        // Bottom vertex
        vertices.push(x, -halfHeight, z);
        normals.push(x / radius, 0, z / radius);
    }
    for (let i = 0; i < segments; i++) {
        const topLeft = sideStartIndex + i * 2;
        const bottomLeft = topLeft + 1;
        const topRight = sideStartIndex + ((i + 1) % segments) * 2;
        const bottomRight = topRight + 1;
        // Triangle 1
        indices.push(topLeft, topRight, bottomLeft);
        // Triangle 2
        indices.push(topRight, bottomRight, bottomLeft);
    }

    return { vertices, indices, normals };
}

function createHalfCylinder(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const halfHeight = height/2;

    // Curved face
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

    // Back face
    vertices.push(0, halfHeight, -radius,  0, -halfHeight, -radius,  0, halfHeight, radius);
    normals.push(-1,0,0, -1,0,0, -1,0,0);
    vertices.push(0, -halfHeight, -radius,  0, -halfHeight, radius,  0, halfHeight, radius);
    normals.push(-1,0,0, -1,0,0, -1,0,0);

    // Caps
    for (let i = 0; i < segments; i++) {
        const ang1 = (i / segments) * Math.PI - Math.PI/2;
        const ang2 = ((i + 1) / segments) * Math.PI - Math.PI/2;
        const x1 = radius * Math.cos(ang1), z1 = radius * Math.sin(ang1);
        const x2 = radius * Math.cos(ang2), z2 = radius * Math.sin(ang2);

        // Top cap
        vertices.push(0, halfHeight, 0,  x1, halfHeight, z1,  x2, halfHeight, z2);
        normals.push(0,1,0, 0,1,0, 0,1,0);

        // Bottom cap
        vertices.push(0, -halfHeight, 0,  x2, -halfHeight, z2,  x1, -halfHeight, z1);
        normals.push(0,-1,0, 0,-1,0, 0,-1,0);
    }

    return { vertices, normals };
}

function createCuboid(width, height, depth) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const vertices = [
        // Front
        -w,-h,d,  w,-h,d,  w,h,d,  -w,-h,d,  w,h,d,  -w,h,d,
        // Back
        -w,-h,-d, -w,h,-d,  w,h,-d, -w,-h,-d,  w,h,-d,  w,-h,-d,
        // Top
        -w,h,d,  w,h,d,  w,h,-d, -w,h,d,  w,h,-d, -w,h,-d,
        // Bottom
        -w,-h,d, -w,-h,-d,  w,-h,-d, -w,-h,d,  w,-h,-d,  w,-h,d,
        // Left
        -w,-h,d, -w,h,-d, -w,-h,-d, -w,-h,d, -w,h,d, -w,h,-d,
        // Right
        w,-h,d,  w,-h,-d,  w,h,-d, w,-h,d,  w,h,-d,  w,h,d,
    ];
    const normals = [
        // Front
        0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,
        // Back
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        // Top
        0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0,
        // Bottom
        0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        // Left
        -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        // Right
        1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0,
    ];
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), vertexCount: 36 };
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

    // Start Cap
    const ang1 = startAngle;
    const o_x1 = outerRadius * Math.cos(ang1), o_z1 = outerRadius * Math.sin(ang1);
    const i_x1 = innerRadius * Math.cos(ang1), i_z1 = innerRadius * Math.sin(ang1);
    const cap1Normal = [Math.sin(ang1), 0, -Math.cos(ang1)];
    vertices.push(o_x1, halfHeight, o_z1, o_x1, -halfHeight, o_z1, i_x1, halfHeight, i_z1);
    vertices.push(i_x1, halfHeight, i_z1, o_x1, -halfHeight, o_z1, i_x1, -halfHeight, i_z1);
    for(let j=0; j<6; j++) normals.push(...cap1Normal);

    // End Cap
    const ang2 = endAngle;
    const o_x2 = outerRadius * Math.cos(ang2), o_z2 = outerRadius * Math.sin(ang2);
    const i_x2 = innerRadius * Math.cos(ang2), i_z2 = innerRadius * Math.sin(ang2);
    const cap2Normal = [-Math.sin(ang2), 0, Math.cos(ang2)];
    vertices.push(o_x2, halfHeight, o_z2, i_x2, halfHeight, i_z2, o_x2, -halfHeight, o_z2);
    vertices.push(i_x2, halfHeight, i_z2, i_x2, -halfHeight, i_z2, o_x2, -halfHeight, o_z2);
    for(let j=0; j<6; j++) normals.push(...cap2Normal);

    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), vertexCount: vertices.length / 3 };
}

function createCone(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const tip = [0, height / 2, 0];

    // Sides
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

    // Base cap
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

  // Apply a downward rotation to the ray
  const rotationX = mat4.fromXRotation(mat4.create(), -Math.PI / 6); // -30 degrees
  vec3.transformMat4(rayDirection, rayDirection, rotationX);

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

function toggleVR() {
  if (vrSession) {
    vrSession.end();
  } else {
    activateVR();
  }
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
