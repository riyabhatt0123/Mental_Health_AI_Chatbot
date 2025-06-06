# games/perplexus.py
from flask import Blueprint, render_template

# Create a Blueprint for the Perplexus Portal game
perplexus_bp = Blueprint('perplexus', __name__)

@perplexus_bp.route('/perplexus')
def perplexus_route():
    """
    Renders the Perplexus Portal game HTML template.
    """
    return render_template('perplexus.html')

