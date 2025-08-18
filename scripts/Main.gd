# Main.gd
# Manages the main game loop, grid, tile interactions, and input handling.

extends Node2D

const PuzzleGenerator = preload("res://scripts/PuzzleGenerator.gd")
const TileScene = preload("res://scenes/Tile.tscn")
const SAVE_PATH = "user://circles_save.json"

@onready var tile_container = $TileContainer
@onready var ui = $UI

# Game state variables
var grid: Array = []
var xx: int = 0
var yy: int = 0
var col_map: String = ""
var cell_size: float = 0.0
var tile_radius: float = 0.0
var grid_start_pos: Vector2 = Vector2.ZERO

# Input and dragging state
var dragged_tile: Node2D = null
var is_dragging: bool = false
var drag_start_pos: Vector2 = Vector2.ZERO
var drag_offset: Vector2 = Vector2.ZERO

func _ready():
	ui.new_game_pressed.connect(start_new_game)
	ui.save_progress_pressed.connect(save_game)
	ui.load_game_pressed.connect(load_game)
	start_new_game()

func start_new_game(options: Dictionary = {}):
	if options.is_empty():
		options = { "wdh": 4, "hgt": 4, "mov": 2, "rot": 1, "clr": 5, "pct": 55, "pnt": 1 }

	var puzzle_data = PuzzleGenerator.generate_puzzle(options)
	_setup_board_from_data(puzzle_data)

func _setup_board_from_data(data: Dictionary):
	grid = data["grid"]
	xx = data["xx"]
	yy = data["yy"]
	col_map = data["col"]

	for child in tile_container.get_children():
		child.queue_free()

	var screen_size = get_viewport_rect().size
	var available_size = screen_size * 0.9
	var cell_size_x = available_size.x / xx
	var cell_size_y = available_size.y / yy
	cell_size = min(cell_size_x, cell_size_y)
	tile_radius = cell_size * 0.4

	var grid_width = cell_size * xx
	var grid_height = cell_size * yy
	grid_start_pos = Vector2((screen_size.x - grid_width) / 2, (screen_size.y - grid_height) / 2)

	for y in range(yy):
		for x in range(xx):
			var piece_data = grid[x][y]
			if piece_data != "000000":
				add_tile_to_scene(piece_data, Vector2i(x, y))

func add_tile_to_scene(piece_data: String, grid_pos: Vector2i):
	var tile = TileScene.instantiate()
	tile_container.add_child(tile)
	var cell_center = Vector2(grid_pos.x * cell_size + cell_size / 2, grid_pos.y * cell_size + cell_size / 2)
	tile.position = grid_start_pos + cell_center
	tile.init(piece_data, tile_radius, grid_pos)

func _input(event: InputEvent):
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			var space_state = get_world_2d().direct_space_state
			var query = PhysicsPointQueryParameters2D.new()
			query.position = event.position
			query.collision_mask = 2
			var results = space_state.intersect_point(query)

			if not results.is_empty():
				var tile = results[0].collider.get_owner()
				if tile and tile.piece_data.substr(0, 1) > "1":
					is_dragging = true
					dragged_tile = tile
					drag_start_pos = tile.position
					drag_offset = tile.global_position - event.position
					tile_container.move_child(dragged_tile, -1)
		else:
			if is_dragging and dragged_tile:
				var dist_moved = drag_start_pos.distance_to(dragged_tile.position)
				if dist_moved < 5.0:
					handle_tile_click(dragged_tile)
					dragged_tile.position = drag_start_pos
				else:
					handle_tile_drop(dragged_tile)
				is_dragging = false
				dragged_tile = null

	if event is InputEventMouseMotion and is_dragging and dragged_tile:
		dragged_tile.global_position = event.position + drag_offset

func handle_tile_click(tile: Node2D):
	var pos = tile.grid_pos
	var piece = grid[pos.x][pos.y]
	var rot_type = piece.substr(1, 1)

	if rot_type == "0": return

	var new_piece = piece
	if rot_type == "1":
		new_piece = piece.substr(0, 2) + piece[3] + piece[4] + piece[5] + piece[2]
	elif rot_type == "2":
		new_piece = piece.substr(0, 3) + piece[5] + piece[4] + piece[3]
	elif rot_type == "3":
		new_piece = piece.substr(0, 2) + piece[4] + piece[3] + piece[2] + piece[5]

	grid[pos.x][pos.y] = new_piece
	tile.init(new_piece, tile_radius, pos)
	check_win_condition()

func handle_tile_drop(tile: Node2D):
	var mouse_pos = tile.position - grid_start_pos
	var drop_pos = Vector2i(floor(mouse_pos.x / cell_size), floor(mouse_pos.y / cell_size))
	var start_pos = tile.grid_pos
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
		tile.grid_pos = drop_pos
		var cell_center = Vector2(drop_pos.x * cell_size + cell_size / 2, drop_pos.y * cell_size + cell_size / 2)
		tile.position = grid_start_pos + cell_center
		check_win_condition()
	else:
		tile.position = drag_start_pos

# --- Win Condition ---

func check_win_condition():
	for y in range(yy):
		for x in range(xx):
			var piece = grid[x][y]
			if piece.begins_with("0"):
				continue

			var colors = piece.substr(2, 4)
			var connections = 0
			var has_any_nub = false

			# Left
			if colors[0] != '0':
				has_any_nub = true
				if x == 0 or grid[x-1][y].begins_with("0"): return
				if colors[0] != grid[x-1][y].substr(4, 1): return
				connections += 1
			# Up
			if colors[1] != '0':
				has_any_nub = true
				if y == 0 or grid[x][y-1].begins_with("0"): return
				if colors[1] != grid[x][y-1].substr(5, 1): return
				connections += 1
			# Right
			if colors[2] != '0':
				has_any_nub = true
				if x == xx - 1 or grid[x+1][y].begins_with("0"): return
				if colors[2] != grid[x+1][y].substr(2, 1): return
				connections += 1
			# Down
			if colors[3] != '0':
				has_any_nub = true
				if y == yy - 1 or grid[x][y+1].begins_with("0"): return
				if colors[3] != grid[x][y+1].substr(3, 1): return
				connections += 1

			if has_any_nub and connections == 0:
				return # Island piece, not solved.

	# All checks passed for all pieces
	ui.show_win_message()
	print("--- YOU WIN ---")

# --- Save/Load Functions ---

func save_game():
	var save_dict = {
		"grid": grid,
		"xx": xx,
		"yy": yy,
		"col": col_map
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		var json_string = JSON.stringify(save_dict)
		file.store_string(json_string)
		print("Game progress saved to " + SAVE_PATH)

func load_game():
	if not FileAccess.file_exists(SAVE_PATH):
		print("No save file found.")
		return

	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var json_string = file.get_as_text()
		var parse_result = JSON.parse_string(json_string)

		if parse_result != null:
			print("Save file loaded.")
			_setup_board_from_data(parse_result)
		else:
			print("Error parsing save file.")
