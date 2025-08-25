// Solitaire Game Logic
let ver = 15;
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
document.getElementById("co1").onchange = () => { co1=document.getElementById("co1").value; draw(); };
document.getElementById("co2").onchange = () => { co2=document.getElementById("co2").value; draw(); };

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

 draw();

 spr.onmousedown = clkd;
 spr.onmouseup = clku;
 spr.onmousemove = movr;
 spr.addEventListener("touchstart", clkd, {passive: true});
 spr.addEventListener("touchend", clku, false);
 spr.addEventListener("touchmove", movr, {passive: true});
}


// --- Input Handlers ---

function clkd(evn, vrGx, vrGy){
    if (flow.length || done) return;

    let vrClick = (vrGx !== undefined);
    if (vrClick) {
        gx = vrGx;
        gy = vrGy;
        fx = -1; fy = -1;
    } else {
        if (evn.changedTouches){
            var rect = can.getBoundingClientRect();
            mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
            my=Math.floor(evn.changedTouches[0].clientY-rect.top);
        } else {
            mx = evn.offsetX;
            my = evn.offsetY;
        }
        fx=mx;fy=my;
        gx=Math.floor((mx/bw)*xx);
        gy=Math.floor((my/bh)*yy);
    }

    // --- Card collection logic ---
    let tc=undefined;
    let fromPile = (gy<5 && gx==1);
    let fromAces = (gy<5 && gx>2 && gx<7 && aces[gx-3]);
    let fromSpread = (gy>5 && sprd[gx] && sprd[gx].length > 0);

    if (fromPile) {
        if (pile.length > 0) flow.push(pile.pop());
    } else if (fromAces) {
        if (aces[gx-3].length > 0) flow.push(aces[gx-3].pop());
    } else if (fromSpread) {
        let stack = sprd[gx];
        let cardIndex = gy - 6;

        // Find the first face-up card
        let firstFaceUpIndex = stack.findIndex(c => !c.startsWith('x'));
        if (firstFaceUpIndex === -1) firstFaceUpIndex = stack.length;

        // Determine which card was actually clicked in 2D
        if (!vrClick && cardIndex < firstFaceUpIndex) {
            // Clicked a face-down card, do nothing
        } else {
            let startIndex = vrClick ? firstFaceUpIndex : Math.max(firstFaceUpIndex, cardIndex);
            if (startIndex < stack.length) {
                let numToDrag = stack.length - startIndex;
                let dragged = stack.splice(startIndex, numToDrag);
                flow.push(...dragged);
            }
        }
    }

    if (flow.length > 0) {
        drag = 1;
        if (!vrClick) {
            movr(evn); // Trigger initial draw for 2D drag animation
        }
    } else {
        gx=-1;gy=-1; // Invalidate click
    }
    ffx = gx; // Store original click location for drop logic
    ffy = gy;
}

async function clku(evn, vrGx, vrGy){
 evn.stopPropagation();
 evn.preventDefault();
 clearInterval(flower);
 clrcan(spr);
 if (done) return;

 let tx, ty;
 if (vrGx !== undefined) {
    tx = vrGx;
    ty = vrGy;
 } else {
    if (evn.changedTouches){
        var rect = can.getBoundingClientRect();
        mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
        my=Math.floor(evn.changedTouches[0].clientY-rect.top);
    }
    tx=Math.floor((mx/bw)*xx); ty=Math.floor((my/bh)*yy);
 }

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
 draw(drag ? 0 : 1);
 flow=[];

 if (aces[0].length>12 && aces[1].length>12 && aces[2].length>12 && aces[3].length>12){
   done=1;
   youWin();
  }
}

function movr(evn){
    if (done || fx==-1 || !drag) return; // Only run for 2D mouse-drag

    if (evn.changedTouches){
        var rect = can.getBoundingClientRect();
        mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
        my=Math.floor(evn.changedTouches[0].clientY-rect.top);
    } else {
        mx=evn.offsetX;
        my=evn.offsetY;
    }

    // This function is now only for 2D animation of the sprite canvas
    if (flow.length) {
        if (!bgsk) { // Redraw background once at start of drag
            clrcan(can);
            draw(1);
            bgsk=1;
        }
        let tmpw=bw/(xx+1);
        clrcan(spr);
        for (let i=0;i<flow.length;i++){
            dcd(spr,mx-(tmpw/2),my+((bw/yy)*i)-(tmpw/2),flow[i],tmpw,co1,co2);
        }
    }
}

// --- Drawing ---

function draw(flip=0) {
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
const cardTextureCache = {};

function getCardTexture(gl, cardFace) {
    // Use a cache to avoid recreating textures
    if (cardTextureCache[cardFace]) {
        return cardTextureCache[cardFace];
    }

    // Create an off-screen canvas to draw the card face
    const textureCanvas = document.createElement('canvas');
    const baseSize = 200;
    textureCanvas.width = baseSize;
    textureCanvas.height = baseSize * 1.5; // Correct 1.5 aspect ratio

    const ctx = textureCanvas.getContext('2d');

    // Fill the entire canvas white to create the border
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    // Draw the card with a margin, effectively scaling it to 95% and centering it
    const cardSize = baseSize * 0.95;
    const margin = (baseSize - cardSize) / 2;
    dcd(textureCanvas, margin, margin, cardFace, cardSize, co1, co2);

    // Create a WebGL texture from the canvas
    const texture = initTexture(gl, textureCanvas);
    cardTextureCache[cardFace] = texture;
    return texture;
}

function drawSolitaire(gl, programs, buffers, view) {
    const { textureProgramInfo, solidColorProgramInfo } = programs;
    const { card } = buffers.pieceBuffers;
    const boardAspectRatio = xx / 5.0;

    // --- Layout Constants ---
    const cardWidth3D = 0.2; // Base width in board's coordinate system
    const cardHeight3D = cardWidth3D * 1.5; // Correct 1.5 aspect ratio
    const cardDepth = 0.005;
    const cardSpacingX = cardWidth3D + (cardWidth3D / 8); // 1/8th card width for spacing
    const totalSpreadWidth = 7 * cardSpacingX - (cardWidth3D / 8); // 7 cards, 6 gaps
    const layoutStartX = -totalSpreadWidth / 2;

    const drawCard = (cardFace, x, y, z, rotationY = 0) => {
        const cardModelMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(cardModelMatrix, getCanvasModelMatrix(), [x, y, z]);
        glMatrix.mat4.rotateY(cardModelMatrix, cardModelMatrix, rotationY);
        // To counteract the board's aspect ratio, we scale the card's X dimension inversely.
        glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [cardWidth3D / boardAspectRatio, cardHeight3D, cardDepth]);

        // Draw the back and edges
        const backTexture = getCardTexture(gl, 'b1');
        const backBuffers = {
            position: card.position,
            textureCoord: card.textureCoord,
            indices: card.backIndices,
            vertexCount: card.backVertexCount,
        };
        drawTextured(gl, textureProgramInfo, backBuffers, backTexture, cardModelMatrix, view);

        // Draw the front face, if it's not a face-down card
        if (cardFace !== 'b1' && !cardFace.startsWith('x')) {
            const frontTexture = getCardTexture(gl, cardFace);
            const frontBuffers = {
                position: card.position,
                textureCoord: card.textureCoord,
                indices: card.frontIndices,
                vertexCount: card.frontVertexCount,
            };
            drawTextured(gl, textureProgramInfo, frontBuffers, frontTexture, cardModelMatrix, view);
        }
    };

    // --- Draw Piles ---
    const topRowY = 0.6;
    // Draw Deck & Pile
    if (deck.length > 0) drawCard('b1', layoutStartX, topRowY, 0);
    if (pile.length > 0) drawCard(pile[pile.length - 1], layoutStartX + cardSpacingX, topRowY, 0);

    // Draw Aces
    const acesStartX = layoutStartX + 3 * cardSpacingX;
    for (let i = 0; i < 4; i++) {
        const acePile = aces[i];
        const xPos = acesStartX + i * cardSpacingX;
        if (acePile.length > 0) {
            drawCard(acePile[acePile.length - 1], xPos, topRowY, 0);
        } else {
            const suit = sc[i].toLowerCase();
            drawCard(suit, xPos, topRowY, 0);
        }
    }

    // Draw Spread
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < sprd[i].length; j++) {
            const cardFace = sprd[i][j];
            const xPos = layoutStartX + i * cardSpacingX;
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

document.getElementById("btn-vr").onclick = () => toggleVR(drawSolitaire, xx, yy, 7/5);
document.getElementById("btn-xr").onclick = () => toggleAR(drawSolitaire, xx, yy, 7/5);

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
