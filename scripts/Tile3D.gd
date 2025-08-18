# Tile3D.gd
# Manages the state and appearance of a single 3D puzzle piece.
extends Node3D

# Onready references to the nodes that will be in Tile3D.tscn
@onready var nubs = {
	"left": $Nubs/Left, "up": $Nubs/Up,
	"right": $Nubs/Right, "down": $Nubs/Down
}
@onready var markers = {
	"move_h": $Markers/MoveH, "move_v": $Markers/MoveV,
	"rot_ring": $Markers/RotRing, "rot_arc_u": $Markers/RotArcU, "rot_arc_c": $Markers/RotArcC
}

# Using the same color map from the 2D tile script.
const COLOR_MAP = {
	"g": Color.GREEN, "r": Color.RED, "y": Color.YELLOW,
	"b": Color.BLUE, "v": Color.BLUE_VIOLET, "c": Color.CYAN,
	"p": Color.DARK_ORANGE, "l": Color.LIME_GREEN, "e": Color.GRAY
}

var piece_data: String
var grid_pos: Vector2i

func init(data: String, pos: Vector2i):
	self.piece_data = data
	self.grid_pos = pos

	# Wait for nodes to be ready before configuring them.
	await ready

	_update_appearance()

func _update_appearance():
	if not is_node_ready():
		return

	var move_type = piece_data[0]
	var rot_type = piece_data[1]
	var colors = piece_data.substr(2, 4)

	# --- Configure Nubs ---
	# Left
	nubs.left.visible = (colors[0] != '0')
	if nubs.left.visible:
		(nubs.left.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[0]]
	# Up
	nubs.up.visible = (colors[1] != '0')
	if nubs.up.visible:
		(nubs.up.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[1]]
	# Right
	nubs.right.visible = (colors[2] != '0')
	if nubs.right.visible:
		(nubs.right.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[2]]
	# Down
	nubs.down.visible = (colors[3] != '0')
	if nubs.down.visible:
		(nubs.down.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[3]]

	# --- Configure Markers ---
	# Hide all markers first
	for marker in markers.values():
		marker.visible = false

	# Show the correct ones
	if move_type == '2': # +
		markers.move_h.visible = true
		markers.move_v.visible = true
	elif move_type == '3': # -
		markers.move_v.visible = true
	elif move_type == '4': # |
		markers.move_h.visible = true

	if rot_type == '1': # O
		markers.rot_ring.visible = true
	elif rot_type == '2': # U
		markers.rot_arc_u.visible = true
	elif rot_type == '3': # C
		markers.rot_arc_c.visible = true
