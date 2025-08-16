function generatePuzzle(options) {
    // Default options
    const defaults = {
        wdh: 4,
        hgt: 4,
        mov: 2,
        rot: 1,
        clr: 5,
        pct: 55,
        pnt: -1,
        rat: 0
    };

    const settings = { ...defaults, ...options };

    let { wdh, hgt, mov, rot, clr, pct, pnt, rat } = settings;

    // Validation from PHP
    if (wdh < 3 || wdh > 40) { wdh = 4; }
    if (hgt < 3 || hgt > 40) { hgt = 4; }
    if (mov < 2 || mov > 4) { mov = 2; }
    if (rot < 0 || rot > 3) { rot = 1; }
    if (clr < 2 || clr > 9) { clr = 3; }
    if (pct < 20 || pct > 80) { pct = 55; }
    if (pnt < 0 || pnt > 9) { pnt = -1; }

    const maxx = [0, 1, 2, 1, 2, 1, 1, 1, 0];
    let grid = [];
    const colStr = 'grybvcplei';
    const col = colStr.substring(0, clr + 1);
    const xx = wdh;
    const yy = hgt;

    // Create start pos
    let sx = Math.floor(Math.random() * xx);
    let sy = Math.floor(Math.random() * yy);
    let sc = '';
    sc += sx > 0 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0';
    sc += sy > 0 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0';
    sc += sx < xx - 1 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0';
    sc += sy < yy - 1 ? col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1) : '0';

    let mo = '2';
    let ro = '0';

    grid = Array(xx).fill(null).map(() => Array(yy).fill(null));

    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            grid[x][y] = (x === sx && y === sy) ? (mo + ro + sc) : '000000';
        }
    }

    let unsort = [mo + ro + '-' + sx + '-' + sy];
    let prx = sx;
    let pry = sy;

    let max;
    if (pnt === -1) {
        max = (xx < maxx.length) ? maxx[xx] : 0;
    } else {
        max = pnt;
    }

    let mp = 0;
    let rew = [[], []];
    let pc = (xx * yy) * (pct / 100);

    for (let i = 1; i < pc; i++) {
        let pm = posmov(sx, sy, xx, yy, grid);
        if (pm.length === 0) {
            while (pm.length > 3 || pm.length < 1) {
                if(rew[0].length < 3) break;
                let tmp = Math.floor(Math.random() * (rew[0].length - 2)) + 1;
                sx = rew[0][tmp];
                sy = rew[1][tmp];
                pm = posmov(sx, sy, xx, yy, grid);
            }
        }

        if (pm.length > 0) {
            pm = pm.charAt(Math.floor(Math.random() * pm.length));
            if (mp < max) {
                mo = (Math.floor(Math.random() * mov) + 1).toString();
            } else {
                mo = (Math.floor(Math.random() * (mov - 1)) + 2).toString();
            }
            if (mo === '1') { mp++; }
            ro = Math.floor(Math.random() * (rot + 1)).toString();

            if (pm === 'L') { sx--; }
            if (pm === 'U') { sy--; }
            if (pm === 'R') { sx++; }
            if (pm === 'D') { sy++; }

            rew[0].push(sx);
            rew[1].push(sy);
            grid[sx][sy] = mo + ro + gentag(sx, sy, xx, yy, grid, col);
            unsort.push(mo + ro + '-' + sx + '-' + sy);
        }
    }

    let empty = [];
    // Clear unneeded tags
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            if (grid[x][y].substring(0, 1) === '0') {
                empty.push(x + 'x' + y);
                let tmp = fdwall(x, y, xx, yy, grid);
                if (tmp.includes('D')) {
                    let t1 = grid[x][y + 1].substring(0, 3);
                    let t2 = grid[x][y + 1].substring(4);
                    grid[x][y + 1] = t1 + '0' + t2;
                }
                if (tmp.includes('U')) {
                    let t1 = grid[x][y - 1].substring(0, 5);
                    grid[x][y - 1] = t1 + '0';
                }
                if (tmp.includes('L')) {
                    let t1 = grid[x - 1][y].substring(0, 4);
                    let t2 = grid[x - 1][y].substring(5);
                    grid[x - 1][y] = t1 + '0' + t2;
                }
                if (tmp.includes('R')) {
                    let t1 = grid[x + 1][y].substring(0, 2);
                    let t2 = grid[x + 1][y].substring(3);
                    grid[x + 1][y] = t1 + '0' + t2;
                }
            }
        }
    }

    // Fix: if nothing to flip, make rotate
    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            if (grid[x][y].substring(1, 2) === '2') {
                let uz = grid[x][y].substring(3, 4);
                let dz = grid[x][y].substring(5, 6);
                if (dz === uz) {
                    grid[x][y] = grid[x][y].substring(0, 1) + '1' + grid[x][y].substring(2);
                }
            }
            if (grid[x][y].substring(1, 2) === '3') {
                let lz = grid[x][y].substring(2, 3);
                let rz = grid[x][y].substring(4, 5);
                if (lz === rz) {
                    grid[x][y] = grid[x][y].substring(0, 1) + '1' + grid[x][y].substring(2);
                }
            }
        }
    }

    unsort.sort();

    // Shuffle objects
    for (const tmp of unsort) {
        const ta = tmp.split('-');
        const [x, y] = [parseInt(ta[1]), parseInt(ta[2])];
        let tt = grid[x][y];

        // ROTATE
        if (tt.substring(1, 2) === '1') {
            for (let i = 1; i < Math.floor(Math.random() * 4) + 1; i++) {
                tt = grid[x][y];
                grid[x][y] = tt.substring(0, 2) + tt.charAt(3) + tt.charAt(4) + tt.charAt(5) + tt.charAt(2);
            }
        }
        if (tt.substring(1, 2) === '2') {
            // flip UD
            if (Math.random() > 0.5) {
                tt = grid[x][y];
                grid[x][y] = tt.substring(0, 3) + tt.charAt(5) + tt.charAt(4) + tt.charAt(3);
            }
        }
        if (tt.substring(1, 2) === '3') {
            // flip LR
            if (Math.random() > 0.5) {
                tt = grid[x][y];
                grid[x][y] = tt.substring(0, 2) + tt.charAt(4) + tt.charAt(3) + tt.charAt(2) + tt.charAt(5);
            }
        }

        // SCRAMBLE
        const moveType = ta[0].substring(0, 1);
        if (moveType === '2') { // move anywhere free
            let rnd = Math.floor(Math.random() * empty.length);
            let tb = empty[rnd].split('x');
            grid[tb[0]][tb[1]] = grid[x][y];
            grid[x][y] = '000000';
            empty[rnd] = x + 'x' + y;
        }
        if (moveType === '3') { // move UD
            let tem = [];
            empty.forEach((e, nm) => {
                if (e.split('x')[0] === ta[1]) {
                    tem.push(e + 'x' + nm);
                }
            });
            if (tem.length) {
                let rnd = Math.floor(Math.random() * tem.length);
                let tb = tem[rnd].split('x');
                grid[tb[0]][tb[1]] = grid[x][y];
                grid[x][y] = '000000';
                empty[tb[2]] = x + 'x' + y;
            }
        }
        if (moveType === '4') { // move LR
            let tem = [];
            empty.forEach((e, nm) => {
                if (e.split('x')[1] === ta[2]) {
                    tem.push(e + 'x' + nm);
                }
            });

            if (tem.length) {
                let rnd = Math.floor(Math.random() * tem.length);
                let tb = tem[rnd].split('x');
                grid[tb[0]][tb[1]] = grid[x][y];
                grid[x][y] = '000000';
                empty[tb[2]] = x + 'x' + y;
            }
        }
    }

    const out = {
        col: col,
        xx: xx,
        yy: yy,
        grid: {}
    };

    for (let y = 0; y < yy; y++) {
        for (let x = 0; x < xx; x++) {
            out.grid[`grid[${x}][${y}]`] = grid[x][y];
        }
    }

    return out;
}

function gentag(px, py, xx, yy, grid, col) {
    let fp = '';
    // lf wall
    if (px > 0) {
        let c = col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1);
        let lf = grid[px - 1][py];
        fp += lf.substring(0, 1) === '0' ? c : lf.substring(4, 5);
    } else {
        fp += '0';
    }
    // up wall
    if (py > 0) {
        let c = col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1);
        let up = grid[px][py - 1];
        fp += up.substring(0, 1) === '0' ? c : up.substring(5, 6);
    } else {
        fp += '0';
    }
    // rt wall
    if (px < xx - 1) {
        let c = col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1);
        let rt = grid[px + 1][py];
        fp += rt.substring(0, 1) === '0' ? c : rt.substring(2, 3);
    } else {
        fp += '0';
    }
    // dn wall
    if (py < yy - 1) {
        let c = col.charAt(Math.floor(Math.random() * (col.length - 1)) + 1);
        let dn = grid[px][py + 1];
        fp += dn.substring(0, 1) === '0' ? c : dn.substring(3, 4);
    } else {
        fp += '0';
    }
    return fp;
}

function posmov(px, py, xx, yy, grid) {
    let fp = '';
    if (px > 0 && grid[px - 1][py].substring(0, 1) === '0') {
        fp += 'L';
    }
    if (py > 0 && grid[px][py - 1].substring(0, 1) === '0') {
        fp += 'U';
    }
    if (px < xx - 1 && grid[px + 1][py].substring(0, 1) === '0') {
        fp += 'R';
    }
    if (py < yy - 1 && grid[px][py + 1].substring(0, 1) === '0') {
        fp += 'D';
    }
    return fp;
}

function fdwall(px, py, xx, yy, grid) {
    let fp = '';
    if (px > 0) fp += 'L';
    if (py > 0) fp += 'U';
    if (px < xx - 1) fp += 'R';
    if (py < yy - 1) fp += 'D';
    return fp;
}
