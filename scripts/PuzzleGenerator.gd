# PuzzleGenerator.gd
# This script is a direct translation of the puzzle generation logic from the original gen.js file.
# It creates a solvable puzzle grid based on the provided options.

class_name PuzzleGenerator
extends RefCounted

# Static function to generate a puzzle.
# It doesn't need an instance of the class to be called.
static func generate_puzzle(options: Dictionary) -> Dictionary:
	randomize()

	# --- Default options ---
	var settings: Dictionary = {
		"wdh": 4, "hgt": 4, "mov": 2, "rot": 1, "clr": 5, "pct": 55, "pnt": -1, "rat": 0
	}
	settings.merge(options, true) # Overwrite defaults with provided options

	# --- Parameter Validation ---
	var wdh: int = settings["wdh"]
	var hgt: int = settings["hgt"]
	var mov: int = settings["mov"]
	var rot: int = settings["rot"]
	var clr: int = settings["clr"]
	var pct: int = settings["pct"]
	var pnt: int = settings["pnt"]

	if wdh < 3 or wdh > 40: wdh = 4
	if hgt < 3 or hgt > 40: hgt = 4
	if mov < 2 or mov > 4: mov = 2
	if rot < 0 or rot > 3: rot = 1
	if clr < 2 or clr > 9: clr = 3
	if pct < 20 or pct > 80: pct = 55
	if pnt < 0 or pnt > 9: pnt = -1

	const COL_STR = "grybvcplei"
	var col = COL_STR.substr(0, clr + 1)
	var xx = wdh
	var yy = hgt

	# --- Create the grid ---
	var grid: Array = []
	for i in range(xx):
		grid.append([])
		for j in range(yy):
			grid[i].append("000000")

	# --- 1. Generate the Solved Path ---
	var sx = randi() % xx
	var sy = randi() % yy

	var current_mo = "2"
	var current_ro = "0"

	var sc = ""
	sc += col.substr(randi() % (col.length() - 1) + 1, 1) if sx > 0 else "0"
	sc += col.substr(randi() % (col.length() - 1) + 1, 1) if sy > 0 else "0"
	sc += col.substr(randi() % (col.length() - 1) + 1, 1) if sx < xx - 1 else "0"
	sc += col.substr(randi() % (col.length() - 1) + 1, 1) if sy < yy - 1 else "0"

	grid[sx][sy] = current_mo + current_ro + sc

	var unsort: Array = [current_mo + current_ro + "-" + str(sx) + "-" + str(sy)]
	var rew: Array = [[sx], [sy]]

	var max_fixed_points = pnt
	if pnt == -1:
		const MAXX = [0, 1, 2, 1, 2, 1, 1, 1, 0]
		max_fixed_points = MAXX[xx] if xx < MAXX.size() else 0

	var fixed_points_count = 0
	var path_length = int((xx * yy) * (pct / 100.0))

	for i in range(1, path_length):
		var possible_moves = _posmov(sx, sy, xx, yy, grid)

		if possible_moves.length() == 0:
			var attempts = 0
			while (possible_moves.length() == 0 or possible_moves.length() == 4) and attempts < 50:
				if rew[0].size() < 3: break
				var rewind_index = randi() % (rew[0].size() - 2) + 1
				sx = rew[0][rewind_index]
				sy = rew[1][rewind_index]
				possible_moves = _posmov(sx, sy, xx, yy, grid)
				attempts += 1

		if possible_moves.length() == 0:
			continue

		var move = possible_moves[randi() % possible_moves.length()]

		if fixed_points_count < max_fixed_points:
			current_mo = str(randi() % mov + 1)
		else:
			current_mo = str(randi() % (mov - 1) + 2)

		if current_mo == "1":
			fixed_points_count += 1

		current_ro = str(randi() % (rot + 1))

		if move == "L": sx -= 1
		if move == "U": sy -= 1
		if move == "R": sx += 1
		if move == "D": sy += 1

		rew[0].push_back(sx)
		rew[1].push_back(sy)
		grid[sx][sy] = current_mo + current_ro + _gentag(sx, sy, xx, yy, grid, col)
		unsort.push_back(current_mo + current_ro + "-" + str(sx) + "-" + str(sy))

	# --- 2. Clear Unmatched Edges ---
	var empty: Array = []
	for y in range(yy):
		for x in range(xx):
			if grid[x][y].begins_with("0"):
				empty.push_back(str(x) + "x" + str(y))
				var neighbors = _fdwall(x, y, xx, yy)

				if "D" in neighbors:
					var s = grid[x][y + 1]
					grid[x][y + 1] = s.substr(0, 3) + "0" + s.substr(4)
				if "U" in neighbors:
					var s = grid[x][y - 1]
					grid[x][y - 1] = s.substr(0, 5) + "0"
				if "L" in neighbors:
					var s = grid[x - 1][y]
					grid[x - 1][y] = s.substr(0, 4) + "0" + s.substr(5)
				if "R" in neighbors:
					var s = grid[x + 1][y]
					grid[x + 1][y] = s.substr(0, 2) + "0" + s.substr(3)

	# --- 3. Fixup Rotations ---
	for y in range(yy):
		for x in range(xx):
			if grid[x][y].substr(1, 1) == "2": # Flip U/D
				if grid[x][y].substr(3, 1) == grid[x][y].substr(5, 1):
					grid[x][y] = grid[x][y].substr(0, 1) + "1" + grid[x][y].substr(2)
			if grid[x][y].substr(1, 1) == "3": # Flip L/R
				if grid[x][y].substr(2, 1) == grid[x][y].substr(4, 1):
					grid[x][y] = grid[x][y].substr(0, 1) + "1" + grid[x][y].substr(2)

	# --- 4. Scramble the Puzzle ---
	unsort.sort()

	for item in unsort:
		var parts = item.split("-")
		var x = int(parts[1])
		var y = int(parts[2])
		var piece = grid[x][y]

		# ROTATE/FLIP
		var rot_type = piece.substr(1, 1)
		if rot_type == "1": # Rotate
			for i in range(randi() % 4):
				piece = grid[x][y]
				grid[x][y] = piece.substr(0, 2) + piece[3] + piece[4] + piece[5] + piece[2]
		if rot_type == "2": # Flip UD
			if randf() > 0.5:
				piece = grid[x][y]
				grid[x][y] = piece.substr(0, 3) + piece[5] + piece[4] + piece[3]
		if rot_type == "3": # Flip LR
			if randf() > 0.5:
				piece = grid[x][y]
				grid[x][y] = piece.substr(0, 2) + piece[4] + piece[3] + piece[2] + piece[5]

		# SCRAMBLE position
		var move_type = parts[0].substr(0, 1)
		if move_type == "2": # Move anywhere
			if not empty.is_empty():
				var rnd = randi() % empty.size()
				var ex = int(empty[rnd].split("x")[0])
				var ey = int(empty[rnd].split("x")[1])
				grid[ex][ey] = grid[x][y]
				grid[x][y] = "000000"
				empty[rnd] = str(x) + "x" + str(y)
		elif move_type == "3": # Move UD
			var same_col: Array = []
			for i in range(empty.size()):
				if empty[i].begins_with(str(x) + "x"):
					same_col.push_back(i)
			if not same_col.is_empty():
				var rnd_idx = same_col[randi() % same_col.size()]
				var ex = int(empty[rnd_idx].split("x")[0])
				var ey = int(empty[rnd_idx].split("x")[1])
				grid[ex][ey] = grid[x][y]
				grid[x][y] = "000000"
				empty[rnd_idx] = str(x) + "x" + str(y)
		elif move_type == "4": # Move LR
			var same_row: Array = []
			for i in range(empty.size()):
				if empty[i].ends_with("x" + str(y)):
					same_row.push_back(i)
			if not same_row.is_empty():
				var rnd_idx = same_row[randi() % same_row.size()]
				var ex = int(empty[rnd_idx].split("x")[0])
				var ey = int(empty[rnd_idx].split("x")[1])
				grid[ex][ey] = grid[x][y]
				grid[x][y] = "000000"
				empty[rnd_idx] = str(x) + "x" + str(y)

	# --- 5. Final Output ---
	# The original JS returned an object with a grid property that was a dictionary
	# of "grid[x][y]": value. We will return a simpler dictionary with the grid
	# as a 2D array, which is more idiomatic for Godot.
	var out: Dictionary = {
		"col": col,
		"xx": xx,
		"yy": yy,
		"grid": grid
	}
	return out


# --- Helper Functions ---

static func _gentag(px: int, py: int, xx: int, yy: int, grid: Array, col: String) -> String:
	var fp = ""
	# Left
	fp += grid[px - 1][py][4] if px > 0 and not grid[px - 1][py].begins_with("0") else col.substr(randi() % (col.length() - 1) + 1, 1) if px > 0 else "0"
	# Up
	fp += grid[px][py - 1][5] if py > 0 and not grid[px][py - 1].begins_with("0") else col.substr(randi() % (col.length() - 1) + 1, 1) if py > 0 else "0"
	# Right
	fp += grid[px + 1][py][2] if px < xx - 1 and not grid[px + 1][py].begins_with("0") else col.substr(randi() % (col.length() - 1) + 1, 1) if px < xx - 1 else "0"
	# Down
	fp += grid[px][py + 1][3] if py < yy - 1 and not grid[px][py + 1].begins_with("0") else col.substr(randi() % (col.length() - 1) + 1, 1) if py < yy - 1 else "0"
	return fp

static func _posmov(px: int, py: int, xx: int, yy: int, grid: Array) -> String:
	var fp = ""
	if px > 0 and grid[px - 1][py].begins_with("0"): fp += "L"
	if py > 0 and grid[px][py - 1].begins_with("0"): fp += "U"
	if px < xx - 1 and grid[px + 1][py].begins_with("0"): fp += "R"
	if py < yy - 1 and grid[px][py + 1].begins_with("0"): fp += "D"
	return fp

static func _fdwall(px: int, py: int, xx: int, yy: int) -> String:
	var fp = ""
	if px > 0: fp += "L"
	if py > 0: fp += "U"
	if px < xx - 1: fp += "R"
	if py < yy - 1: fp += "D"
	return fp
