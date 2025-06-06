# games/snake.py
from flask import Blueprint, render_template

# Create a Blueprint for the Snake game
snake_bp = Blueprint('snake', __name__)

@snake_bp.route('/snake')
def snake_route():
    """
    Renders the Snake game HTML template.
    """
    return render_template('snake.html')

