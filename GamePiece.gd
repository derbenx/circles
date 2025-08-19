class_name GamePiece
extends Node3D

# GamePiece Scene Script
#
# This script is attached to each GamePiece scene instance. Its primary role
# is to procedurally generate the 3D model of the piece based on a data string
# provided by the GameBoard. It creates the cylinder body, colored connection
# nubs, and interaction markers on the fly. It also handles being highlighted.

var piece_data: String

# We'll use simple materials for the colors
var color_map = {
    "g": Color.GREEN,
    "r": Color.RED,
    "y": Color.YELLOW,
    "b": Color.BLUE,
    "v": Color.BLUE_VIOLET,
    "c": Color.CYAN,
    "p": Color.ORANGE,
    "l": Color.LIME_GREEN,
    "e": Color.GRAY,
    "0": Color.BLACK # Should not be used for nubs, but as a fallback
}
var base_color = Color.DARK_GREEN
var marker_color = Color.BLACK
var highlight_color = Color.WHITE

var body_mesh_instance: MeshInstance3D

func generate(data: String):
    # This is the main function, called by the GameBoard. It builds the piece's visuals.
    piece_data = data

    # Clear any previous geometry in case we are re-generating (e.g., after a rotation)
    for child in get_children():
        child.queue_free()

    if piece_data.begins_with("0"):
        return # It's an empty space, do nothing.

    # 1. Create the main cylinder body
    body_mesh_instance = MeshInstance3D.new()
    body_mesh_instance.mesh = _create_cylinder_mesh(0.5, 0.2)
    var body_material = StandardMaterial3D.new()
    body_material.albedo_color = base_color
    # Allow for highlighting via emission
    body_material.emission_enabled = true
    body_material.emission = Color(0,0,0) # Initially off
    body_material.emission_energy_multiplier = 2.0
    body_mesh_instance.material_override = body_material
    add_child(body_mesh_instance)

    # Add a StaticBody3D for raycast collision
    var static_body = StaticBody3D.new()
    var collision_shape = CollisionShape3D.new()
    var cylinder_shape = CylinderShape3D.new()
    cylinder_shape.radius = 0.5
    cylinder_shape.height = 0.2
    collision_shape.shape = cylinder_shape
    static_body.add_child(collision_shape)

    # Set the collision layer for the piece, so the player's raycast can find it.
    static_body.collision_layer = 2
    static_body.collision_mask = 0 # It doesn't need to detect anything

    add_child(static_body)

    # 2. Create the colored nubs
    var nubs_data = piece_data.substr(2, 4)
    # Nub positions: [Left, Up, Right, Down] which correspond to [-X, -Z, +X, +Z]
    var nub_positions = [Vector3(-0.5, 0, 0), Vector3(0, 0, -0.5), Vector3(0.5, 0, 0), Vector3(0, 0, 0.5)]
    var nub_rotations = [Vector3(0, -PI/2, 0), Vector3(0, 0, 0), Vector3(0, PI/2, 0), Vector3(0, PI, 0)]

    for i in range(4):
        var nub_char = nubs_data.substr(i, 1)
        if nub_char != "0":
            var nub_mesh_instance = MeshInstance3D.new()
            nub_mesh_instance.mesh = _create_half_cylinder_mesh(0.2, 0.4)

            var nub_material = StandardMaterial3D.new()
            nub_material.albedo_color = color_map.get(nub_char, Color.WHITE)
            nub_mesh_instance.material_override = nub_material

            nub_mesh_instance.position = nub_positions[i]
            nub_mesh_instance.rotation = nub_rotations[i]

            add_child(nub_mesh_instance)

    # 3. Create the interaction markers on top
    var move_type = piece_data.substr(0, 1)
    var rot_type = piece_data.substr(1, 1)
    var marker_height = 0.15

    # Move markers
    if move_type == "2" or move_type == "4": # Horizontal bar for '+'
        add_child(_create_marker_bar(Vector3(0, marker_height, 0), Vector3(0.25, 0.02, 0.02)))
    if move_type == "2" or move_type == "3": # Vertical bar for '+'
        add_child(_create_marker_bar(Vector3(0, marker_height, 0), Vector3(0.02, 0.02, 0.25)))

    # Rotation markers
    if rot_type == "1": # Circle 'O'
        var ring = MeshInstance3D.new()
        ring.mesh = _create_ring_mesh(0.3, 0.02, 32)
        var ring_mat = StandardMaterial3D.new()
        ring_mat.albedo_color = marker_color
        ring.material_override = ring_mat
        ring.position.y = marker_height
        add_child(ring)

func set_highlight(is_highlighted: bool):
    # Called by the Controller script to turn the highlight effect on or off.
    if body_mesh_instance and body_mesh_instance.material_override:
        var mat = body_mesh_instance.material_override as StandardMaterial3D
        if is_highlighted:
            mat.emission = highlight_color
        else:
            mat.emission = Color(0,0,0)

# --- Mesh Generation Functions ---

func _create_marker_bar(pos: Vector3, size: Vector3) -> MeshInstance3D:
    var bar = MeshInstance3D.new()
    var box_mesh = BoxMesh.new()
    box_mesh.size = size
    bar.mesh = box_mesh
    var bar_mat = StandardMaterial3D.new()
    bar_mat.albedo_color = marker_color
    bar.material_override = bar_mat
    bar.position = pos
    return bar

func _create_cylinder_mesh(radius: float, height: float) -> Mesh:
    var mesh = CylinderMesh.new()
    mesh.top_radius = radius
    mesh.bottom_radius = radius
    mesh.height = height
    return mesh

func _create_half_cylinder_mesh(radius: float, height: float) -> Mesh:
    # Godot doesn't have a built-in half-cylinder, so we use ArrayMesh
    var surf = SurfaceTool.new()
    surf.begin(Mesh.PRIMITIVE_TRIANGLES)

    var segments = 16
    var angle_step = PI / segments

    # Curved face
    for i in range(segments):
        var angle1 = i * angle_step - PI/2
        var angle2 = (i + 1) * angle_step - PI/2
        var v1 = Vector3(cos(angle1) * radius, -height/2, sin(angle1) * radius)
        var v2 = Vector3(cos(angle1) * radius, height/2, sin(angle1) * radius)
        var v3 = Vector3(cos(angle2) * radius, height/2, sin(angle2) * radius)
        var v4 = Vector3(cos(angle2) * radius, -height/2, sin(angle2) * radius)
        surf.add_vertex(v1); surf.add_vertex(v2); surf.add_vertex(v3)
        surf.add_vertex(v1); surf.add_vertex(v3); surf.add_vertex(v4)

    # Back face
    var v1 = Vector3(0, -height/2, -radius)
    var v2 = Vector3(0, height/2, -radius)
    var v3 = Vector3(0, height/2, radius)
    var v4 = Vector3(0, -height/2, radius)
    surf.add_vertex(v1); surf.add_vertex(v3); surf.add_vertex(v2)
    surf.add_vertex(v1); surf.add_vertex(v4); surf.add_vertex(v3)

    surf.generate_normals()
    return surf.commit()

func _create_ring_mesh(radius: float, thickness: float, segments: int) -> Mesh:
    var mesh = TorusMesh.new()
    mesh.inner_radius = radius - (thickness / 2.0)
    mesh.outer_radius = radius + (thickness / 2.0)
    mesh.ring_segments = segments
    return mesh
