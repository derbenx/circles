extends Node3D

# This script ensures that the main viewport is configured for XR (VR/AR) rendering.
# This is a mandatory step for Godot's OpenXR implementation to work.

func _ready():
    # Enable XR mode for the viewport
    get_viewport().use_xr = true
