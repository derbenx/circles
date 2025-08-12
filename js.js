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
 //ctx.clearRect(0, 0, can.width, can.height);
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
 alert(msg);
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

// VR
function onSessionEnded(session) {
  session.removeEventListener("end", onSessionEnded);
  document.getElementById("btn-vr").disabled = false;
}

async function activateVR() {
  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      requiredFeatures: ["local-floor"],
    });
    session.addEventListener("end", onSessionEnded);

    const sourceCanvas = document.getElementById("can");
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
      varying highp vec2 vTextureCoord;
      uniform sampler2D uSampler;

      void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
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
      },
    };

    const buffers = initBuffers(gl);
    let texture = initTexture(gl, sourceCanvas);

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    const referenceSpace = await session.requestReferenceSpace("local-floor");

    function onXRFrame(time, frame) {
      const session = frame.session;
      session.requestAnimationFrame(onXRFrame);

      draw(1);
      updateTexture(gl, texture, sourceCanvas);

      const pose = frame.getViewerPose(referenceSpace);
      if (pose) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const view of pose.views) {
          const viewport = session.renderState.baseLayer.getViewport(view);
          gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
          drawScene(gl, programInfo, buffers, texture, view.projectionMatrix, view.transform.inverse.matrix);
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

document.getElementById("btn-vr").onclick = activateVR;
