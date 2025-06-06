# utils/db_utils.py
import sqlite3
import os

DATABASE_PATH = 'mental_health.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create user table
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )''')

    # Create chat history table (add username for tracking)
    cursor.execute('''CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        user_msg TEXT,
        bot_reply TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Create game progress table (add username for tracking)
    cursor.execute('''CREATE TABLE IF NOT EXISTS game_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        game TEXT,
        score INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()
    conn.close()

def save_game_progress(username, game_name, score):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO game_progress (username, game, score) VALUES (?, ?, ?)
        ''', (username, game_name, score))
        conn.commit()
    except Exception as e:
        print(f"Error saving game progress for user {username}, game {game_name}: {e}")
        conn.rollback()
    finally:
        conn.close()

def get_virtual_badge(score):
    if score >= 90:
        badge = "🏆 Champion of Calm"
        message = "Outstanding! You’ve mastered the path of peace."
    elif score >= 75:
        badge = "🌟 Serenity Star"
        message = "Great job! You’re progressing well on your journey."
    elif score >= 50:
        badge = "💪 Resilience Hero"
        message = "Keep it up! Every effort counts."
    else:
        badge = "🌱 Fresh Start"
        message = "Don’t worry — tomorrow is a new beginning."

    return {
        'badge': badge,
        'message': message
    }