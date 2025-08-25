// Solitaire Game Logic
let ver = 16;
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
var dragSource = null; // To track where cards came from
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
    dragSource = null; // Reset drag source

    let vrClick = (vrGx !== undefined);
    if (vrClick) {
        gx = vrGx;
        gy = vrGy;
    } else {
        if (evn.changedTouches){
            var rect = can.getBoundingClientRect();
            mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
            my=Math.floor(evn.changedTouches[0].clientY-rect.top);
        } else {
            mx = evn.offsetX;
            my = evn.offsetY;
        }
        gx=Math.floor((mx/bw)*xx);
        gy=Math.floor((my/bh)*yy);
    }

    // Store original grid coordinates for drop logic
    ffx = gx;
    ffy = gy;

    // --- Card collection logic ---
    let fromPile = (gy<5 && gx==1);
    let fromAces = (gy<5 && gx>2 && gx<7 && aces[gx-3]);
    let fromSpread = (gy>5 && sprd[gx] && sprd[gx].length > 0);

    if (fromPile) {
        if (pile.length > 0) {
            flow.push(pile.pop());
            dragSource = { pile: 'pile' };
        }
    } else if (fromAces) {
        if (aces[gx-3].length > 0) {
            flow.push(aces[gx-3].pop());
            dragSource = { pile: 'aces', x: gx - 3 };
        }
    } else if (fromSpread) {
        let stack = sprd[gx];
        let cardIndex = gy - 6;
        let firstFaceUpIndex = stack.findIndex(c => !c.startsWith('x'));
        if (firstFaceUpIndex === -1) firstFaceUpIndex = stack.length; // All cards are face-down

        // Only allow picking up face-up cards from the stack, using the click position
        if (cardIndex >= firstFaceUpIndex) {
            let startIndex = cardIndex;
            if (startIndex < stack.length) {
                let numToDrag = stack.length - startIndex;
                let dragged = stack.splice(startIndex, numToDrag);
                flow.push(...dragged);
                dragSource = { pile: 'spread', x: gx };
            }
        }
    }

    if (flow.length > 0) {
        drag = 1;
        if (!vrClick) {
            movr(evn);
        }
    } else {
        gx=-1;gy=-1;
    }
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

  let validDrop = false;

  // --- Check for valid drop ---
  if (ty < 5 && tx >= 3 && tx < 7) { // Drop on Aces pile
    if (flow.length === 1) {
        if ( (flow[0][0] == sc[tx-3]) && (crdval(flow[0],0) == aces[tx-3].length) ) {
            aces[tx-3].push(flow[0]);
            validDrop = true;
        }
    }
  } else if (ty > 5 && tx < 7 && sprd[tx]) { // Drop on main spread
      if (crdcol(flow[0], sprd[tx][sprd[tx].length-1])[3] == false) { // color check
          if (crdval(flow[0],0) == crdval(sprd[tx][sprd[tx].length-1],0) - 1 || sprd[tx].length == 0) { // sequence check
              sprd[tx].push(...flow);
              validDrop = true;
          }
      }
  }

  // --- Handle invalid drop ---
  if (!validDrop && dragSource) {
      if (dragSource.pile === 'pile') pile.push(...flow);
      else if (dragSource.pile === 'aces') aces[dragSource.x].push(...flow);
      else if (dragSource.pile === 'spread') sprd[dragSource.x].push(...flow);
  }
  clrcan(can);
 }
 drag=0;
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

    // --- Highlighting hovered card ---
    if (vrIntersection && !drag) {
        const hx = Math.floor(((vrIntersection.local[0] + 1) / 2) * xx);
        const hy = Math.floor(((1 - vrIntersection.local[1]) / 2) * yy);

        let hx_3d, hy_3d, hz_3d;
        let highlight = false;

        let stack;
        if (hy < 5 && hx >= 3 && hx < 7) { // Aces
            stack = aces[hx-3];
            hx_3d = acesStartX + (hx-3) * cardSpacingX;
            hy_3d = topRowY;
            hz_3d = stack.length * cardDepth;
            highlight = true;
        } else if (hy > 5 && hx < 7 && sprd[hx] && sprd[hx].length > 0) { // Spread
            stack = sprd[hx];
            let cardIndex = Math.min(stack.length - 1, Math.max(0, hy - 6));
            hx_3d = layoutStartX + hx * cardSpacingX;
            hy_3d = 0.2 - cardIndex * 0.05;
            hz_3d = cardIndex * 0.01;
            highlight = true;
        } else if (hy < 5 && hx == 1 && pile.length > 0) { // Pile
             hx_3d = layoutStartX + cardSpacingX;
             hy_3d = topRowY;
             hz_3d = pile.length * cardDepth;
             highlight = true;
        }

        if (highlight) {
            const markerMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(markerMatrix, getCanvasModelMatrix(), [hx_3d, hy_3d, hz_3d]);
            glMatrix.mat4.scale(markerMatrix, markerMatrix, [(cardWidth3D + 0.02) / boardAspectRatio, cardHeight3D + 0.02, cardDepth + 0.002]);
            drawSolid(gl, solidColorProgramInfo, card, markerMatrix, view, [1.0, 1.0, 0.0, 0.5]); // Semi-transparent yellow
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

document.getElementById("btn-vr").onclick = () => {
    // Clear the cache before starting a new VR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleVR(drawSolitaire, xx, yy, 7/5);
};
document.getElementById("btn-xr").onclick = () => {
    // Clear the cache before starting a new AR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleAR(drawSolitaire, xx, yy, 7/5);
};

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
