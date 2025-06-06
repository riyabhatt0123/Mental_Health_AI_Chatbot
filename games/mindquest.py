# games/mindquest.py
from flask import Blueprint, render_template, session, jsonify, request, redirect, url_for
import random

mindquest_bp = Blueprint('mindquest', __name__)

# Define the activities for the game
activity_pool = [
    {"scene": "forest", "question": "What emotion are you carrying today?", "type": "input"},
    {"scene": "mountain", "question": "Click to jump over 3 negative thoughts", "type": "click"},
    {"scene": "sky", "question": "Hold spacebar to take a breath", "type": "breath"},
    {"scene": "lake", "question": "Pick a calming sound", "type": "choice", "options": ["Rain", "Waves", "Wind"]},
    {"scene": "garden", "question": "Match a color with your mood", "type": "color"},
    {"scene": "river", "question": "Type one thing you’re grateful for", "type": "input"}
]

# Route for the game's home page
@mindquest_bp.route('/mindquest')
def mindquest_home():
    # Initialize game progress and select ALL activities for the session
    # This ensures the progress bar can accurately represent completion of all tasks.
    session['mq_progress'] = 0
    session['mq_activities'] = random.sample(activity_pool, k=len(activity_pool))
    return render_template('mindquest.html')

# Route to get the next activity
@mindquest_bp.route('/mindquest/next')
def next_activity():
    index = session.get('mq_progress', 0)
    activities = session.get('mq_activities', [])

    if index < len(activities):
        # Return the current activity data
        return jsonify(activities[index])
    else:
        # Game completed message
        return jsonify({"done": True, "message": "🎉 You've completed Mind Quest!"})

# Route to submit a response and advance progress
@mindquest_bp.route('/mindquest/submit', methods=['POST'])
def submit_activity():
    # For this simple game, any response is considered success
    # In a more complex game, you'd validate user_response here
    session['mq_progress'] = session.get('mq_progress', 0) + 1

    return jsonify({"success": True}) # Indicate success

# Redirect old treasure path to mindquest home
@mindquest_bp.route('/treasure')
def redirect_old():
    return redirect(url_for('mindquest.mindquest_home'))