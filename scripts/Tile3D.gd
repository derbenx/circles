# Tile3D.gd
# Manages the state and appearance of a single 3D puzzle piece.
extends Node3D

# Onready references to the nodes that will be in Tile3D.tscn
# Each node reference needs its own @onready declaration.
@onready var nub_left = $Nubs/Left
@onready var nub_up = $Nubs/Up
@onready var nub_right = $Nubs/Right
@onready var nub_down = $Nubs/Down
@onready var marker_move_h = $Markers/MoveH
@onready var marker_move_v = $Markers/MoveV
@onready var marker_rot_ring = $Markers/RotRing
@onready var marker_rot_arc_u = $Markers/RotArcU
@onready var marker_rot_arc_c = $Markers/RotArcC

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
	nub_left.visible = (colors[0] != '0')
	if nub_left.visible:
		(nub_left.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[0]]

	nub_up.visible = (colors[1] != '0')
	if nub_up.visible:
		(nub_up.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[1]]

	nub_right.visible = (colors[2] != '0')
	if nub_right.visible:
		(nub_right.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[2]]

	nub_down.visible = (colors[3] != '0')
	if nub_down.visible:
		(nub_down.get_surface_override_material(0) as StandardMaterial3D).albedo_color = COLOR_MAP[colors[3]]

	# --- Configure Markers ---
	# Hide all markers first
	marker_move_h.visible = false
	marker_move_v.visible = false
	marker_rot_ring.visible = false
	marker_rot_arc_u.visible = false
	marker_rot_arc_c.visible = false

	# Show the correct ones
	if move_type == '2': # +
		marker_move_h.visible = true
		marker_move_v.visible = true
	elif move_type == '3': # -
		marker_move_v.visible = true
	elif move_type == '4': # |
		marker_move_h.visible = true

	if rot_type == '1': # O
		marker_rot_ring.visible = true
	elif rot_type == '2': # U
		marker_rot_arc_u.visible = true
	elif rot_type == '3': # C
		marker_rot_arc_c.visible = true
