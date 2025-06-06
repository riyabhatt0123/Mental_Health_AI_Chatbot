# app.py
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory, Response, stream_with_context
import os
import secrets
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import ollama
import json
import random


# Import centralized utilities (assuming these paths are correct relative to app.py)
from utils.db_utils import get_db_connection, save_game_progress, get_virtual_badge, init_db
from voice.voice_utils import speak_text, AUDIO_DIR
from chatbot.logic import chatbot_response as generate_chatbot_response
from utils.detect_lang import detect_language
from utils.translate import translate_text


# Import blueprints for games (keeping existing ones - NO CHANGES HERE)
from games.snake import snake_bp
from games.mindquest import mindquest_bp
from games.game2048 import game2048_bp
from games.perplexus import perplexus_bp


app = Flask(__name__)
app.secret_key = secrets.token_hex(24)
app.config['DATABASE'] = 'mental_health.db'



# Ollama model name (e.g., llama3, mistral, etc.)
OLLAMA_MODEL = "mistral"  # or whichever model you're using


# Register Blueprints with url_prefix for proper routing (UNCHANGED)
app.register_blueprint(mindquest_bp)
app.register_blueprint(snake_bp)
app.register_blueprint(game2048_bp)
app.register_blueprint(perplexus_bp)


# Initialize database on app startup (UNCHANGED)
with app.app_context():
    init_db()

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )


# --- User Authentication Routes (UNCHANGED) ---
@app.route('/')
def home():
    if 'username' in session and session['username']:
        return redirect(url_for('chat_page'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            hashed_password = generate_password_hash(password)
            cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                           (username, hashed_password))
            conn.commit()
            return render_template('login.html', message="Registration successful! Please login.")
        except sqlite3.IntegrityError:
            return render_template('register.html', error="Username already exists. Please choose a different one.")
        finally:
            conn.close()
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection()
        cursor = conn.cursor()
        user = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()

        if user:
            if check_password_hash(user['password'], password):
                session['username'] = user['username']
                session['loggedin'] = True
                return redirect(url_for('chat_page'))
            else:
                return render_template('login.html', error="Invalid username or password.")
        else:
            return render_template('login.html', error="Invalid username or password.")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('loggedin', None)
    return redirect(url_for('home'))

# --- Chat Page Route (UNCHANGED) ---
@app.route('/chat', methods=['GET', 'POST'])
def chat_page():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session['username'])

# --- View Badges Route (UNCHANGED) ---
@app.route('/view_badges')
def view_badges():
    if 'username' not in session:
        return redirect(url_for('login'))
    username = session['username']
    return render_template('badges.html', username=username, message="This is where your badges will be displayed!")


# --- Chatbot API Endpoint (UNCHANGED) ---
@app.route('/api/chat', methods=['POST'])
def api_chat_response():
    user_msg_original = request.json.get('msg')
    selected_lang = request.json.get('lang', 'en')

    print(f"\n--- Chat Request Received ---")
    print(f"User Original Message: '{user_msg_original}'")
    print(f"Selected Language from Frontend: '{selected_lang}'")

    if not user_msg_original:
        print("ERROR: No message provided by user.")
        return jsonify({'reply': 'No message provided.'}), 400

    username = session.get('username', 'anonymous')

    source_lang_for_translation = selected_lang
    if selected_lang == 'en' or selected_lang == 'auto':
        detected_user_lang = detect_language(user_msg_original)
        if detected_user_lang:
            source_lang_for_translation = detected_user_lang

    print(f"Determined Source Language for Translation to English: '{source_lang_for_translation}'")

    translated_user_msg_en = translate_text(user_msg_original, source_lang=source_lang_for_translation, target_lang='en')
    print(f"Translated User Message (to English for Ollama): '{translated_user_msg_en}'")

    if not translated_user_msg_en:
        print(f"WARNING: Translation to English failed or returned empty for user input: '{user_msg_original}'. Falling back to original.")
        translated_user_msg_en = user_msg_original

    bot_reply_en = ""
    try:
        bot_reply_en = generate_chatbot_response(translated_user_msg_en)
        print(f"Bot Reply (from Ollama in English): '{bot_reply_en}'")
    except requests.exceptions.ConnectionError as e:
        print(f"CRITICAL ERROR: Ollama connection failed: {e}. Is 'ollama serve' running?")
        bot_reply_en = "I'm sorry, I cannot connect to the AI model right now. Please ensure Ollama is running and try again."
    except Exception as e:
        print(f"ERROR: An unexpected error occurred during Ollama response generation: {e}")
        bot_reply_en = "I'm sorry, I'm having trouble generating a response at the moment. Please try again."


    bot_reply_translated = translate_text(bot_reply_en, source_lang='en', target_lang=selected_lang)
    print(f"Translated Bot Reply (to selected language '{selected_lang}'): '{bot_reply_translated}'")

    final_reply_to_send = bot_reply_translated if bot_reply_translated else bot_reply_en
    print(f"Final Reply to Send to Frontend: '{final_reply_to_send}'")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chat_history (username, user_msg, bot_reply) VALUES (?, ?, ?)",
                   (username, user_msg_original, final_reply_to_send))
    conn.commit()
    conn.close()
    print(f"--- Chat Request Processed ---\n")

    return jsonify({'reply': final_reply_to_send})


# --- Text-to-Speech Endpoint (UNCHANGED) ---
@app.route('/speak', methods=['GET'])
def speak():
    text = request.args.get('text')
    lang = request.args.get('lang', 'en')
    if not text:
        return "No text provided", 400

    try:
        full_audio_filepath = speak_text(text, lang=lang)

        if full_audio_filepath and os.path.exists(full_audio_filepath):
            file_directory = AUDIO_DIR
            file_basename = os.path.basename(full_audio_filepath)

            print(f"Serving audio from directory: {file_directory}, filename: {file_basename}")
            return send_from_directory(file_directory, file_basename, mimetype="audio/mpeg")
        else:
            print(f"Error: Audio file not found or not generated for text: '{text[:50]}...'")
            return "Error generating speech audio", 500
    except Exception as e:
        print(f"Error in TTS endpoint: {e}")
        return "Error generating speech", 500


# --- Server-Side Speech Recognition Endpoint (UNCHANGED) ---
@app.route('/listen_from_mic_api', methods=['POST'])
def listen_from_mic_api():
    return jsonify({'error': 'Server-side microphone recognition not fully implemented.'}), 501


# --- Game API Endpoints (UNCHANGED) ---
@app.route('/submit_score', methods=['POST'])
def submit_score():
    if 'loggedin' not in session or not session['loggedin']:
        return jsonify({'error': 'Please log in to submit score.'}), 401

    data = request.get_json()
    score = data.get('score', 0)
    game = data.get('game', 'unknown')
    username = session['username']

    save_game_progress(username, game, score)
    badge_info = get_virtual_badge(score)

    return jsonify(badge_info)





# Print all registered routes for debugging
for rule in app.url_map.iter_rules():
    print(f"🔗 {rule.rule} -> {rule.endpoint}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)

