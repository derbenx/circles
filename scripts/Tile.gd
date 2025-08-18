# Tile.gd
# Represents a single puzzle piece and handles its drawing.
extends Node2D

@onready var collision_shape: CollisionShape2D = $Area2D/CollisionShape2D

var piece_data: String = "000000"
var tile_radius: float = 50.0
var grid_pos: Vector2i = Vector2i.ZERO

# Using a dictionary to map color characters to Godot's Color constants.
const COLOR_MAP = {
	"g": Color.GREEN, "r": Color.RED, "y": Color.YELLOW,
	"b": Color.BLUE, "v": Color.BLUE_VIOLET, "c": Color.CYAN,
	"p": Color.DARK_ORANGE, "l": Color.LIME_GREEN, "e": Color.GRAY
}

# Call this to set up the tile's initial state.
func init(data: String, radius: float, pos: Vector2i):
	self.piece_data = data
	self.tile_radius = radius
	self.grid_pos = pos

	# Update the collision shape to match the visual radius
	if collision_shape:
		(collision_shape.shape as CircleShape2D).radius = radius

	# queue_redraw() will schedule a call to _draw() on the next frame.
	queue_redraw()

# Godot's main drawing callback.
func _draw():
	# Don't draw anything if the tile is empty.
	if piece_data == "000000":
		return

	var center = Vector2.ZERO

	# Draw the main body of the circle.
	draw_circle(center, tile_radius, Color.IVORY)
	# Draw the border.
	draw_arc(center, tile_radius, 0, TAU, 64, Color.GRAY, 2.0)

	# --- Draw Markers ---
	var move_type = piece_data[0]
	var rot_type = piece_data[1]
	var marker_radius = tile_radius / 3.0

	# Draw movement markers (+, -, |)
	if move_type == '2' or move_type == '3': # Vertical line for '+' and '-'
		draw_line(Vector2(0, -marker_radius), Vector2(0, marker_radius), Color.BLACK, 3.0)
	if move_type == '2' or move_type == '4': # Horizontal line for '+' and '|'
		draw_line(Vector2(-marker_radius, 0), Vector2(marker_radius, 0), Color.BLACK, 3.0)

	# Draw rotation markers (O, U, C)
	var rot_marker_radius = tile_radius / 2.0
	if rot_type == '1': # 'O' - Full circle
		draw_arc(center, rot_marker_radius, 0, TAU, 32, Color.BLACK, 3.0)
	if rot_type == '2': # 'U' - Top half arc
		# In Godot's 2D, +Y is down, so to draw a top arc, we go from PI to TAU (or 2*PI)
		draw_arc(center, rot_marker_radius, PI, TAU, 16, Color.BLACK, 3.0)
	if rot_type == '3': # 'C' - Left half arc
		# To draw a left arc, we go from PI/2 to 3*PI/2
		draw_arc(center, rot_marker_radius, PI / 2.0, 3.0 * PI / 2.0, 16, Color.BLACK, 3.0)

	# --- Draw Color Nubs ---
	var nub_radius = tile_radius / 4.0
	var colors = piece_data.substr(2, 4)

	if colors[0] != '0': # Left nub
		draw_circle(center + Vector2(-tile_radius, 0), nub_radius, COLOR_MAP[colors[0]])
	if colors[1] != '0': # Up nub
		draw_circle(center + Vector2(0, -tile_radius), nub_radius, COLOR_MAP[colors[1]])
	if colors[2] != '0': # Right nub
		draw_circle(center + Vector2(tile_radius, 0), nub_radius, COLOR_MAP[colors[2]])
	if colors[3] != '0': # Down nub
		draw_circle(center + Vector2(0, tile_radius), nub_radius, COLOR_MAP[colors[3]])
