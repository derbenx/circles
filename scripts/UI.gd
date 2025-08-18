# UI.gd
# Manages all user interface elements and their signals.
extends Control

# Signal to notify the main game to start a new puzzle.
signal new_game_pressed(settings: Dictionary)
signal save_progress_pressed
signal load_game_pressed
signal toggle_vr_pressed

# Using @onready to ensure the nodes are available when we access them.
@onready var settings_panel = $VBoxContainer/SettingsPanel
@onready var help_panel = $VBoxContainer/HelpPanel
@onready var win_label = $WinLabel
@onready var new_game_button = $VBoxContainer/Header/NewGameButton
@onready var settings_button = $VBoxContainer/Header/SettingsButton
@onready var help_button = $VBoxContainer/Header/HelpButton
@onready var toggle_vr_button = $VBoxContainer/Header/ToggleVRButton
@onready var new_game_settings_button = $VBoxContainer/SettingsPanel/VBox/NewGameSettingsButton
@onready var save_progress_button = $VBoxContainer/SettingsPanel/VBox/SaveLoadBox/SaveProgressButton
@onready var load_button = $VBoxContainer/SettingsPanel/VBox/SaveLoadBox/LoadButton

# Settings input nodes
@onready var size_input = $VBoxContainer/SettingsPanel/VBox/Grid/SizeInput
@onready var mov_input = $VBoxContainer/SettingsPanel/VBox/Grid/MovInput
@onready var rot_input = $VBoxContainer/SettingsPanel/VBox/Grid/RotInput
@onready var clr_input = $VBoxContainer/SettingsPanel/VBox/Grid/ClrInput
@onready var pct_input = $VBoxContainer/SettingsPanel/VBox/Grid/PctInput
@onready var pnt_input = $VBoxContainer/SettingsPanel/VBox/Grid/PntInput


func _ready():
	# Connect the button 'pressed' signals to their respective functions.
	settings_button.pressed.connect(_on_settings_button_pressed)
	help_button.pressed.connect(_on_help_button_pressed)
	new_game_button.pressed.connect(_on_new_game_button_pressed)
	toggle_vr_button.pressed.connect(_on_toggle_vr_button_pressed)
	new_game_settings_button.pressed.connect(_on_new_game_button_pressed)
	save_progress_button.pressed.connect(_on_save_progress_button_pressed)
	load_button.pressed.connect(_on_load_button_pressed)

	# Hide panels by default
	settings_panel.visible = false
	help_panel.visible = false

func _on_settings_button_pressed():
	settings_panel.visible = not settings_panel.visible
	help_panel.visible = false # Hide other panel

func _on_help_button_pressed():
	help_panel.visible = not help_panel.visible
	settings_panel.visible = false # Hide other panel

func _on_new_game_button_pressed():
	win_label.visible = false
	# When a new game is requested, gather all settings from the input fields.
	var settings = {
		"wdh": int(size_input.text),
		"hgt": int(size_input.text), # Assuming square grid like original
		"mov": int(mov_input.text),
		"rot": int(rot_input.text),
		"clr": int(clr_input.text),
		"pct": int(pct_input.text),
		"pnt": int(pnt_input.text)
	}
	# Emit the signal with the settings dictionary.
	emit_signal("new_game_pressed", settings)

	# Hide the panels after starting a new game.
	settings_panel.visible = false
	help_panel.visible = false

func _on_save_progress_button_pressed():
	emit_signal("save_progress_pressed")

func _on_load_button_pressed():
	emit_signal("load_game_pressed")

func _on_toggle_vr_button_pressed():
	emit_signal("toggle_vr_pressed")

func show_win_message():
	win_label.visible = true
