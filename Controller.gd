class_name Controller
extends XRController3D

# VR Controller Script
#
# This script is attached to each XRController3D node. It provides the visual
# "laser pointer" and uses an Area3D to detect which game pieces are being
# pointed at, handling the highlighting effect.

var laser: MeshInstance3D
var sphere: MeshInstance3D

func _ready():
    # 1. Create a sphere to represent the controller's position
    sphere = MeshInstance3D.new()
    var sphere_mesh = SphereMesh.new()
    sphere_mesh.radius = 0.03
    sphere_mesh.height = 0.06
    sphere.mesh = sphere_mesh
    add_child(sphere)

    # 2. Create the laser pointer visual
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

# We also need to listen for button presses
func _process(delta):
    # The actual input handling is done in Player.gd, which reads button
    # presses directly from the controller nodes. This process loop is
    # currently empty but could be used for controller-specific animations.
    pass
