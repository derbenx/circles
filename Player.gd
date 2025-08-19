extends Node3D

# Player Interaction Script
#
# This script is the brain of the VR interaction. It's attached to the XROrigin3D
# node and manages the player's state (e.g., IDLE, GRABBING). It listens for
# controller input and orchestrates the actions of grabbing, moving, and rotating
# pieces, as well as interacting with the UI.

@onready var left_controller: Controller = $LeftController
@onready var right_controller: Controller = $RightController
@onready var game_board: Node3D = get_node("/root/Main/GameBoard")
@onready var settings_panel: MeshInstance3D = get_node("/root/Main/SettingsPanel")
@onready var sub_viewport: SubViewport = get_node("/root/Main/SettingsPanel/SubViewport")

enum State { IDLE, GRABBING }
var current_state = State.IDLE
var active_controller: Controller
var grabbed_piece = null
var grabbed_piece_original_pos: Vector2i

# Keep track of what the controller is pointing at
var pointed_object = null

# An invisible plane for raycasting, to know where to place the piece on the board
var grab_plane: StaticBody3D

func _ready():
    # Determine the active controller (usually the right hand)
    active_controller = right_controller

    # Add a grab point to each controller
    var grab_point = Node3D.new()
    grab_point.name = "GrabPoint"
    left_controller.add_child(grab_point)
    # A second one is needed because the name needs to be unique for the scene tree path
    var grab_point_2 = Node3D.new()
    grab_point_2.name = "GrabPoint"
    right_controller.add_child(grab_point_2)

    # Create the grab plane
    grab_plane = StaticBody3D.new()
    var shape = BoxShape3D.new()
    shape.size = Vector3(100, 0.01, 100) # Large, flat plane
    var col_shape = CollisionShape3D.new()
    col_shape.shape = shape
    grab_plane.add_child(col_shape)
    # The plane should be at the same height as the game board pieces
    grab_plane.transform = game_board.transform
    grab_plane.collision_layer = 4 # A dedicated layer for the grab plane
    grab_plane.collision_mask = 0
    add_child(grab_plane)

    # Connect controller signals
    left_controller.button_pressed.connect(_on_button_pressed)
    right_controller.button_pressed.connect(_on_button_pressed)
    left_controller.button_released.connect(_on_button_released)
    right_controller.button_released.connect(_on_button_released)

func _physics_process(delta):
    # Board manipulation with the left thumbstick
    var move_vector = left_controller.get_vector2("thumbstick")
    if move_vector.length() > 0.1:
        game_board.rotate_y(move_vector.x * -0.02)

    # Centralized Raycast Logic
    var new_pointed_object = null
    var space_state = get_world_3d().direct_space_state
    var ray_origin = active_controller.global_transform.origin
    var ray_end = ray_origin + active_controller.global_transform.basis.z * -10
    # Cast against both pieces (layer 2) and UI (layer 8)
    var query = PhysicsRayQueryParameters3D.create(ray_origin, ray_end, 2 | 8)
    var result = space_state.intersect_ray(query)

    if result:
        new_pointed_object = result.collider

    # Handle highlighting and state changes
    if new_pointed_object != pointed_object:
        # Un-highlight the old object if it exists
        if is_instance_valid(pointed_object):
            if pointed_object.get_parent() is GamePiece:
                pointed_object.get_parent().set_highlight(false)

        # Highlight the new object
        if is_instance_valid(new_pointed_object):
            if new_pointed_object.get_parent() is GamePiece:
                new_pointed_object.get_parent().set_highlight(true)

        pointed_object = new_pointed_object

    # Show/hide laser
    active_controller.laser.visible = (pointed_object != null)

    # Handle UI interaction
    if pointed_object == settings_panel:
        # Convert 3D collision point to 2D UV coordinate for UI input
        var uv = result.get("uv", Vector2(-1, -1))
        if uv != Vector2(-1, -1):
            var ui_pos = Vector2(uv.x * sub_viewport.size.x, uv.y * sub_viewport.size.y)
            _forward_mouse_event(ui_pos, 0) # Motion event
    else:
        # Send a "mouse out" event to the UI when not pointing at it
        _forward_mouse_event(Vector2(-1, -1), 0)

func _get_ui_collision():
    # Performs a raycast to check if the controller is pointing at the UI panel.
    var space_state = get_world_3d().direct_space_state
    var ray_origin = active_controller.global_transform.origin
    var ray_end = active_controller.global_transform.origin + active_controller.global_transform.basis.z * -10
    var query = PhysicsRayQueryParameters3D.create(ray_origin, ray_end)
    # Assume the settings panel is on its own collision layer, e.g., 8
    query.collision_mask = 8
    var result = space_state.intersect_ray(query)
    return result

func _forward_mouse_event(pos, button_mask):
    # Creates a fake mouse input event and sends it to the SubViewport,
    # which makes the 2D UI controls clickable in VR.
    var event = InputEventMouseButton.new()
    event.position = pos
    event.button_mask = button_mask
    sub_viewport.push_input(event)

func _on_button_pressed(button_name):
    if not is_instance_valid(pointed_object):
        return

    var target_piece = pointed_object.get_parent()

    if button_name == "trigger_click":
        if target_piece is GamePiece:
            var piece_data = GameManager.get_piece(target_piece.get_meta("grid_pos").x, target_piece.get_meta("grid_pos").y)
            if int(piece_data.substr(0, 1)) > 1: # Check if movable
                current_state = State.GRABBING
                grabbed_piece = target_piece
                grabbed_piece_original_pos = target_piece.get_meta("grid_pos")

                var grab_point = active_controller.get_node("GrabPoint")
                grabbed_piece.get_parent().remove_child(grabbed_piece)
                grab_point.add_child(grabbed_piece)
                grabbed_piece.transform = Transform3D.IDENTITY

        elif pointed_object == settings_panel:
            var uv = _get_ui_collision().get("uv", Vector2(-1,-1))
            if uv != Vector2(-1,-1):
                var ui_pos = Vector2(uv.x * sub_viewport.size.x, uv.y * sub_viewport.size.y)
                _forward_mouse_event(ui_pos, 1) # Left mouse button down

    elif button_name == "primary_click": # 'A' button on Quest
        if target_piece is GamePiece:
            var pos = target_piece.get_meta("grid_pos")
            GameManager.rotate_piece(pos.x, pos.y)
            game_board.update_piece(pos.x, pos.y)

func _on_button_released(button_name):
    if button_name == "trigger_click":
        if current_state == State.GRABBING:
            var grab_point = active_controller.get_node("GrabPoint")
            grab_point.remove_child(grabbed_piece)

            # Simplified drop logic, just redraw the board
            GameManager.move_piece(grabbed_piece_original_pos.x, grabbed_piece_original_pos.y, grabbed_piece_original_pos.x, grabbed_piece_original_pos.y)
            game_board.draw_board()

            print("Released piece")
            current_state = State.IDLE
            grabbed_piece = null

        elif pointed_object == settings_panel:
            var uv = _get_ui_collision().get("uv", Vector2(-1,-1))
            if uv != Vector2(-1,-1):
                var ui_pos = Vector2(uv.x * sub_viewport.size.x, uv.y * sub_viewport.size.y)
                _forward_mouse_event(ui_pos, 0) # Left mouse button up
