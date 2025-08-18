# Main3D.gd
# This script manages the 3D/VR version of the game.
extends Node3D

const Tile3DScene = preload("res://scenes/Tile3D.tscn")

@onready var tile_container = $TileContainer
@onready var left_hand = $XROrigin3D/LeftHand
@onready var right_hand = $XROrigin3D/RightHand
@onready var ray_cast = $XROrigin3D/RightHand/RayCast3D
@onready var ui_viewport = $UIPanel/SubViewportContainer/SubViewport
@onready var ui_panel_area = $UIPanel/UIMesh/Area3D

# VR interaction state
var highlighted_tile = null
var grabbed_tile = null
var last_ui_pos = Vector2.ZERO

func _ready():
	GameManager.board_updated.connect(_on_board_updated)
	if GameManager.xx > 0:
		_on_board_updated()

func _on_board_updated():
	for child in tile_container.get_children():
		child.queue_free()

	var grid_size_x = GameManager.xx * 1.0
	var grid_size_z = GameManager.yy * 1.0
	var start_pos_3d = Vector3(-grid_size_x / 2.0 + 0.5, 1.0, -grid_size_z / 2.0 + 0.5)

	for y in range(GameManager.yy):
		for x in range(GameManager.xx):
			var piece_data = GameManager.grid[x][y]
			if piece_data != "000000":
				var tile = Tile3DScene.instantiate()
				tile_container.add_child(tile)
				tile.position = start_pos_3d + Vector3(x, 0, y)
				tile.init(piece_data, Vector2i(x, y))

func _physics_process(_delta):
	if left_hand.is_button_pressed("menu_click"):
		get_tree().get_root().get_node("Boot").toggle_vr_mode()
		return

	var collider = ray_cast.get_collider()
	if not collider:
		if highlighted_tile:
			(highlighted_tile.get_node("Body").mesh.material as StandardMaterial3D).albedo_color = Color.GRAY
			highlighted_tile = null
		return

	if collider == ui_panel_area:
		var local_pos = ui_panel_area.get_parent().to_local(ray_cast.get_collision_point())
		var ui_pos = Vector2(local_pos.x + 0.5, -local_pos.y + 0.5) * ui_viewport.size
		var motion_event = InputEventMouseMotion.new()
		motion_event.position = ui_pos
		motion_event.relative = ui_pos - last_ui_pos
		last_ui_pos = ui_pos
		ui_viewport.push_input(motion_event)
		var click_event = InputEventMouseButton.new()
		click_event.position = ui_pos
		click_event.button_index = MOUSE_BUTTON_LEFT
		click_event.pressed = right_hand.is_button_pressed("trigger_click")
		ui_viewport.push_input(click_event)

	elif collider.get_owner() is Node3D:
		var new_highlight = collider.get_owner()
		if new_highlight != highlighted_tile:
			if highlighted_tile:
				(highlighted_tile.get_node("Body").mesh.material as StandardMaterial3D).albedo_color = Color.GRAY
			if new_highlight:
				(new_highlight.get_node("Body").mesh.material as StandardMaterial3D).albedo_color = Color.LIGHT_BLUE
			highlighted_tile = new_highlight

		if right_hand.is_button_pressed("trigger_click"):
			if not grabbed_tile and highlighted_tile:
				grabbed_tile = highlighted_tile
				var global_transform = grabbed_tile.global_transform
				grabbed_tile.get_parent().remove_child(grabbed_tile)
				right_hand.add_child(grabbed_tile)
				grabbed_tile.global_transform = global_transform
		elif grabbed_tile:
			var global_transform = grabbed_tile.global_transform
			right_hand.remove_child(grabbed_tile)
			tile_container.add_child(grabbed_tile)
			grabbed_tile.global_transform = global_transform
			var grid_size_x = GameManager.xx * 1.0
			var grid_size_z = GameManager.yy * 1.0
			var start_pos_3d = Vector3(-grid_size_x / 2.0 + 0.5, 1.0, -grid_size_z / 2.0 + 0.5)
			var local_pos = grabbed_tile.position - start_pos_3d
			var drop_pos = Vector2i(round(local_pos.x), round(local_pos.z))
			GameManager.handle_tile_drop(grabbed_tile.grid_pos, drop_pos)
			grabbed_tile = null

		if right_hand.is_button_pressed("primary_click"):
			if highlighted_tile:
				GameManager.handle_tile_click(highlighted_tile.grid_pos)
