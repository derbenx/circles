extends Node

# PuzzleGenerator Singleton
#
# This script is an autoloaded singleton responsible for generating the puzzle grids.
# Its logic is a direct translation of the original game's `gen.js` file to
# ensure the puzzles are generated with the same underlying rules and complexity.

var col_str = "grybvcplei"

# Helper function to find possible empty adjacent cells to move to.
func _posmov(px, py, xx, yy, grid):
    var fp = ""
    if px > 0 and grid[px - 1][py].begins_with("0"): fp += "L"
    if py > 0 and grid[px][py - 1].begins_with("0"): fp += "U"
    if px < xx - 1 and grid[px + 1][py].begins_with("0"): fp += "R"
    if py < yy - 1 and grid[px][py + 1].begins_with("0"): fp += "D"
    return fp

# Helper function to find adjacent grid cells, regardless of whether they are empty or not.
func _fdwall(px, py, xx, yy):
    var fp = ""
    if px > 0: fp += "L"
    if py > 0: fp += "U"
    if px < xx - 1: fp += "R"
    if py < yy - 1: fp += "D"
    return fp

# Helper function to generate the 4 color tags for a new piece based on its neighbors.
func _gentag(px, py, xx, yy, grid, col):
    var fp = ""
    # Left
    fp += col.substr(randi_range(1, col.length() - 1), 1) if px > 0 and grid[px - 1][py].begins_with("0") else grid[px - 1][py].substr(4, 1) if px > 0 else "0"
    # Up
    fp += col.substr(randi_range(1, col.length() - 1), 1) if py > 0 and grid[px][py - 1].begins_with("0") else grid[px][py - 1].substr(5, 1) if py > 0 else "0"
    # Right
    fp += col.substr(randi_range(1, col.length() - 1), 1) if px < xx - 1 and grid[px + 1][py].begins_with("0") else grid[px + 1][py].substr(2, 1) if px < xx - 1 else "0"
    # Down
    fp += col.substr(randi_range(1, col.length() - 1), 1) if py < yy - 1 and grid[px][py + 1].begins_with("0") else grid[px][py + 1].substr(3, 1) if py < yy - 1 else "0"
    return fp

func generate_puzzle(options: Dictionary):
    # The main public function. Takes a dictionary of settings and returns a
    # dictionary containing the generated puzzle data ("col", "xx", "yy", "grid").

    # --- Parameter Validation ---
    var wdh = options.get("wdh", 4)
    var hgt = options.get("hgt", 4)
    var mov = options.get("mov", 2)
    var rot = options.get("rot", 1)
    var clr = options.get("clr", 5)
    var pct = options.get("pct", 55)
    var pnt = options.get("pnt", -1)

    if wdh < 3 or wdh > 40: wdh = 4
    if hgt < 3 or hgt > 40: hgt = 4
    if mov < 2 or mov > 4: mov = 2
    if rot < 0 or rot > 3: rot = 1
    if clr < 2 or clr > 9: clr = 3
    if pct < 20 or pct > 80: pct = 55
    if pnt < 0 or pnt > 9: pnt = -1

    var col = col_str.substr(0, clr + 1)
    var xx = int(wdh)
    var yy = int(hgt)

    var grid = []
    for i in range(xx):
        grid.append([])
        for j in range(yy):
            grid[i].append("000000")

    # --- 1. Generate the Solved Path ---
    # Creates a random, winding path of connected pieces that are internally consistent.
    var sx = randi_range(0, xx - 1)
    var sy = randi_range(0, yy - 1)

    var current_mo = "2"
    var current_ro = "0"
    var sc = ""
    sc += col.substr(randi_range(1, col.length() - 1), 1) if sx > 0 else "0"
    sc += col.substr(randi_range(1, col.length() - 1), 1) if sy > 0 else "0"
    sc += col.substr(randi_range(1, col.length() - 1), 1) if sx < xx - 1 else "0"
    sc += col.substr(randi_range(1, col.length() - 1), 1) if sy < yy - 1 else "0"

    grid[sx][sy] = current_mo + current_ro + sc

    var unsort = [current_mo + current_ro + "-" + str(sx) + "-" + str(sy)]
    var rew = [[sx], [sy]]
    var max_fixed_points = pnt if pnt != -1 else 0 # Simplified from original for now
    var fixed_points_count = 0
    var path_length = int((xx * yy) * (float(pct) / 100.0))

    for i in range(1, path_length):
        var possible_moves = _posmov(sx, sy, xx, yy, grid)
        if possible_moves.length() == 0:
            var attempts = 0
            while (possible_moves.length() == 0 or possible_moves.length() == 4) and attempts < 50:
                if rew[0].size() < 3: break
                var rewind_index = randi_range(1, rew[0].size() - 2)
                sx = rew[0][rewind_index]
                sy = rew[1][rewind_index]
                possible_moves = _posmov(sx, sy, xx, yy, grid)
                attempts += 1

        if possible_moves.length() == 0:
            continue

        var move = possible_moves.substr(randi_range(0, possible_moves.length() - 1), 1)

        if fixed_points_count < max_fixed_points:
            current_mo = str(randi_range(1, mov))
        else:
            current_mo = str(randi_range(2, mov))

        if current_mo == "1":
            fixed_points_count += 1
        current_ro = str(randi() % (rot + 1))

        if move == "L": sx -= 1
        if move == "U": sy -= 1
        if move == "R": sx += 1
        if move == "D": sy += 1

        rew[0].append(sx)
        rew[1].append(sy)
        grid[sx][sy] = current_mo + current_ro + _gentag(sx, sy, xx, yy, grid, col)
        unsort.append(current_mo + current_ro + "-" + str(sx) + "-" + str(sy))

    # --- 2. Clear Unmatched Edges ---
    # This is a critical step for solvability. It finds all empty cells and
    # removes the corresponding connection tags from any adjacent pieces. This
    # ensures that no piece has a colored nub pointing into an empty space.
    var empty = []
    for y in range(yy):
        for x in range(xx):
            if grid[x][y].begins_with("0"):
                empty.append(str(x) + "x" + str(y))
                var neighbors = _fdwall(x, y, xx, yy)
                if neighbors.contains("D"):
                    var s = grid[x][y + 1]
                    grid[x][y + 1] = s.substr(0, 3) + "0" + s.substr(4)
                if neighbors.contains("U"):
                    var s = grid[x][y - 1]
                    grid[x][y - 1] = s.substr(0, 5) + "0"
                if neighbors.contains("L"):
                    var s = grid[x - 1][y]
                    grid[x - 1][y] = s.substr(0, 4) + "0" + s.substr(5)
                if neighbors.contains("R"):
                    var s = grid[x + 1][y]
                    grid[x + 1][y] = s.substr(0, 2) + "0" + s.substr(3)

    # --- 3. Fixup Rotations ---
    # A cleanup step. If a piece is flippable but has identical colors on
    # opposite sides, its flip function is useless. This changes it to a
    # standard rotational piece.
    for y in range(yy):
        for x in range(xx):
            if grid[x][y].substr(1, 1) == "2": # Flip U/D
                if grid[x][y].substr(3, 1) == grid[x][y].substr(5, 1):
                    grid[x][y] = grid[x][y].substr(0, 1) + "1" + grid[x][y].substr(2)
            if grid[x][y].substr(1, 1) == "3": # Flip L/R
                if grid[x][y].substr(2, 1) == grid[x][y].substr(4, 1):
                    grid[x][y] = grid[x][y].substr(0, 1) + "1" + grid[x][y].substr(2)

    # --- 4. Scramble the Puzzle ---
    # The puzzle is now solved but needs to be scrambled. This section iterates
    # through the generated path of pieces and randomly rotates/flips them
    # and swaps their positions with valid empty tiles.
    unsort.sort()
    for item in unsort:
        var parts = item.split("-")
        var x = int(parts[1])
        var y = int(parts[2])
        var piece = grid[x][y]

        var rotType = piece.substr(1, 1)
        if rotType == "1": # Rotate
            for i in range(randi() % 4):
                piece = grid[x][y]
                grid[x][y] = piece.substr(0, 2) + piece.substr(3, 1) + piece.substr(4, 1) + piece.substr(5, 1) + piece.substr(2, 1)
        if rotType == "2": # Flip UD
            if randf() > 0.5:
                piece = grid[x][y]
                grid[x][y] = piece.substr(0, 3) + piece.substr(5, 1) + piece.substr(4, 1) + piece.substr(3, 1)
        if rotType == "3": # Flip LR
            if randf() > 0.5:
                piece = grid[x][y]
                grid[x][y] = piece.substr(0, 2) + piece.substr(4, 1) + piece.substr(3, 1) + piece.substr(2, 1) + piece.substr(5, 1)

        var moveType = parts[0].substr(0, 1)
        if moveType == "2": # Move anywhere
            if not empty.is_empty():
                var rnd = randi() % empty.size()
                var ex = int(empty[rnd].split("x")[0])
                var ey = int(empty[rnd].split("x")[1])
                grid[ex][ey] = grid[x][y]
                grid[x][y] = "000000"
                empty[rnd] = str(x) + "x" + str(y)
        elif moveType == "3": # Move UD
            var same_col = []
            for i in range(empty.size()):
                if empty[i].begins_with(str(x) + "x"):
                    same_col.append(i)
            if not same_col.is_empty():
                var rnd_idx = same_col[randi() % same_col.size()]
                var ex = int(empty[rnd_idx].split("x")[0])
                var ey = int(empty[rnd_idx].split("x")[1])
                grid[ex][ey] = grid[x][y]
                grid[x][y] = "000000"
                empty[rnd_idx] = str(x) + "x" + str(y)
        elif moveType == "4": # Move LR
            var same_row = []
            for i in range(empty.size()):
                if empty[i].ends_with("x" + str(y)):
                    same_row.append(i)
            if not same_row.is_empty():
                var rnd_idx = same_row[randi() % same_row.size()]
                var ex = int(empty[rnd_idx].split("x")[0])
                var ey = int(empty[rnd_idx].split("x")[1])
                grid[ex][ey] = grid[x][y]
                grid[x][y] = "000000"
                empty[rnd_idx] = str(x) + "x" + str(y)

    # --- 5. Final Output ---
    # Packages the generated data into a dictionary for the GameManager.
    var out = {
        "col": col,
        "xx": xx,
        "yy": yy,
        "grid": grid
    }
    return out
