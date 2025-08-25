// Solitaire Game Logic
let ver = 7;
var game,can,spr,bw,bh;
var done=0;
var mx,my;
var gx,gy;
var fx=fy=-1;
var px,py,pz;
var drag=0;
var xx=7; // cards across
var yy=25; // vertical sections for layout
var cs=5; // card grid length (unused?)
var sprd=[]; // main card area
var flow=[]; // dragged cards
var aces=[[],[],[],[]]; // aces storage
var flox=[];var floy=[];
var flod=0;
var flower;
var bgsk;
var co1='lime',co2='green',drw=1,fre=1;

// --- Initialization ---
start();

document.getElementById("soldrw").onchange = () => { drw=document.getElementById("soldrw").value*1; };
document.getElementById("solfre").onchange = () => { fre=document.getElementById("solfre").value*1; };
document.getElementById("co1").onchange = () => { co1=document.getElementById("co1").value; redraw(); };
document.getElementById("co2").onchange = () => { co2=document.getElementById("co2").value; redraw(); };

document.getElementById("soltogsetup").onclick = function(){
 var soltog=document.getElementById("solsetup");
 soltog.style.display = (soltog.style.display !== "none") ? "none" : "block";
};
document.getElementById("solstart").onclick = function(){
 done=0;
 aces=[[],[],[],[]];
 start();
};

function start(){
 document.getElementById('version-display').value = ver;
 game=document.body;
 bw=game.clientWidth<game.clientHeight ? game.clientWidth*.8 : game.clientHeight*.8;
 bh=bw;
 can=document.getElementById('can');
 can.width=bw; can.height=bh;
 spr=document.getElementById('spr');
 spr.width=bw; spr.height=bh;
 shf(); // shuffles deck in cards.js

 // Deal cards
 for (ii=0;ii<7;ii++) {
  var tmp=[];
  for (i=0;i<=ii;i++) {
   tc=dr(1)[0];
   tmp[i]= ii==i ? tc : 'x'+tc;
  }
  sprd[ii]=tmp;
 }

 redraw();

 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 spr.addEventListener("touchmove", movr, {passive: true});
}


// --- Input Handlers ---

function clkd(evn){
 if (flow.length || done) return;
 flox=[];floy=[];
 clrcan(can);
 redraw(1);
 bgsk=0;
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

async function clku(evn){
 evn.stopPropagation();
 evn.preventDefault();
 clearInterval(flower);
 clrcan(spr);
 if (done) return;

 if (evn.changedTouches){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }
 let tx=Math.floor((mx/bw)*xx);
 let ty=Math.floor((my/bh)*yy);

 if (flow.length<1 && tx==0 && ty>=1 && ty<=4){ // Click on deck
  let ccc=dr(drw);
  if (ccc.length>0) {
   pile.push(...ccc);
  }else{
   deck=pile;
   deck.reverse();
   pile=[];
  }
 } else if (drag){ // Dropping dragged cards
  let ffx=Math.floor((fx/bw)*xx);
  let ffy=Math.floor((fy/bh)*yy);
  let dbtc = (ty<5 && tx>2) ? aces[tx-3][aces[tx-3].length-1] : sprd[tx] ? sprd[tx][sprd[tx].length-1] : undefined;

  let cvz=[ crdval(flow[0],0), crdval(dbtc,0) ];
  cvz.push( crdcol(flow[0],dbtc) );

  let fail=0;
  if (flow.length==1 && ty<6 && tx>2 && tx<7){ // Drop on Aces pile
    if (flow[0][0]!=sc[tx-3]) fail = !fre ? 0 : 1;
    if (cvz[0]!=cvz[1]+1) fail = !fre || (cvz[0]==0 && cvz[1]==-1) ? fail : 1;
    if (fail) { // Drop failed, return card
        if (ffy<5 && ffx<3) pile.push(flow[0]);
        else if (ffy<5 && ffx>2) (aces[ffx-3]).push(flow[0]);
        else sprd[ffx].push(...flow);
    } else (aces[tx-3]).push(flow[0]);

  } else if(flow.length && ty>5){ // Drop on main spread
    if (flow[0]!=undefined){
        if (cvz[2] && cvz[2][3]==true) fail = !fre ? 0 : 1;
        if (cvz[0]!=cvz[1]-1 && cvz[1]!=-1) fail= !fre ? 0 : 1;

        if (fail) { // Drop failed, return card
            if (ffy>5) sprd[ffx].push(...flow);
            else if (ffx>2 && ffx<7) (aces[ffx-3]).push(flow[0]);
            else pile.push(flow[0]);
        } else sprd[tx].push(...flow);
    }
  } else { // Invalid drop location, return card
    if (flow[0]){
        if (ffy>5) sprd[ffx].push(...flow);
        else if (ffy>2 && ffx<7) (aces[ffx-3]).push(flow[0]);
        else pile.push(flow[0]);
    }
  }
  clrcan(can);
 }
 drag=0;fx=-1;fy=-1;
 redraw(drag ? 0 : 1);
 flow=[];

 if (aces[0].length>12 && aces[1].length>12 && aces[2].length>12 && aces[3].length>12){
   done=1;
   youWin();
  }
}

function movr(evn){
 if (done || fx==-1) return;
 mx=evn.offsetX; my=evn.offsetY;
 if (!mx && evn.changedTouches!=undefined){
  var rect = can.getBoundingClientRect();
  mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
  my=Math.floor(evn.changedTouches[0].clientY-rect.top);
 }

 drag=1;
 let tmpw=bw/(xx+1);
 let tx=Math.floor((fx/bw)*xx);
 let ty=Math.floor((fy/bh)*yy);

 if (tx>-1){
  if (!flow[0]) { // Start of drag, collect cards
   let tc=undefined;
   if (gy<5 && gx==1) tc=pile[pile.length-1];
   else if (gy>5) {
       for (i=0;i<20;i++){ // Look up the stack for the card clicked
        tc= tc===undefined ? sprd[tx][ty-6-i] :  tc;
        if (tc!=undefined) break;
       }
   } else if (gy<5 && gx>2 && gx<7 && aces[gx-3]) {
       flow[0]=aces[gx-3].pop();
   }

   if (tc && !flow[0]) {
       if (gy<5 && gx==1) {
           if(pile.length>0) flow[0]=pile.pop(); else fx=-1;
       } else {
           let i=0, tmpz;
           while (tmpz!=tc){
            tmpz=sprd[tx].pop();
            if (tmpz){ flow[i]=tmpz; i++; }
           }
           flow.reverse();
       }
   }
   if (flow[0]==undefined) flow=[];
  }

  if (flow.length) { // During drag, update position for animation
    clrcan(spr);
    for (i=0;i<flow.length;i++){
     dcd(spr,mx-(tmpw/2),my+((bw/yy)*i)-(tmpw/2),flow[i],tmpw,co1,co2);
    }
  }
 }
 if (!bgsk) {
   clrcan(can);
   redraw(1);
   bgsk=1;
 }
}

// --- Drawing ---

function redraw(flip=0) {
 if (inVR || inAR) return; // Don't draw 2D if in VR/AR
 let xxx=xx+1;
 let tmpw=bw/xxx;
 clrcan(can);

 // Top row
 for (let ii=0;ii<7;ii++) {
  if (ii!=2) {
   let tc='';
   if (ii==0) tc=deck.length>0 ? 'b1' : '';
   else if (ii==1) tc=pile.length>0 ? pile[pile.length-1] : '';
   else if (ii>2) {
       let acePile = aces[ii-3];
       tc=acePile.length ? acePile[acePile.length-1] : sc[ii-3].toLowerCase();
   }
   dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),tc,tmpw,co1,co2);
  }
 }
 // Card spread
 for (let ii=0;ii<7;ii++) {
  for (let i=0;i<sprd[ii].length;i++) {
   let crd=sprd[ii][i];
   if (crd){
    if (flip==0 && crd.substr(0,1)=='x' && i==sprd[ii].length-1){
     sprd[ii][i]=crd.substr(1,2);
     crd=sprd[ii][i];
    }
    let cardFace = crd.substr(0,1)=='x' ? 'b1' : crd;
    dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy)*(i+6),cardFace,tmpw,co1,co2);
   }
  }
 }
}

function youWin() {
    let msg = "Congratulations, you won!";
    if (inVR || inAR) {
        showVROverlay(msg, () => {
            done=0;
            aces=[[],[],[],[]];
            start();
        });
    } else {
        alert(msg);
        done=0;
        aces=[[],[],[],[]];
        start();
    }
}

// --- VR/AR Drawing ---

// --- Self-contained drawing function for textures ---
function drawCardForTexture(ctx, cardFace, size, co1, co2) {
    const card_w = size;
    const card_h = size * 1.4;

    // Card background
    ctx.fillStyle = co1;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = size / 25;
    ctx.fillRect(0, 0, card_w, card_h);
    ctx.fillStyle = 'white';
    ctx.fillRect(size / 25, size / 25, card_w - (size / 12.5), card_h - (size / 12.5));

    if (cardFace === 'b1' || cardFace.startsWith('x')) {
        ctx.fillStyle = co2;
        ctx.fillRect(size/10, size/10, size*0.8, card_h*0.9);
        return;
    }

    if (cardFace.length < 2) { // Empty ace pile markers
        const suit = cardFace.substr(0,1);
        const f_col = (suit=='h' || suit=='d') ? 'red' : 'black';
        drawSuitSymbol(ctx, suit, card_w/2, card_h/2, size/1.5, f_col);
        return;
    }

    // Card face
    const suit = cardFace.substr(0,1);
    let val = cardFace.substr(1,1).toUpperCase();
    if (val === '0' || val === 'T') val = '10';

    const f_col = (suit=='h' || suit=='d') ? 'red' : 'black';

    // Draw text
    ctx.fillStyle = f_col;
    ctx.font = (size/4) + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(val, size/5, size/5);
    ctx.fillText(val, card_w - size/5, card_h - size/5);

    // Draw suit symbol
    drawSuitSymbol(ctx, suit, card_w/2, card_h/2, size/2.5, f_col);
}

function drawSuitSymbol(ctx, suit, x, y, sz, f_col) {
    ctx.fillStyle = f_col;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (suit=='c') { // Clubs
        ctx.arc(x - sz/3, y + sz/6, sz/3, 0, 2 * Math.PI, false);
        ctx.arc(x + sz/3, y + sz/6, sz/3, 0, 2 * Math.PI, false);
        ctx.arc(x, y - sz/3, sz/3, 0, 2 * Math.PI, false);
        ctx.rect(x - sz/6, y-sz/6, sz/3, sz/2);
    } else if (suit=='s') { // Spades
        ctx.arc(x - sz/3, y, sz/3, 0, 2 * Math.PI, false);
        ctx.arc(x + sz/3, y, sz/3, 0, 2 * Math.PI, false);
        ctx.moveTo(x - sz/2, y);
        ctx.lineTo(x, y - sz);
        ctx.lineTo(x + sz/2, y);
    } else if (suit=='d') { // Diamonds
        ctx.moveTo(x, y - sz * 0.8);
        ctx.lineTo(x - sz/2, y);
        ctx.lineTo(x, y + sz * 0.8);
        ctx.lineTo(x + sz/2, y);
    } else if (suit=='h') { // Hearts
        ctx.arc(x - sz/4, y - sz/4, sz/4, Math.PI, 2*Math.PI, false);
        ctx.arc(x + sz/4, y - sz/4, sz/4, Math.PI, 2*Math.PI, false);
        ctx.moveTo(x - sz/2, y - sz/4);
        ctx.lineTo(x, y + sz/2);
        ctx.lineTo(x + sz/2, y - sz/4);
    }
    ctx.closePath();
    ctx.fill();
}

const cardTextureCache = {};

function getCardTexture(gl, cardFace) {
    if (cardTextureCache[cardFace]) {
        return cardTextureCache[cardFace];
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256 * 1.4;
    const ctx = canvas.getContext('2d');
    drawCardForTexture(ctx, cardFace, 256, co1, co2);
    const texture = initTexture(gl, canvas);
    cardTextureCache[cardFace] = texture;
    return texture;
}

function drawSolitaire(gl, programs, buffers, view) {
    const { textureProgramInfo, solidColorProgramInfo } = programs;
    const { card } = buffers.pieceBuffers;
    const cardWidth = 0.2;
    const cardHeight = cardWidth * 1.4;
    const cardDepth = 0.005;
    const xxx = xx + 1;
    const tmpw = 2.0 / xxx; // 2.0 is the width of the board in clip space

    const drawCard = (cardFace, x, y, z, rotationY = 0) => {
        const cardModelMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(cardModelMatrix, getCanvasModelMatrix(), [x, y, z]);
        glMatrix.mat4.rotateY(cardModelMatrix, cardModelMatrix, rotationY);
        glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [cardWidth, cardHeight, cardDepth]);

        if (cardFace === 'b1' || cardFace.startsWith('x')) {
            const backTexture = getCardTexture(gl, 'b1');
            drawTextured(gl, textureProgramInfo, card, backTexture, cardModelMatrix, view);
        } else {
            const frontTexture = getCardTexture(gl, cardFace);
            drawTextured(gl, textureProgramInfo, card, frontTexture, cardModelMatrix, view);
        }
    };

    // Draw Deck & Pile
    if (deck.length > 0) drawCard('b1', -0.8, 0.6, 0);
    if (pile.length > 0) drawCard(pile[pile.length - 1], -0.6, 0.6, 0);

    // Draw Aces
    for (let i = 0; i < 4; i++) {
        const acePile = aces[i];
        const initialCard = sc[i].toLowerCase();
        if (acePile.length > 0) {
            drawCard(acePile[acePile.length - 1], 0.2 + i * 0.25, 0.6, 0);
        } else {
             // Draw empty slot marker
            const markerMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(markerMatrix, getCanvasModelMatrix(), [0.2 + i * 0.25, 0.6, 0]);
            glMatrix.mat4.scale(markerMatrix, markerMatrix, [cardWidth, cardHeight, cardDepth]);
            drawSolid(gl, solidColorProgramInfo, card, markerMatrix, view, [0,0.5,0,0.5]);
        }
    }

    // Draw Spread
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < sprd[i].length; j++) {
            const cardFace = sprd[i][j];
            const xPos = -0.9 + i * 0.3;
            const yPos = 0.2 - j * 0.05;
            const zPos = j * 0.01;
            drawCard(cardFace, xPos, yPos, zPos);
        }
    }

    // Draw Flowing (dragged) cards
    if (drag && flow.length > 0 && vrIntersection) {
        for (let i = 0; i < flow.length; i++) {
            const cardFace = flow[i];
            const xPos = vrIntersection.local[0];
            const yPos = vrIntersection.local[1] - i * 0.05;
            const zPos = 0.2 + i * 0.01; // Lift off the board
            drawCard(cardFace, xPos, yPos, zPos);
        }
    }
}


// --- VR/AR Bootstrap ---

document.getElementById("btn-vr").onclick = () => toggleVR(drawSolitaire);
document.getElementById("btn-xr").onclick = () => toggleAR(drawSolitaire);

(async () => {
    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) document.getElementById('btn-xr').style.display = 'inline';
        } catch (e) { console.error("Error checking for AR support:", e); }
    }
})();

// ds() and other card drawing functions are assumed to be in cards.js and globally available.
// shf(), dr(), crdval(), crdcol() are also in cards.js
// sc[] is in cards.js ('C', 'T', 'S', 'D')
// val[] is in cards.js (card values)
