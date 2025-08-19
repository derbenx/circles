extends Node

# GameManager Singleton
#
# This script is an autoloaded singleton that manages the entire game state.
# It holds the current puzzle grid, handles the creation of new games,
# and contains the core rules for piece manipulation and puzzle solving.
# It acts as the central "source of truth" for the game's data model.

var grid: Array = []
var grid_size: Vector2i = Vector2i.ZERO
var colors: String = ""

# Default settings, can be changed by the UI
var settings = {
    "wdh": 4, "hgt": 4, "mov": 2, "rot": 1, "clr": 5, "pct": 55, "pnt": 1
}

func _ready():
    # Initialize the random number generator
    randomize()
    # Start a new game on launch
    new_game()

func new_game():
    # Called by the UI to start a new game with the current settings.
    var puzzle_data = PuzzleGenerator.generate_puzzle(settings)
    grid = puzzle_data["grid"]
    grid_size = Vector2i(puzzle_data["xx"], puzzle_data["yy"])
    colors = puzzle_data["col"]

    print("New game started: ", grid_size.x, "x", grid_size.y)
    #print(grid)

    # In a real game, we would now emit a signal to tell the game board to update
    # emit_signal("game_started", grid)

func get_piece(x: int, y: int) -> String:
    if x >= 0 and x < grid_size.x and y >= 0 and y < grid_size.y:
        return grid[x][y]
    return ""

func set_piece(x: int, y: int, data: String):
    if x >= 0 and x < grid_size.x and y >= 0 and y < grid_size.y:
        grid[x][y] = data

func move_piece(from_x: int, from_y: int, to_x: int, to_y: int):
    # Attempts to move a piece from one coordinate to another in the data grid.
    var piece_data = get_piece(from_x, from_y)
    if piece_data == "" or piece_data.begins_with("0"):
        return # Cannot move an empty piece

    var target_data = get_piece(to_x, to_y)
    if target_data != "" and target_data.begins_with("0"): # Can only move to an empty space
        set_piece(to_x, to_y, piece_data)
        set_piece(from_x, from_y, "000000")
        print("Moved piece from ", from_x, ",", from_y, " to ", to_x, ",", to_y)
        check_solution()

func rotate_piece(x: int, y: int):
    # Rotates or flips a piece based on its rotation type.
    var piece = get_piece(x, y)
    if piece == "" or piece.begins_with("0"):
        return

    var rot_type = int(piece.substr(1, 1))

    if rot_type == 1: # Rotate 90 degrees clockwise
        var new_piece = piece.substr(0, 2) + piece.substr(3, 1) + piece.substr(4, 1) + piece.substr(5, 1) + piece.substr(2, 1)
        set_piece(x, y, new_piece)
        print("Rotated piece at ", x, ",", y)
    elif rot_type == 2: # Flip vertically (U/D)
        var new_piece = piece.substr(0, 3) + piece.substr(5, 1) + piece.substr(4, 1) + piece.substr(3, 1)
        set_piece(x, y, new_piece)
        print("Flipped U/D piece at ", x, ",", y)
    elif rot_type == 3: # Flip horizontally (L/R)
        var new_piece = piece.substr(0, 2) + piece.substr(4, 1) + piece.substr(3, 1) + piece.substr(2, 1) + piece.substr(5, 1)
        set_piece(x, y, new_piece)
        print("Flipped L/R piece at ", x, ",", y)

    check_solution()

func check_solution() -> bool:
    # Iterates through the entire grid to check if all connections match.
    # This is the primary win condition logic.
    for y in range(grid_size.y):
        for x in range(grid_size.x):
            var piece = get_piece(x, y)
            if piece == "" or piece.begins_with("0"):
                continue

            var tags = piece.substr(2, 4)
            var connections = 0

            # Check Left
            if tags[0] != "0":
                if x > 0:
                    var neighbor = get_piece(x - 1, y)
                    if neighbor.substr(4, 1) != tags[0]: return false
                    connections += 1
                else: # Edge piece with an outward connection
                    return false

            # Check Up
            if tags[1] != "0":
                if y > 0:
                    var neighbor = get_piece(x, y - 1)
                    if neighbor.substr(5, 1) != tags[1]: return false
                    connections += 1
                else:
                    return false

            # Check Right
            if tags[2] != "0":
                if x < grid_size.x - 1:
                    var neighbor = get_piece(x + 1, y)
                    if neighbor.substr(2, 1) != tags[2]: return false
                    connections += 1
                else:
                    return false

            # Check Down
            if tags[3] != "0":
                if y < grid_size.y - 1:
                    var neighbor = get_piece(x, y + 1)
                    if neighbor.substr(3, 1) != tags[3]: return false
                    connections += 1
                else:
                    return false

            # Every piece must be connected to something
            if connections == 0:
                return false

    print("PUZZLE SOLVED!")
    # emit_signal("puzzle_solved")
    return true
