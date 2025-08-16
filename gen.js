/**
 * This file contains the logic for generating a new puzzle.
 * It is a direct translation of the original gen.php file, with added comments
 * to clarify the logic and ensure correctness.
 */

/**
 * Generates a puzzle based on the provided options.
 * @param {object} options - The settings for the puzzle generation.
 * @returns {object} The generated puzzle data.
 */
function generatePuzzle(options) {
    // Default options, mimicking the original PHP defaults.
    const defaults = {
        wdh: 4, hgt: 4, mov: 2, rot: 1, clr: 5, pct: 55, pnt: -1, rat: 0
    };
    const settings = { ...defaults, ...options };

    let { wdh, hgt, mov, rot, clr, pct, pnt } = settings;

    // --- Parameter Validation ---
    // Ensures the settings are within the allowed ranges.
    if (wdh < 3 || wdh > 40) { wdh = 4; }
    if (hgt < 3 || hgt > 40) { hgt = 4; }
    if (mov < 2 || mov > 4) { mov = 2; }
    if (rot < 0 || rot > 3) { rot = 1; }
    if (clr < 2 || clr > 9) { clr = 3; }
    if (pct < 20 || pct > 80) { pct = 55; }
    if (pnt < 0 || pnt > 9) { pnt = -1; }

    const maxx = [0, 1, 2, 1, 2, 1, 1, 1, 0];
    const colStr = 'grybvcplei';
    const col = colStr.substring(0, clr + 1);
    const xx = parseInt(wdh);
    const yy = parseInt(hgt);

    let grid = Array(xx).fill(null).map(() => Array(yy).fill('000000'));

    // --- 1. Generate the Solved Path ---
    // This section creates a random path of pieces, ensuring they are all connected.
    // At this stage, the colors are internally consistent along the path.

    // Create a random starting position.
    let sx = Math.floor(Math.random() * xx);
    let sy = Math.floor(Math.random() * yy);

    // Initial piece properties.
    let current_mo = '2'; // move type
    let current_ro = '0'; // rotation type

    // Generate initial color tags for the starting piece.
    // These are random for now and will be cleaned up later if they border empty space.
    let sc = '';
    sc += sx > 0 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0'; // L
    sc += sy > 0 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0'; // U
    sc += sx < xx - 1 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0'; // R
    sc += sy < yy - 1 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0'; // D

    grid[sx][sy] = current_mo + current_ro + sc;

    let unsort = [current_mo + current_ro + '-' + sx + '-' + sy];
    let rew = [[sx], [sy]]; // Keep track of coordinates for the rewind logic.

    let max_fixed_points;
    if (pnt === -1) {
        max_fixed_points = (xx < maxx.length) ? maxx[xx] : 0;
    } else {
        max_fixed_points = pnt;
    }

    let fixed_points_count = 0;
    const path_length = (xx * yy) * (pct / 100);

    for (let i = 1; i < path_length; i++) {
        let possible_moves = posmov(sx, sy, xx, yy, grid);

        // If the path gets stuck, rewind to a previous random point to continue.
        if (possible_moves.length === 0) {
            let attempts = 0;
            while (possible_moves.length === 0 && attempts < 10) {
                if (rew[0].length < 2) break;
                const rewind_index = Math.floor(Math.random() * (rew[0].length - 1)) + 1;
                sx = rew[0][rewind_index];
                sy = rew[1][rewind_index];
                possible_moves = posmov(sx, sy, xx, yy, grid);
                attempts++;
            }
            if (possible_moves.length === 0) continue; // Skip if still stuck.
        }

        const move = possible_moves.charAt(Math.floor(Math.random() * possible_moves.length));

        if (fixed_points_count < max_fixed_points) {
            current_mo = (Math.floor(Math.random() * mov) + 1).toString();
        } else {
            current_mo = (Math.floor(Math.random() * (mov - 1)) + 2).toString();
        }
        if (current_mo === '1') {
            fixed_points_count++;
        }
        current_ro = (Math.floor(Math.random() * (rot + 1))).toString();

        // Move to the new position
        if (move === 'L') { sx--; }
        if (move === 'U') { sy--; }
        if (move === 'R') { sx++; }
        if (move === 'D') { sy++; }

        rew[0].push(sx);
        rew[1].push(sy);
        grid[sx][sy] = current_mo + current_ro + gentag(sx, sy, xx, yy, grid, col);
        unsort.push(current_mo + current_ro + '-' + sx + '-' + sy);
    }

    // --- 2. Clear Unmatched Edges ---
    // This is the critical step to ensure solvability. It iterates over all EMPTY
    // cells and clears the color tags of any adjacent pieces that point towards
    // the empty cell. This guarantees that every colored edge has a matching pair.
    let empty = [];
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            if (grid[x][y].substring(0, 1) === '0') {
                empty.push(x + 'x' + y);
                let neighbors = fdwall(x, y, xx, yy);

                // Neighbor Below (D) exists, so clear its UP tag.
                if (neighbors.includes('D')) {
                    const s = grid[x][y + 1];
                    if (s.substring(0, 1) !== '0') {
                        grid[x][y + 1] = s.substring(0, 3) + '0' + s.substring(4);
                    }
                }
                // Neighbor Above (U) exists, so clear its DOWN tag.
                if (neighbors.includes('U')) {
                    const s = grid[x][y - 1];
                    if (s.substring(0, 1) !== '0') {
                        grid[x][y - 1] = s.substring(0, 5) + '0';
                    }
                }
                // Neighbor Left (L) exists, so clear its RIGHT tag.
                if (neighbors.includes('L')) {
                    const s = grid[x - 1][y];
                    if (s.substring(0, 1) !== '0') {
                        grid[x - 1][y] = s.substring(0, 4) + '0' + s.substring(5);
                    }
                }
                // Neighbor Right (R) exists, so clear its LEFT tag.
                if (neighbors.includes('R')) {
                    const s = grid[x + 1][y];
                    if (s.substring(0, 1) !== '0') {
                        grid[x + 1][y] = s.substring(0, 2) + '0' + s.substring(3);
                    }
                }
            }
        }
    }

    // --- 3. Fixup Rotations ---
    // If a piece has a flip-type rotation but its opposite sides are the same,
    // it can't be flipped. Change it to a simple rotation piece.
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            if (grid[x][y].substring(1, 2) === '2') { // Flip U/D
                if (grid[x][y].substring(3, 4) === grid[x][y].substring(5, 6)) {
                    grid[x][y] = grid[x][y].substring(0, 1) + '1' + grid[x][y].substring(2);
                }
            }
            if (grid[x][y].substring(1, 2) === '3') { // Flip L/R
                if (grid[x][y].substring(2, 3) === grid[x][y].substring(4, 5)) {
                    grid[x][y] = grid[x][y].substring(0, 1) + '1' + grid[x][y].substring(2);
                }
            }
        }
    }

    // --- 4. Scramble the Puzzle (SKIPPED) ---
    // As requested, the scrambling and rotation step is skipped for debugging.
    /*
    unsort.sort();

    for (const item of unsort) {
        const parts = item.split('-');
        const [x, y] = [parseInt(parts[1]), parseInt(parts[2])];
        let piece = grid[x][y];

        // ROTATE/FLIP the piece randomly based on its type.
        const rotType = piece.substring(1, 2);
        if (rotType === '1') { // Rotate
            for (let i = 0; i < Math.floor(Math.random() * 4); i++) {
                piece = grid[x][y];
                grid[x][y] = piece.substring(0, 2) + piece.charAt(3) + piece.charAt(4) + piece.charAt(5) + piece.charAt(2);
            }
        }
        if (rotType === '2') { // Flip UD
            if (Math.random() > 0.5) {
                piece = grid[x][y];
                grid[x][y] = piece.substring(0, 3) + piece.charAt(5) + piece.charAt(4) + piece.charAt(3);
            }
        }
        if (rotType === '3') { // Flip LR
            if (Math.random() > 0.5) {
                piece = grid[x][y];
                grid[x][y] = piece.substring(0, 2) + piece.charAt(4) + piece.charAt(3) + piece.charAt(2) + piece.charAt(5);
            }
        }

        // SCRAMBLE piece positions by swapping with empty tiles.
        const moveType = parts[0].substring(0, 1);
        if (moveType === '2') { // Move anywhere
            if (empty.length > 0) {
                const rnd = Math.floor(Math.random() * empty.length);
                const [ex, ey] = empty[rnd].split('x');
                grid[ex][ey] = grid[x][y];
                grid[x][y] = '000000';
                empty[rnd] = x + 'x' + y;
            }
        } else if (moveType === '3') { // Move UD
            const sameCol = empty.map((e, i) => e.startsWith(x + 'x') ? i : -1).filter(i => i !== -1);
            if (sameCol.length > 0) {
                const rnd_idx = sameCol[Math.floor(Math.random() * sameCol.length)];
                const [ex, ey] = empty[rnd_idx].split('x');
                grid[ex][ey] = grid[x][y];
                grid[x][y] = '000000';
                empty[rnd_idx] = x + 'x' + y;
            }
        } else if (moveType === '4') { // Move LR
            const sameRow = empty.map((e, i) => e.endsWith('x' + y) ? i : -1).filter(i => i !== -1);
            if (sameRow.length > 0) {
                const rnd_idx = sameRow[Math.floor(Math.random() * sameRow.length)];
                const [ex, ey] = empty[rnd_idx].split('x');
                grid[ex][ey] = grid[x][y];
                grid[x][y] = '000000';
                empty[rnd_idx] = x + 'x' + y;
            }
        }
    }
    */

    // --- 5. Final Output ---
    const out = { col: col, xx: xx, yy: yy, grid: {} };
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            out.grid[`grid[${x}][${y}]`] = grid[x][y];
        }
    }
    return out;
}


// --- Helper Functions (Direct translations from PHP) ---

/**
 * Generates the 4 color tags for a new piece based on its neighbors.
 * If a neighbor is a piece, it copies the color to match.
 * If a neighbor is empty, it assigns a random color (which gets cleaned up later).
 */
function gentag(px, py, xx, yy, grid, col) {
    let fp = '';
    // Left
    fp += (px > 0) ? (grid[px - 1][py].startsWith('0') ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : grid[px - 1][py].substring(4, 5)) : '0';
    // Up
    fp += (py > 0) ? (grid[px][py - 1].startsWith('0') ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : grid[px][py - 1].substring(5, 6)) : '0';
    // Right
    fp += (px < xx - 1) ? (grid[px + 1][py].startsWith('0') ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : grid[px + 1][py].substring(2, 3)) : '0';
    // Down
    fp += (py < yy - 1) ? (grid[px][py + 1].startsWith('0') ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : grid[px][py + 1].substring(3, 4)) : '0';
    return fp;
}

/**
 * Finds possible empty adjacent cells to move to.
 */
function posmov(px, py, xx, yy, grid) {
    let fp = '';
    if (px > 0 && grid[px - 1][py].startsWith('0')) fp += 'L';
    if (py > 0 && grid[px][py - 1].startsWith('0')) fp += 'U';
    if (px < xx - 1 && grid[px + 1][py].startsWith('0')) fp += 'R';
    if (py < yy - 1 && grid[px][py + 1].startsWith('0')) fp += 'D';
    return fp;
}

/**
 * Finds adjacent grid cells, regardless of whether they are empty or not.
 */
function fdwall(px, py, xx, yy) {
    let fp = '';
    if (px > 0) fp += 'L';
    if (py > 0) fp += 'U';
    if (px < xx - 1) fp += 'R';
    if (py < yy - 1) fp += 'D';
    return fp;
}
