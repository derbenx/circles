extends Node3D

# GameBoard Scene Script
#
# This script is responsible for creating the visual representation of the
# entire game board. It reads the puzzle data from the GameManager singleton
# and instantiates a GamePiece scene for each tile, telling each piece
# what to look like.

# Preload the scene for the individual game pieces
const GamePiece = preload("res://GamePiece.tscn")

# The physical distance between the centers of adjacent pieces
var piece_spacing = 1.2

func _ready():
    # When the board first loads, draw the initial puzzle.
    draw_board()

func draw_board():
    # This function clears the board and then rebuilds it from the GameManager's data.
    # It's called on ready and also by the UI when a new game is started.

    # Clear any pieces from a previous game
    for child in get_children():
        child.queue_free()

    # Get the grid data from the manager
    var grid = GameManager.grid
    var grid_size = GameManager.grid_size

    if grid.is_empty():
        print("GameBoard: Grid is empty, nothing to draw.")
        return

    # Center the board
    var board_width = grid_size.x * piece_spacing
    var board_height = grid_size.y * piece_spacing
    self.position = Vector3(-board_width / 2.0 + piece_spacing/2, 0, -board_height / 2.0 + piece_spacing/2)

    # Loop through the grid and create a piece for each cell
    for y in range(grid_size.y):
        for x in range(grid_size.x):
            var piece_data = GameManager.get_piece(x, y)

            # Only create a visual for non-empty pieces
            if not piece_data.begins_with("0"):
                var piece_instance = GamePiece.instantiate()

                # Position the piece in the grid
                piece_instance.position = Vector3(x * piece_spacing, 0, y * piece_spacing)

                # Add it to the scene
                add_child(piece_instance)

                # Tell the piece to generate its 3D model based on its data
                piece_instance.generate(piece_data)

                # Add metadata to the piece for easy identification later
                piece_instance.set_meta("grid_pos", Vector2i(x, y))

    print("GameBoard: Drew ", get_child_count(), " pieces.")

func update_piece(x: int, y: int):
    # Finds a specific piece on the board by its grid coordinates and tells it to
    # regenerate its visuals. This is useful after a piece has been rotated.
    for child in get_children():
        if child.get_meta("grid_pos") == Vector2i(x, y):
            var piece_data = GameManager.get_piece(x, y)
            child.generate(piece_data) # Regenerate to show the change
            break
