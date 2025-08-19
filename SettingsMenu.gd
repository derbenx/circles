extends PanelContainer

# Settings Menu UI Script
#
# This script is attached to the root of the SettingsMenu scene. It handles
# all the logic for the UI, such as responding to button presses. When the
# "New Game" button is clicked, it gathers all the chosen settings and tells
# the GameManager to generate and start a new puzzle.

@onready var size_input = $MarginContainer/VBoxContainer/GridContainer/SizeInput
@onready var movement_input = $MarginContainer/VBoxContainer/GridContainer/MovementInput
@onready var rotation_input = $MarginContainer/VBoxContainer/GridContainer/RotationInput
@onready var colors_input = $MarginContainer/VBoxContainer/GridContainer/ColorsInput

@onready var simple_button = $MarginContainer/VBoxContainer/HBoxPresets/SimpleButton
@onready var easy_button = $MarginContainer/VBoxContainer/HBoxPresets/EasyButton
@onready var medium_button = $MarginContainer/VBoxContainer/HBoxPresets/MediumButton
@onready var hard_button = $MarginContainer/VBoxContainer/HBoxPresets/HardButton
@onready var new_game_button = $MarginContainer/VBoxContainer/NewGameButton

# Corresponds to the 'lvl' array in the original js.js
const presets = {
    "simple": {"size": "3", "mov": "2", "rot": "0", "clr": "4"},
    "easy":   {"size": "4", "mov": "2", "rot": "1", "clr": "5"},
    "medium": {"size": "5", "mov": "4", "rot": "1", "clr": "4"},
    "hard":   {"size": "6", "mov": "4", "rot": "3", "clr": "3"},
}

func _ready():
    # Connect signals
    simple_button.pressed.connect(_on_preset_button_pressed.bind("simple"))
    easy_button.pressed.connect(_on_preset_button_pressed.bind("easy"))
    medium_button.pressed.connect(_on_preset_button_pressed.bind("medium"))
    hard_button.pressed.connect(_on_preset_button_pressed.bind("hard"))
    new_game_button.pressed.connect(_on_new_game_button_pressed)

func _on_preset_button_pressed(preset_name: String):
    # Called when a preset button ("Simple", "Easy", etc.) is pressed.
    # It populates the input fields with the corresponding values.
    var preset = presets[preset_name]
    size_input.text = preset["size"]
    movement_input.text = preset["mov"]
    rotation_input.text = preset["rot"]
    colors_input.text = preset["clr"]
    print("Loaded preset: ", preset_name)

func _on_new_game_button_pressed():
    # Called when the "New Game" button is pressed.
    # 1. Gather settings from the UI fields
    var new_settings = {
        "wdh": int(size_input.text),
        "hgt": int(size_input.text), # Assuming square board from original UI
        "mov": int(movement_input.text),
        "rot": int(rotation_input.text),
        "clr": int(colors_input.text),
        # Using default values for pct and pnt for now
        "pct": 55,
        "pnt": 1
    }

    # 2. Update the GameManager's settings
    GameManager.settings = new_settings

    # 3. Tell the GameManager to start a new game
    GameManager.new_game()

    # 4. Tell the game board to redraw itself
    # In a real project, this would be done via signals, but a direct call is fine for this structure.
    get_tree().get_root().get_node("Main/GameBoard").draw_board()

    print("Starting new game with settings: ", new_settings)

    # Optional: hide the menu after starting a game
    # self.visible = false

func _gui_input(event: InputEvent):
    if event is InputEventMouseMotion:
        %Cursor.position = event.position - (%Cursor.size / 2) # Center the cursor
