// Solitaire Game Logic
let ver = 39;
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
var masterDeck = []; // Central deck for 3D mode
var flox=[];var floy=[];
var flod=0;
var flower;
var bgsk;
var dragSource = null; // To track where cards came from
var co1='lime',co2='green',drw=1,fre=1,autoFlip=1;
var gCardDepth = 0.005; // Global card thickness for 3D

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

    // --- State Initialization ---
    // Generate a shuffled deck of card IDs
    const cardIds = [];
    for (const suit of sc) {
        for (const value of cc) {
            cardIds.push(suit + value);
        }
    }
    cardIds.sort(() => 0.5 - Math.random());
    cardIds.sort(() => 0.5 - Math.random());

    // Create the master deck of card objects
    masterDeck = cardIds.map((id, index) => ({
        id: id,
        key: id + index, // A unique key for potential React-style rendering
        pile: 'deck',    // The pile the card belongs to
        order: index,    // The card's order within its pile
        faceUp: false,   // Whether the card is face up
    }));

    // Deal cards by updating their properties in masterDeck
    let dealIndex = 0;
    for (let i = 0; i < 7; i++) { // For each of the 7 tableau piles
        for (let j = 0; j <= i; j++) { // For each card in that pile
            const card = masterDeck[dealIndex++];
            card.pile = 'sprd' + i;
            card.order = j;
            card.faceUp = (j === i); // Only the last card in each pile is face up
        }
    }

    // Update legacy arrays for 2D mode compatibility
    // This is a temporary measure during the refactor
    deck = masterDeck.filter(c => c.pile === 'deck').map(c => c.id);
    sprd = [];
    for (let i = 0; i < 7; i++) {
        const pileCards = masterDeck
            .filter(c => c.pile === 'sprd' + i)
            .sort((a, b) => a.order - b.order)
            .map(c => c.faceUp ? c.id : 'x' + c.id);
        sprd.push(pileCards);
    }
    pile = [];
    aces = [[], [], [], []];
    flow = [];

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
    if (masterDeck.filter(c=>c.pile === 'flow').length > 0 || done) return;

    // --- VR/AR Path ---
    if (vrIntersectionLocal) {
        const hit = getCardAtIntersection(vrIntersectionLocal);

        if (hit && hit.type === 'card') {
            const clickedCard = hit.card;
            let draggableStack = [];

            if (clickedCard.pile.startsWith('sprd') && clickedCard.faceUp) {
                const pileCards = masterDeck.filter(c => c.pile === clickedCard.pile).sort((a,b) => a.order - b.order);
                draggableStack = pileCards.slice(clickedCard.order);
            } else if (clickedCard.pile.startsWith('aces') || clickedCard.pile === 'pile') {
                const pileCards = masterDeck.filter(c => c.pile === clickedCard.pile).sort((a,b) => a.order - b.order);
                if (pileCards.length > 0 && clickedCard.id === pileCards[pileCards.length - 1].id) {
                    draggableStack.push(clickedCard);
                }
            }

            if (draggableStack.length > 0) {
                draggableStack.forEach(card => {
                    card.originalPile = card.pile;
                    card.originalOrder = card.order;
                    card.pile = 'flow';
                });
                drag = 1;
                rebuildLegacyArrays(); // Keep 2D flow in sync
            }
        }
        return; // End VR/AR path
    }

    // --- 2D Path (mouse/touch) ---
    if (flow.length || done) return;
    dragSource = null;
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

    ffx = gx; ffy = gy;

    if (gx !== -1) {
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
    // --- VR/AR Path ---
    if (vrIntersectionLocal || masterDeck.filter(c=>c.pile==='flow').length > 0) {
        evn.stopPropagation();
        evn.preventDefault();
        const flowCards = masterDeck.filter(c => c.pile === 'flow');
        const hit = getCardAtIntersection(vrIntersectionLocal);

        if (flowCards.length > 0) { // It's a drop
            let validDrop = false;
            let targetPileId = null;

            if (hit) {
                if (hit.type === 'card') {
                    targetPileId = hit.card.pile;
                } else if (hit.type === 'pile') {
                    targetPileId = hit.pileId;
                }
            }

            if (targetPileId) {
                const cardToDrop = flowCards[0];
                if (targetPileId.startsWith('aces')) {
                    const acePileIndex = parseInt(targetPileId.substring(4));
                    const targetPileCards = masterDeck.filter(c => c.pile === targetPileId);
                    if (flowCards.length === 1) {
                        if (crdval(cardToDrop.id, 0) === targetPileCards.length && cardToDrop.id[0].toLowerCase() === sc[acePileIndex].toLowerCase()) {
                            validDrop = true;
                        }
                    }
                } else if (targetPileId.startsWith('sprd')) {
                    const targetPileCards = masterDeck.filter(c => c.pile === targetPileId);
                    if (targetPileCards.length === 0) {
                        validDrop = true; // Allow any card on empty spread
                    } else {
                        const topCard = targetPileCards.sort((a,b)=>b.order-a.order)[0];
                        if (crdcol(cardToDrop.id, topCard.id)[3] == false && crdval(cardToDrop.id, 0) === crdval(topCard.id, 0) - 1) {
                            validDrop = true;
                        }
                    }
                }
            }

            if (validDrop) {
                const targetPileCards = masterDeck.filter(c => c.pile === targetPileId);
                let newOrder = targetPileCards.length;
                flowCards.sort((a,b)=>a.originalOrder-b.originalOrder).forEach(card => {
                    card.pile = targetPileId;
                    card.order = newOrder++;
                });
            } else { // Invalid drop, return to original pile
                flowCards.forEach(card => {
                    card.pile = card.originalPile;
                    card.order = card.originalOrder;
                });
            }

        } else { // It's a click, not a drop
             if (hit && (hit.type === 'pile' || hit.type === 'card') && (hit.pileId === 'deck' || (hit.card && hit.card.pile === 'deck'))) {
                const deckCards = masterDeck.filter(c => c.pile === 'deck').sort((a,b) => b.order - a.order);
                if (deckCards.length > 0) {
                    const pileCards = masterDeck.filter(c => c.pile === 'pile');
                    const numToMove = Math.min(drw, deckCards.length);
                    for (let i = 0; i < numToMove; i++) {
                        const card = deckCards[i];
                        card.pile = 'pile';
                        card.order = pileCards.length + i;
                        card.faceUp = true;
                    }
                } else { // Reset deck from pile
                    masterDeck.filter(c => c.pile === 'pile').forEach(c => {
                        c.pile = 'deck';
                        c.faceUp = false;
                    });
                    // Re-order deck
                    const newDeckCards = masterDeck.filter(c => c.pile === 'deck').sort((a,b)=>a.id.localeCompare(b.id));
                    newDeckCards.forEach((c,i)=>c.order=i);
                }
            }
        }

        drag = 0;
        autoFlipCards();
        rebuildLegacyArrays();
        draw();

        if (masterDeck.filter(c=>c.pile.startsWith('aces')).length === 52){
            done=1;
            youWin();
        }
        return;
    }

    // --- 2D Path ---
    evn.stopPropagation();
    evn.preventDefault();
    clearInterval(flower);
    clrcan(spr);
    bgsk = undefined; // Reset background sketch flag
    if (done) return;

    let tx, ty;
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
        tx = Math.floor((mx / bw) * xx);
        ty = Math.floor((my / bh) * yy);
    }

    if (flow.length<1 && tx==0 && ty>=1 && ty<=4){ // Click on deck
        const deckCards = masterDeck.filter(c => c.pile === 'deck').sort((a,b) => b.order - a.order);
        if (deckCards.length > 0) {
            const pileCards = masterDeck.filter(c => c.pile === 'pile');
            const numToMove = Math.min(drw, deckCards.length);
            for (let i = 0; i < numToMove; i++) {
                const card = deckCards[i];
                card.pile = 'pile';
                card.order = pileCards.length + i;
                card.faceUp = true;
            }
        } else { // Reset deck from pile
            masterDeck.filter(c => c.pile === 'pile').forEach(c => {
                c.pile = 'deck';
                c.faceUp = false;
            });
            // Re-order deck
            const newDeckCards = masterDeck.filter(c => c.pile === 'deck').sort((a,b)=>a.id.localeCompare(b.id));
            newDeckCards.forEach((c,i)=>c.order=i);
        }
        rebuildLegacyArrays(); // Sync back to legacy arrays for 2D view
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
                sprd[tx].push(...flow);
                validDrop = true;
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
    flow=[];
    autoFlipCards();
    draw();

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

function draw() {
    if (inVR || inAR) return; // Don't draw 2D if in VR/AR
    let xxx=xx+1;
    let tmpw=bw/xxx;
    clrcan(can);

    // --- Draw all backings ("the wall") ---

    // Top row backings
    for (let ii=0;ii<7;ii++) {
        if (ii!=2) {
            // For deck and pile, draw empty outline.
            let tc = '';
            // For aces, draw suit icon if empty.
            if (ii > 2 && aces[ii-3].length === 0) {
                tc = sc[ii-3].toLowerCase();
            }
            dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),tc,tmpw,co1,co2);
        }
    }

    // Card spread backings
    for (let ii=0;ii<7;ii++) {
        dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy)*6,'',tmpw,co1,co2);
    }

    // --- Draw all active cards on top of the backings ---

    // Deck card (back)
    if (deck.length > 0) {
        dcd(can,(0*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),'b1',tmpw,co1,co2);
    }
    // Pile card (top card)
    if (pile.length > 0) {
        dcd(can,(1*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),pile[pile.length-1],tmpw,co1,co2);
    }
    // Aces cards
    for (let i = 0; i < 4; i++) {
        if (aces[i].length > 0) {
            dcd(can,((i+3)*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy),aces[i][aces[i].length-1],tmpw,co1,co2);
        }
    }

    // Card spread cards
    for (let ii=0;ii<7;ii++) {
        for (let i=0;i<sprd[ii].length;i++) {
            let crd=sprd[ii][i];
            if (crd){
                let cardFace = crd.startsWith('x') ? 'b1' : crd;
                dcd(can,(ii*(tmpw+(tmpw/xxx)))+(tmpw/xxx),(bw/yy)*(i+6),cardFace,tmpw,co1,co2);
            }
        }
    }
}

function autoFlipCards() {
    if (!autoFlip) return;
    for (let i = 0; i < 7; i++) {
        const pileId = 'sprd' + i;
        const pileCards = masterDeck.filter(c => c.pile === pileId);
        if (pileCards.length > 0) {
            const topCard = pileCards.sort((a,b)=>b.order-a.order)[0];
            if (!topCard.faceUp) {
                topCard.faceUp = true;
            }
        }
    }
}

function vrButtonHandler(buttonIndex, isPressed, intersection, handedness) {
    if (buttonIndex === 4) { // A/X buttons
        if (isPressed) {
            if (intersection) {
                clkd({ preventDefault: () => {}, stopPropagation: () => {} }, intersection.local);
            }
        } else {
            // On release, we don't necessarily need an intersection, the game logic handles the drop.
            clku({ preventDefault: () => {}, stopPropagation: () => {} }, intersection ? intersection.local : null);
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
    get cardHeight() { return this.cardWidth * 1.5 * this.boardAspectRatio; },
    get xSpacing() { return this.cardWidth * 1.15; },
    get ySpacing() { return this.cardHeight * 0.2; },
    get totalWidth() { return 7 * this.xSpacing; },
    get startX() { return -this.totalWidth / 2 + (this.xSpacing/2); },
    topRowY: 0.6,
    get spreadStartY() { return this.topRowY - this.cardHeight - 0.1; }
};


function getCardAtIntersection(local) {
    if (!local) return null;

    const clickX = local[0];
    const clickY = local[1];
    const cardW = layout.cardWidth;
    const cardH = layout.cardHeight;

    // Create a list of all cards, sorted by visibility (top cards first)
    const tableauCards = masterDeck.filter(c => c.pile.startsWith('sprd')).sort((a,b) => b.order - a.order);
    const topRowCards = masterDeck.filter(c => !c.pile.startsWith('sprd') && c.pile !== 'flow').sort((a,b) => b.order - a.order);
    const sortedCards = [...tableauCards, ...topRowCards];

    for (const card of sortedCards) {
        let x, y;
        let pileIndex;

        // Calculate card's 3D position
        if (card.pile.startsWith('sprd')) {
            pileIndex = parseInt(card.pile.substring(4));
            x = layout.startX + pileIndex * layout.xSpacing;
            y = layout.spreadStartY - card.order * layout.ySpacing;
        } else if (card.pile.startsWith('aces')) {
            pileIndex = parseInt(card.pile.substring(4));
            x = layout.startX + (3 + pileIndex) * layout.xSpacing;
            y = layout.topRowY;
        } else if (card.pile === 'pile') {
            x = layout.startX + layout.xSpacing;
            y = layout.topRowY;
        } else if (card.pile === 'deck') {
            x = layout.startX;
            y = layout.topRowY;
        } else {
            continue; // Card is in a flow pile or somewhere else not on the board.
        }

        // Bounding box check
        const x1 = x - cardW / 2;
        const x2 = x + cardW / 2;
        const y1 = y - cardH / 2;
        const y2 = y + cardH / 2;

        if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
            // For spread piles, check the exposed area, as cards overlap.
            if (card.pile.startsWith('sprd')) {
                const cardsInPile = masterDeck.filter(c => c.pile === card.pile);
                const isTopCardInStack = card.order === cardsInPile.length - 1;
                const topOfCard = y + cardH / 2;
                const bottomOfCard = isTopCardInStack ? (y - cardH / 2) : (y + cardH / 2 - layout.ySpacing);
                if (clickY > bottomOfCard && clickY < topOfCard) {
                    return { type: 'card', card: card };
                }
            } else { // For top-row piles, no overlap logic needed.
                 return { type: 'card', card: card };
            }
        }
    }

    // If no card was hit, check for empty pile locations
    // Deck
    if (masterDeck.filter(c => c.pile === 'deck').length === 0) {
        const deckX = layout.startX;
        const topY = layout.topRowY;
        if (clickX > deckX - cardW/2 && clickX < deckX + cardW/2 && clickY > topY - cardH/2 && clickY < topY + cardH/2) {
            return { type: 'pile', pileId: 'deck' };
        }
    }
    // Aces
    for (let i = 0; i < 4; i++) {
        const pileId = 'aces' + i;
        if (masterDeck.filter(c => c.pile === pileId).length === 0) {
            const xPos = layout.startX + (3 + i) * layout.xSpacing;
            const yPos = layout.topRowY;
            if (clickX > xPos - cardW/2 && clickX < xPos + cardW/2 && clickY > yPos - cardH/2 && clickY < yPos + cardH/2) {
                return { type: 'pile', pileId: pileId };
            }
        }
    }
    // Spread
    for (let i = 0; i < 7; i++) {
        const pileId = 'sprd' + i;
        if (masterDeck.filter(c => c.pile === pileId).length === 0) {
            const xPos = layout.startX + i * layout.xSpacing;
            const yPos = layout.spreadStartY;
            if (clickX > xPos - cardW/2 && clickX < xPos + cardW/2 && clickY > yPos - cardH/2 && clickY < yPos + cardH/2) {
                return { type: 'pile', pileId: pileId };
            }
        }
    }

    return null;
}

function rebuildLegacyArrays() {
    deck = masterDeck.filter(c => c.pile === 'deck').sort((a,b) => a.order - b.order).map(c => c.id);
    sprd = [];
    for (let i = 0; i < 7; i++) {
        const pileCards = masterDeck.filter(c => c.pile === 'sprd' + i).sort((a, b) => a.order - b.order).map(c => c.faceUp ? c.id : 'x' + c.id);
        sprd.push(pileCards);
    }
    aces = [];
    for (let i = 0; i < 4; i++) {
        const pileCards = masterDeck.filter(c => c.pile === 'aces' + i).sort((a, b) => a.order - b.order).map(c => c.id);
        aces.push(pileCards);
    }
    pile = masterDeck.filter(c => c.pile === 'pile').sort((a, b) => a.order - b.order).map(c => c.id);
    flow = masterDeck.filter(c => c.pile === 'flow').sort((a, b) => a.order - b.order).map(c => c.id);
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
    const backingZ = -gCardDepth * 2;

    const drawCard = (cardFace, x, y, z) => {
        const cardModelMatrix = glMatrix.mat4.create();
        const canvasMatrix = getCanvasModelMatrix();
        glMatrix.mat4.translate(cardModelMatrix, canvasMatrix, [x, y, z]);
        glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [layout.cardWidth, layout.cardHeight, gCardDepth]);
        drawCardWithMatrix(gl, programs, buffers, cardFace, cardModelMatrix, view);
    };

    // --- Draw all backings first ---
    // Deck and Pile backings
    drawCard('', layout.startX, layout.topRowY, backingZ);
    drawCard('', layout.startX + layout.xSpacing, layout.topRowY, backingZ);

    // Aces backings
    for (let i = 0; i < 4; i++) {
        const xPos = layout.startX + (3 + i) * layout.xSpacing;
        drawCard(sc[i].toLowerCase(), xPos, layout.topRowY, backingZ);
    }

    // Spread backings
    for (let i = 0; i < 7; i++) {
        const xPos = layout.startX + i * layout.xSpacing;
        const yPos = layout.spreadStartY;
        drawCard('', xPos, yPos, backingZ);
    }

    // --- Draw all active cards with pile-specific logic ---
    const pileTypes = ['deck', 'pile', ...Array.from({length: 4}, (_, i) => 'aces' + i), ...Array.from({length: 7}, (_, i) => 'sprd' + i)];

    pileTypes.forEach(pileId => {
        const pileCards = masterDeck.filter(c => c.pile === pileId).sort((a,b) => a.order - b.order);
        pileCards.forEach((card, indexInPile) => {
            const cardFace = card.faceUp ? card.id : 'b1';
            let x, y, z;

            if (pileId.startsWith('sprd')) {
                const pileIndex = parseInt(pileId.substring(4));
                x = layout.startX + pileIndex * layout.xSpacing;
                y = layout.spreadStartY - indexInPile * layout.ySpacing;
                z = indexInPile * gCardDepth;
            } else if (pileId.startsWith('aces')) {
                const pileIndex = parseInt(pileId.substring(4));
                x = layout.startX + (3 + pileIndex) * layout.xSpacing;
                y = layout.topRowY;
                z = indexInPile * gCardDepth;
            } else if (pileId === 'deck') {
                x = layout.startX;
                y = layout.topRowY;
                z = indexInPile * gCardDepth;
            } else if (pileId === 'pile') {
                x = layout.startX + layout.xSpacing;
                y = layout.topRowY;
                z = indexInPile * gCardDepth;
            }
            drawCard(cardFace, x, y, z);
        });
    });

    // Draw Flowing (dragged) cards
    if (drag && vrIntersection) {
        const flowCards = masterDeck.filter(c => c.pile === 'flow');
        if (flowCards.length > 0) {
            const yOffset = ((flowCards.length - 1) * layout.ySpacing) / 2;
            flowCards.sort((a,b)=>a.originalOrder-b.originalOrder).forEach((card, i) => {
                const cardFace = card.faceUp ? card.id : 'b1';
                const cardModelMatrix = glMatrix.mat4.clone(getCanvasModelMatrix());

                // Position the card at the intersection point on the board plane, with an offset.
                const x = vrIntersection.local[0];
                let y = vrIntersection.local[1] + yOffset;
                const z = 0.18 + (i * gCardDepth * 1.1); // Pull forward just below cursor and stack tightly

                // Add a cascade effect for the stack
                y -= i * layout.ySpacing;

                glMatrix.mat4.translate(cardModelMatrix, cardModelMatrix, [x, y, z]);
                glMatrix.mat4.scale(cardModelMatrix, cardModelMatrix, [layout.cardWidth, layout.cardHeight, gCardDepth]);
                drawCardWithMatrix(gl, programs, buffers, cardFace, cardModelMatrix, view);
            });
        }
    }
    // Highlighting
    if (vrIntersection && !drag) {
        const hit = getCardAtIntersection(vrIntersection.local);
        if (hit && hit.type === 'card') {
            const cardToHighlight = hit.card;
            let x, y, z;
            let pileIndex;

            // Calculate card's 3D position
            if (cardToHighlight.pile.startsWith('sprd')) {
                pileIndex = parseInt(cardToHighlight.pile.substring(4));
                x = layout.startX + pileIndex * layout.xSpacing;
                y = layout.spreadStartY - cardToHighlight.order * layout.ySpacing;
                z = cardToHighlight.order * gCardDepth;
            } else if (cardToHighlight.pile.startsWith('aces')) {
                pileIndex = parseInt(cardToHighlight.pile.substring(4));
                x = layout.startX + (3 + pileIndex) * layout.xSpacing;
                y = layout.topRowY;
                z = cardToHighlight.order * gCardDepth;
            } else if (cardToHighlight.pile === 'pile') {
                x = layout.startX + layout.xSpacing;
                y = layout.topRowY;
                z = cardToHighlight.order * gCardDepth;
            } else if (cardToHighlight.pile === 'deck') {
                x = layout.startX;
                y = layout.topRowY;
                z = cardToHighlight.order * gCardDepth;
            }

            if (x !== undefined) {
                const markerMatrix = glMatrix.mat4.create();
                glMatrix.mat4.translate(markerMatrix, getCanvasModelMatrix(), [x, y, z + gCardDepth]);
                glMatrix.mat4.scale(markerMatrix, markerMatrix, [layout.cardWidth + 0.01, layout.cardHeight + 0.01, gCardDepth]);
                drawSolid(gl, solidColorProgramInfo, card, markerMatrix, view, [1.0, 1.0, 0.0, 0.5]); // Transparent yellow
            }
        }
    }
}


// --- VR/AR Bootstrap ---

document.getElementById("btn-vr").onclick = () => {
    // Clear the cache before starting a new VR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleVR(drawSolitaire, xx, yy, 7/5, draw, vrButtonHandler);
};
document.getElementById("btn-xr").onclick = () => {
    // Clear the cache before starting a new AR session
    for (const key in cardTextureCache) {
        delete cardTextureCache[key];
    }
    toggleAR(drawSolitaire, xx, yy, 7/5, draw, vrButtonHandler);
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
