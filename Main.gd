extends Node3D

# This script ensures that the main viewport is configured for XR (VR/AR) rendering.
# It also explicitly initializes the OpenXR interface, which is a crucial step
# to start receiving tracking data for the headset and controllers.

func _ready():
    # Find the OpenXR interface
    var xr_interface = XRServer.find_interface("OpenXR")
    if xr_interface:
        # Initialize the interface
        if not xr_interface.is_initialized():
            xr_interface.initialize()

        # Set this viewport as the main XR viewport
        get_viewport().use_xr = true
        print("OpenXR Initialized Successfully.")
    else:
        print("ERROR: OpenXR interface not found.")
