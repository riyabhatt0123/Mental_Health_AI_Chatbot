# games/game2048.py
from flask import Blueprint, render_template

# Create a Blueprint for the 2048 game
game2048_bp = Blueprint('game2048', __name__)

@game2048_bp.route('/game2048')
def game2048_route():
    """
    Renders the 2048 game HTML template.
    """
    return render_template('game2048.html')

