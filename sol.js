// Solitaire Game Logic
let ver = 21;
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
var co1='lime',co2='green',drw=1,fre=1,autoFlip=1;

// --- Initialization ---
start();

document.getElementById("soldrw").onchange = () => { drw=document.getElementById("soldrw").value*1; };
document.getElementById("solfre").onchange = () => { fre=document.getElementById("solfre").value*1; };
document.getElementById("solauto").onchange = () => { autoFlip=document.getElementById("solauto").value*1; };
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

function clkd(evn, vrIntersectionLocal){
    if (flow.length || done) return;
    dragSource = null;

    if (vrIntersectionLocal) {
        const coords = getCardAtIntersection(vrIntersectionLocal);
        if (coords) {
            gx = coords.gx;
            gy = coords.gy;
        } else {
            gx = -1; gy = -1;
        }
    } else {
        if (evn.changedTouches){
            var rect = can.getBoundingClientRect();
            mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
            my=Math.floor(evn.changedTouches[0].clientY-rect.top);
        } else {
            mx = evn.offsetX; my = evn.offsetY;
        }
        const coords = get2DCardAtPoint(mx, my);
        if (coords) {
            gx = coords.gx;
            gy = coords.gy;
        } else {
            gx = -1; gy = -1;
        }
        fx=mx; fy=my;
    }

    ffx = gx; ffy = gy;

    // Card collection logic
    if (gx !== -1) { // A card was actually clicked
        let fromPile = (gy < 5 && gx === 1);
        let fromAces = (gy < 5 && gx >= 3 && gx < 7 && aces[gx - 3]);
        let fromSpread = (gy > 5 && gx < 7 && sprd[gx] && sprd[gx].length > 0);

        if (fromPile) {
            if (pile.length > 0) { flow.push(pile.pop()); dragSource = { pile: 'pile' }; }
        } else if (fromAces) {
            if (aces[gx - 3].length > 0) { flow.push(aces[gx - 3].pop()); dragSource = { pile: 'aces', x: gx - 3 }; }
        } else if (fromSpread) {
            let stack = sprd[gx];
            let cardIndex = gy - 6;
            let firstFaceUpIndex = stack.findIndex(c => !c.startsWith('x'));
            if (firstFaceUpIndex === -1) firstFaceUpIndex = stack.length;

            if (cardIndex >= firstFaceUpIndex) {
                let startIndex = cardIndex;
                if (startIndex < stack.length) {
                    let numToDrag = stack.length - startIndex;
                    flow.push(...stack.splice(startIndex, numToDrag));
                    dragSource = { pile: 'spread', x: gx };
                }
            }
        }
    }

    if (flow.length > 0) {
        drag = 1;
        if (!vrIntersectionLocal) movr(evn);
    } else {
        gx=-1; gy=-1;
    }
}

async function clku(evn, vrIntersectionLocal){
    evn.stopPropagation();
    evn.preventDefault();
    clearInterval(flower);
    clrcan(spr);
    if (done) return;

    let tx, ty;
    if (vrIntersectionLocal) {
        const coords = getCardAtIntersection(vrIntersectionLocal);
        if(coords) {
            tx = coords.gx;
            ty = coords.gy;
        } else {
            tx = -1; ty = -1;
        }
    } else {
        if (evn.changedTouches){
            var rect = can.getBoundingClientRect();
            mx=Math.floor(evn.changedTouches[0].clientX-rect.left);
            my=Math.floor(evn.changedTouches[0].clientY-rect.top);
        } else {
            mx = evn.offsetX; my = evn.offsetY;
        }
        const coords = get2DCardAtPoint(mx, my);
        if (coords) {
            tx = coords.gx;
            ty = coords.gy;
        } else {
            // Fallback for clicking on empty areas (like deck)
            tx = Math.floor((mx / bw) * xx);
            ty = Math.floor((my / bh) * yy);
        }
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
        let validDrop = false;
        if (ty < 5 && tx >= 3 && tx < 7) { // Drop on Aces pile
            if (flow.length === 1) {
                if ( (flow[0][0] == sc[tx-3]) && (crdval(flow[0],0) == aces[tx-3].length) ) {
                    aces[tx-3].push(flow[0]);
                    validDrop = true;
                }
            }
        } else if (ty > 5 && tx < 7 && sprd[tx]) { // Drop on main spread
            if (sprd[tx].length === 0) { // Case 1: Dropping on an empty pile
                if (crdval(flow[0], 0) === 12) { // Must be a King
                    sprd[tx].push(...flow);
                    validDrop = true;
                }
            } else { // Case 2: Dropping on an existing pile
                if (crdcol(flow[0], sprd[tx][sprd[tx].length - 1])[3] == false) { // color check
                    if (crdval(flow[0], 0) == crdval(sprd[tx][sprd[tx].length - 1], 0) - 1) { // sequence check
                        sprd[tx].push(...flow);
                        validDrop = true;
                    }
                }
            }
        }

        if (!validDrop && dragSource) {
            if (dragSource.pile === 'pile') pile.push(...flow);
            else if (dragSource.pile === 'aces') aces[dragSource.x].push(...flow);
            else if (dragSource.pile === 'spread') sprd[dragSource.x].push(...flow);
        }
    } else if (flow.length < 1 && !autoFlip) { // Manual flip logic
        if (ty > 5 && tx < 7 && sprd[tx] && sprd[tx].length > 0) {
            let stack = sprd[tx];
            let cardIndex = ty - 6;
            if (cardIndex === stack.length - 1) { // Can only flip the last card
                let card = stack[cardIndex];
                if (card.startsWith('x')) {
                    stack[cardIndex] = card.substr(1, 2);
                }
            }
        }
    }

    drag=0;
    // When drag is true, prevent auto-flip. When false (after drop), allow it.
    draw(drag);
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

function get2DCardAtPoint(clickX, clickY) {
    let xxx = xx + 1;
    let tmpw = bw / xxx;
    let cardHeight = tmpw * 1.5;
    let ySpacing = (bw / yy);

    // Check top row (from front to back)
    for (let ii = 6; ii >= 0; ii--) {
        if (ii === 2) continue; // Skip empty space
        let x1 = (ii * (tmpw + (tmpw / xxx))) + (tmpw / xxx);
        let y1 = (bw / yy);
        let x2 = x1 + tmpw;
        let y2 = y1 + cardHeight;
        if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
            if (ii > 2) return { gx: ii, gy: 1 }; // Aces
            return { gx: ii, gy: 1 }; // Deck and Pile
        }
    }

    // Check spread piles (from front to back)
    for (let i = 0; i < 7; i++) {
        const stack = sprd[i];
        if (!stack || stack.length === 0) continue;
        for (let j = stack.length - 1; j >= 0; j--) {
            let x1 = (i * (tmpw + (tmpw / xxx))) + (tmpw / xxx);
            let y1 = ySpacing * (j + 6);
            let x2 = x1 + tmpw;
            let y2 = y1 + (j === stack.length - 1 ? cardHeight : ySpacing);
            if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
                return { gx: i, gy: 6 + j };
            }
        }
    }
    return null;
}

function draw(preventAutoFlip = false) {
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
    if (autoFlip && !preventAutoFlip && crd.startsWith('x') && i === sprd[ii].length - 1){
     sprd[ii][i]=crd.substr(1,2);
     crd=sprd[ii][i];
    }
    let cardFace = crd.startsWith('x') ? 'b1' : crd;
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

// --- Unified Layout and Interaction Logic ---

const layout = {
    boardAspectRatio: 7.0 / 5.0,
    cardWidth: 0.2,
    // cardHeight is defined relative to cardWidth, but must be adjusted by the board's aspect ratio
    // so the final rendered card appears correct.
    get cardHeight() { return (this.cardWidth * 1.5) / this.boardAspectRatio; },
    cardDepth: 0.005,
    get xSpacing() { return this.cardWidth * 1.15; },
    get ySpacing() { return this.cardHeight * 0.2; },
    get totalWidth() { return 7 * this.xSpacing; },
    get startX() { return -this.totalWidth / 2 + (this.xSpacing/2); },
    topRowY: 0.6,
    get spreadStartY() { return this.topRowY - this.cardHeight - 0.1; }
};


function getCardAtIntersection(local) {
    if (!local) return null;

    // Intersection point `local` is in the unscaled local space of the board, i.e., [-1, 1] for both X and Y.
    const clickX = local[0];
    const clickY = local[1];

    const cardW = layout.cardWidth;
    const cardH = layout.cardHeight;

    // Check top row by iterating through positions
    const topY = layout.topRowY;
    if (clickY > topY - cardH/2 && clickY < topY + cardH/2) {
        // Deck
        let deckX = layout.startX;
        if (clickX > deckX - cardW/2 && clickX < deckX + cardW/2) return {gx: 0, gy: 1};
        // Pile
        let pileX = layout.startX + layout.xSpacing;
        if (clickX > pileX - cardW/2 && clickX < pileX + cardW/2) return {gx: 1, gy: 1};
        // Aces
        for (let i = 0; i < 4; i++) {
            let aceX = layout.startX + (3 + i) * layout.xSpacing;
            if (clickX > aceX - cardW/2 && clickX < aceX + cardW/2) return {gx: 3 + i, gy: 1};
        }
    }

    // Check spread
    for (let i = 0; i < 7; i++) {
        const stack = sprd[i];
        if (!stack || stack.length === 0) continue;
        const xPos = layout.startX + i * layout.xSpacing;
        if (clickX > xPos - cardW/2 && clickX < xPos + cardW/2) {
            for (let j = stack.length - 1; j >= 0; j--) {
                const yPos = layout.spreadStartY - j * layout.ySpacing;
                // The clickable area for a card in a spread is only the exposed part
                const topOfCard = yPos + cardH/2;
                const bottomOfCard = (j === stack.length - 1) ? (yPos - cardH/2) : (yPos + cardH/2 - layout.ySpacing);
                if (clickY > bottomOfCard && clickY < topOfCard) {
                    return {gx: i, gy: 6 + j};
                }
            }
        }
    }
    return null;
}

function drawCardWithMatrix(gl, programs, buffers, cardFace, modelMatrix, view) {
    const { textureProgramInfo } = programs;
    const { card } = buffers.pieceBuffers;

    const backTexture = getCardTexture(gl, 'b1');
    const backBuffers = { position: card.position, textureCoord: card.textureCoord, indices: card.backIndices, vertexCount: card.backVertexCount };
    drawTextured(gl, textureProgramInfo, backBuffers, backTexture, modelMatrix, view);

    if (cardFace !== 'b1' && !cardFace.startsWith('x')) {
        const frontTexture = getCardTexture(gl, cardFace);
        const frontBuffers = { position: card.position, textureCoord: card.textureCoord, indices: card.frontIndices, vertexCount: card.frontVertexCount };
        drawTextured(gl, textureProgramInfo, frontBuffers, frontTexture, modelMatrix, view);
    }
}

function drawSolitaire(gl, programs, buffers, view) {
    const { solidColorProgramInfo } = programs;
    const { card } = buffers.pieceBuffers;

    const drawCard = (cardFace, x, y, z) => {
        const cardModelMatrix = glMatrix.mat4.create();
        const canvasMatrix = getCanvasModelMatrix();
        glMatrix.mat4.translate(cardModelMatrix, canvasMatrix, [x, y, z]);
        glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [layout.cardWidth, layout.cardHeight, layout.cardDepth]);
        drawCardWithMatrix(gl, programs, buffers, cardFace, cardModelMatrix, view);
    };

    // Draw Piles
    if (deck.length > 0) drawCard('b1', layout.startX, layout.topRowY, 0);
    if (pile.length > 0) drawCard(pile[pile.length - 1], layout.startX + layout.xSpacing, layout.topRowY, 0.1 * layout.cardDepth);

    // Draw Aces
    for (let i = 0; i < 4; i++) {
        const acePile = aces[i];
        const xPos = layout.startX + (3 + i) * layout.xSpacing;
        if (acePile.length > 0) {
            drawCard(acePile[acePile.length - 1], xPos, layout.topRowY, acePile.length * layout.cardDepth);
        } else {
            // Draw a placeholder for the ace piles
            drawCard(sc[i].toLowerCase(), xPos, layout.topRowY, -0.1 * layout.cardDepth);
        }
    }

    // Draw Spread
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < sprd[i].length; j++) {
            const cardFace = sprd[i][j];
            const xPos = layout.startX + i * layout.xSpacing;
            const yPos = layout.spreadStartY - j * layout.ySpacing;
            drawCard(cardFace, xPos, yPos, j * layout.cardDepth);
        }
    }

    // Highlighting
    if (vrIntersection && !drag) {
        const coords = getCardAtIntersection(vrIntersection.local);
        if (coords) {
            let z_idx = 0;
            let xPos, yPos;
            let stackSize = 1;

            if (coords.gy < 5) { // Top row
                yPos = layout.topRowY;
                if (coords.gx === 0) { xPos = layout.startX; stackSize = deck.length; }
                else if (coords.gx === 1) { xPos = layout.startX + layout.xSpacing; stackSize = pile.length; }
                else { xPos = layout.startX + (3 + (coords.gx - 3)) * layout.xSpacing; stackSize = aces[coords.gx-3].length; }
                z_idx = stackSize;
            } else { // Spread
                const cardIndex = coords.gy - 6;
                xPos = layout.startX + coords.gx * layout.xSpacing;
                yPos = layout.spreadStartY - cardIndex * layout.ySpacing;
                z_idx = cardIndex;
            }

            const markerMatrix = glMatrix.mat4.create();
            glMatrix.mat4.translate(markerMatrix, getCanvasModelMatrix(), [xPos, yPos, (z_idx + 0.1) * layout.cardDepth]);
            glMatrix.mat4.scale(markerMatrix, markerMatrix, [layout.cardWidth + 0.01, layout.cardHeight + 0.01, layout.cardDepth]);
            drawSolid(gl, solidColorProgramInfo, card, markerMatrix, view, [1.0, 1.0, 0.0, 0.5]); // Transparent yellow
        }
    }

    // Draw Flowing (dragged) cards
    if (drag && flow.length > 0 && vrIntersection && vrIntersection.gripPose) {
        for (let i = 0; i < flow.length; i++) {
            const cardFace = flow[i];
            const cardModelMatrix = glMatrix.mat4.clone(vrIntersection.gripPose.transform.matrix);

            // Offset the card slightly in front of the controller and stack them
            const offset = glMatrix.vec3.fromValues(0, 0, -0.05 - (i * layout.cardDepth * 2));
            glMatrix.mat4.translate(cardModelMatrix, cardModelMatrix, offset);

            // Orient the card to face the user
            glMatrix.mat4.rotateX(cardModelMatrix, cardModelMatrix, -Math.PI / 2);

            // Scale the card to the correct dimensions, matching the size of the cards on the board
            const worldCardWidth = layout.cardWidth * layout.boardAspectRatio;
            const worldCardHeight = layout.cardHeight;
            glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [worldCardWidth, worldCardHeight, layout.cardDepth]);

            drawCardWithMatrix(gl, programs, buffers, cardFace, cardModelMatrix, view);
        }
    }
}


// --- VR/AR Bootstrap ---

document.getElementById("btn-vr").onclick = () => {
    // Clear the cache before starting a new VR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleVR(drawSolitaire, xx, yy, 7/5, draw);
};
document.getElementById("btn-xr").onclick = () => {
    // Clear the cache before starting a new AR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleAR(drawSolitaire, xx, yy, 7/5, draw);
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
