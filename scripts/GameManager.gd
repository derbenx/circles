# GameManager.gd
# This is an autoloaded script that acts as a global singleton.
# It holds the single source of truth for the game state and logic.
# Both 2D and 3D scenes will listen to its signals to update their views.

extends Node

signal board_updated
signal game_won

const SAVE_PATH = "user://circles_save.json"

# Game state variables
var grid: Array = []
var xx: int = 0
var yy: int = 0
var col_map: String = ""

func _ready():
	# The PuzzleGenerator is a class, not a node, so we can use it directly.
	pass

func start_new_game(options: Dictionary = {}):
	if options.is_empty():
		options = { "wdh": 4, "hgt": 4, "mov": 2, "rot": 1, "clr": 5, "pct": 55, "pnt": 1 }

	var puzzle_data = PuzzleGenerator.generate_puzzle(options)
	_load_data(puzzle_data)

func _load_data(data: Dictionary):
	grid = data["grid"]
	xx = data["xx"]
	yy = data["yy"]
	col_map = data["col"]
	emit_signal("board_updated")

func handle_tile_click(pos: Vector2i):
	var piece = grid[pos.x][pos.y]
	var rot_type = piece.substr(1, 1)

	if rot_type == "0": return

	var new_piece = piece
	if rot_type == "1": # Rotate
		new_piece = piece.substr(0, 2) + piece[3] + piece[4] + piece[5] + piece[2]
	elif rot_type == "2": # Flip UD
		new_piece = piece.substr(0, 3) + piece[5] + piece[4] + piece[3]
	elif rot_type == "3": # Flip LR
		new_piece = piece.substr(0, 2) + piece[4] + piece[3] + piece[2] + piece[5]

	grid[pos.x][pos.y] = new_piece
	emit_signal("board_updated")
	check_win_condition()

func handle_tile_drop(start_pos: Vector2i, drop_pos: Vector2i):
	var piece_data = grid[start_pos.x][start_pos.y]
	var move_type = piece_data.substr(0, 1)
	var is_valid_move = false

	if drop_pos.x >= 0 and drop_pos.y >= 0 and drop_pos.x < xx and drop_pos.y < yy:
		if grid[drop_pos.x][drop_pos.y] == "000000":
			if move_type == "2": is_valid_move = true
			elif move_type == "3":
				if drop_pos.x == start_pos.x: is_valid_move = true
			elif move_type == "4":
				if drop_pos.y == start_pos.y: is_valid_move = true

	if is_valid_move:
		grid[drop_pos.x][drop_pos.y] = piece_data
		grid[start_pos.x][start_pos.y] = "000000"
		emit_signal("board_updated")
		check_win_condition()
		return true # Move was successful

	return false # Move was invalid

func check_win_condition():
	for y in range(yy):
		for x in range(xx):
			var piece = grid[x][y]
			if piece.begins_with("0"): continue
			var colors = piece.substr(2, 4)
			var connections = 0
			var has_any_nub = false
			if colors[0] != '0':
				has_any_nub = true
				if x == 0 or grid[x-1][y].begins_with("0"): return
				if colors[0] != grid[x-1][y].substr(4, 1): return
				connections += 1
			if colors[1] != '0':
				has_any_nub = true
				if y == 0 or grid[x][y-1].begins_with("0"): return
				if colors[1] != grid[x][y-1].substr(5, 1): return
				connections += 1
			if colors[2] != '0':
				has_any_nub = true
				if x == xx - 1 or grid[x+1][y].begins_with("0"): return
				if colors[2] != grid[x+1][y].substr(2, 1): return
				connections += 1
			if colors[3] != '0':
				has_any_nub = true
				if y == yy - 1 or grid[x][y+1].begins_with("0"): return
				if colors[3] != grid[x][y+1].substr(3, 1): return
				connections += 1
			if has_any_nub and connections == 0: return

	emit_signal("game_won")

func save_game():
	var save_dict = { "grid": grid, "xx": xx, "yy": yy, "col": col_map }
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		var json_string = JSON.stringify(save_dict)
		file.store_string(json_string)

func load_game():
	if not FileAccess.file_exists(SAVE_PATH): return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var json_string = file.get_as_text()
		var parse_result = JSON.parse_string(json_string)
		if parse_result != null:
			_load_data(parse_result)
