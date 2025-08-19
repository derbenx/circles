extends XRController3D

# VR Controller Script
#
# This script is attached to each XRController3D node. It provides the visual
# "laser pointer" and uses an Area3D to detect which game pieces are being
# pointed at, handling the highlighting effect.

var laser: MeshInstance3D
var laser_cast: Area3D
var last_collided_piece = null

func _ready():
    # 1. Create the laser pointer visual
    laser = MeshInstance3D.new()
    var laser_mesh = CylinderMesh.new()
    laser_mesh.height = 10.0
    laser_mesh.top_radius = 0.005
    laser_mesh.bottom_radius = 0.005
    laser.mesh = laser_mesh

    var laser_material = StandardMaterial3D.new()
    laser_material.albedo_color = Color.TOMATO
    laser_material.emission_enabled = true
    laser_material.emission = Color.TOMATO
    laser.material_override = laser_material

    # Position the laser to point forward from the controller
    laser.transform.origin = Vector3(0, 0, -5.0)
    laser.transform.basis = Basis.IDENTITY.rotated(Vector3(1,0,0), PI/2)
    add_child(laser)

    # 2. Create the raycast Area3D for detection
    laser_cast = Area3D.new()
    var collision_shape = CollisionShape3D.new()
    var shape = BoxShape3D.new()
    # The shape should be a long, thin box that matches the laser
    shape.size = Vector3(0.02, 0.02, 10.0)
    collision_shape.shape = shape
    laser_cast.add_child(collision_shape)
    laser_cast.transform.origin = Vector3(0, 0, -5.0)

    # Set the collision layer and mask. We'll assume pieces are on layer 2.
    laser_cast.collision_layer = 0
    laser_cast.collision_mask = 2

    # Connect to the area's signals to detect when we hit a piece
    laser_cast.connect("area_entered", Callable(self, "_on_area_entered"))
    laser_cast.connect("area_exited", Callable(self, "_on_area_exited"))

    add_child(laser_cast)

func _on_area_entered(area):
    # When the laser pointer's area enters a piece's area, highlight it.
    var piece = area.get_parent()
    if piece is Node3D and piece.has_method("set_highlight"):
        piece.set_highlight(true)
        last_collided_piece = piece

func _on_area_exited(area):
    # When the laser pointer's area leaves a piece's area, un-highlight it.
    var piece = area.get_parent()
    if piece is Node3D and piece.has_method("set_highlight"):
        piece.set_highlight(false)
        if last_collided_piece == piece:
            last_collided_piece = null

func get_pointed_piece():
    return last_collided_piece

# We also need to listen for button presses
func _process(delta):
    # The actual input handling is done in Player.gd, which reads button
    # presses directly from the controller nodes. This process loop is
    # currently empty but could be used for controller-specific animations.
    pass
