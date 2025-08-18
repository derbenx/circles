# Boot.gd
# This is the main entry point of the game.
# It manages which view (2D or 3D/VR) is active.
extends Node

@onready var main_2d = $Main2D
@onready var main_3d = $Main3D
@onready var ui = $Main2D/UI/Control

var xr_interface: XRInterface

func _ready():
	# Start in 2D mode
	main_3d.visible = false
	ui.toggle_vr_pressed.connect(toggle_vr_mode)

func toggle_vr_mode():
	if main_3d.visible:
		# --- Switch to 2D ---
		main_3d.visible = false
		main_2d.visible = true
		if xr_interface:
			xr_interface.uninitialize()
			xr_interface = null
	else:
		# --- Switch to VR ---
		xr_interface = XRServer.find_interface("OpenXR")
		if xr_interface and xr_interface.is_initialized():
			# Already initialized, just switch view
			main_2d.visible = false
			main_3d.visible = true
		elif xr_interface:
			# Try to initialize
			if xr_interface.initialize():
				main_2d.visible = false
				main_3d.visible = true
			else:
				print("Failed to initialize OpenXR interface.")
		else:
			print("OpenXR interface not found.")
