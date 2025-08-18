# Main.gd
# This script is now a "View" controller for the 2D scene.
# It listens to the GameManager for state changes and forwards input to it.

extends Node2D

const TileScene = preload("res://scenes/Tile.tscn")

@onready var tile_container = $TileContainer
@onready var ui = $UI/Control

# Properties for drawing the grid and tiles
var cell_size: float = 0.0
var tile_radius: float = 0.0
var grid_start_pos: Vector2 = Vector2.ZERO

# Input and dragging state
var dragged_tile: Node2D = null
var is_dragging: bool = false
var drag_start_pos: Vector2 = Vector2.ZERO
var drag_offset: Vector2 = Vector2.ZERO

func _ready():
	# Connect to the global GameManager's signals
	GameManager.board_updated.connect(_on_board_updated)
	GameManager.game_won.connect(_on_game_won)

	# Connect to the UI signals
	ui.new_game_pressed.connect(GameManager.start_new_game)
	ui.save_progress_pressed.connect(GameManager.save_game)
	ui.load_game_pressed.connect(GameManager.load_game)

	# Initial game start
	GameManager.start_new_game()

func _on_board_updated():
	# Recalculate grid dimensions
	var screen_size = get_viewport_rect().size
	var available_size = screen_size * 0.9
	var cell_size_x = available_size.x / GameManager.xx
	var cell_size_y = available_size.y / GameManager.yy
	cell_size = min(cell_size_x, cell_size_y)
	tile_radius = cell_size * 0.4

	var grid_width = cell_size * GameManager.xx
	var grid_height = cell_size * GameManager.yy
	grid_start_pos = Vector2((screen_size.x - grid_width) / 2, (screen_size.y - grid_height) / 2)

	# Redraw the grid lines
	queue_redraw()

	# Clear and redraw all the tiles
	for child in tile_container.get_children():
		child.queue_free()

	for y in range(GameManager.yy):
		for x in range(GameManager.xx):
			var piece_data = GameManager.grid[x][y]
			if piece_data != "000000":
				add_tile_to_scene(piece_data, Vector2i(x, y))

func _on_game_won():
	ui.show_win_message()

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
				if dist_moved < 5.0: # Click
					GameManager.handle_tile_click(dragged_tile.grid_pos)
					# The board_updated signal will handle the redraw
				else: # Drop
					var mouse_pos = dragged_tile.position - grid_start_pos
					var drop_pos = Vector2i(floor(mouse_pos.x / cell_size), floor(mouse_pos.y / cell_size))
					var success = GameManager.handle_tile_drop(dragged_tile.grid_pos, drop_pos)
					if not success:
						# If the move was invalid, snap back visually. The GameManager state did not change.
						dragged_tile.position = drag_start_pos
				is_dragging = false
				dragged_tile = null

	if event is InputEventMouseMotion and is_dragging and dragged_tile:
		dragged_tile.global_position = event.position + drag_offset

func _draw():
	if GameManager.xx == 0 or GameManager.yy == 0: return
	var line_color = Color(0.5, 0.5, 0.5)
	for x in range(GameManager.xx + 1):
		var x_pos = grid_start_pos.x + x * cell_size
		draw_line(Vector2(x_pos, grid_start_pos.y), Vector2(x_pos, grid_start_pos.y + GameManager.yy * cell_size), line_color)
	for y in range(GameManager.yy + 1):
		var y_pos = grid_start_pos.y + y * cell_size
		draw_line(Vector2(grid_start_pos.x, y_pos), Vector2(grid_start_pos.x + GameManager.xx * cell_size, y_pos), line_color)
