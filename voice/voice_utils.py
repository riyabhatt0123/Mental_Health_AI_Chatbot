# voice/voice_utils.py
import speech_recognition as sr
from gtts import gTTS
import os
import uuid
from langdetect import detect, DetectorFactory, LangDetectException

# Ensure reproducibility for langdetect (optional, but good for consistency)
DetectorFactory.seed = 0

# Ensure the static/audio directory exists for TTS output
AUDIO_DIR = os.path.join('static', 'audio') # Correctly define AUDIO_DIR relative to app.py
os.makedirs(AUDIO_DIR, exist_ok=True)

def recognize_speech_from_audio_file(audio_path):
    """Recognizes speech from a given audio file path."""
    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(audio_path) as source:
            audio = recognizer.record(source)
        text = recognizer.recognize_google(audio)
        try:
            detected_language = detect(text)
        except LangDetectException:
            detected_language = 'en' # Default if language detection fails
        return {'text': text, 'language': detected_language}
    except sr.UnknownValueError:
        print("Google Speech Recognition could not understand audio from file")
        return {'text': '', 'language': 'unknown_speech'}
    except sr.RequestError as e:
        print(f"Could not request results from Google Speech Recognition service; {e}")
        return {'text': '', 'language': 'error', 'error_message': str(e)}
    except Exception as e:
        print(f"General error during speech recognition from file: {e}")
        return {'text': '', 'language': 'error', 'error_message': f"General error: {e}"}

def recognize_speech_from_microphone(lang='en'):
    """Recognizes speech directly from the microphone."""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening (microphone)...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        try:
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
        except sr.WaitTimeoutError:
            print("No speech detected from microphone.")
            return "", "en"

    try:
        text = recognizer.recognize_google(audio, language=lang)
        try:
            detected_lang = detect(text)
        except LangDetectException:
            detected_lang = lang
        return text, detected_lang
    except sr.UnknownValueError:
        print("Google Speech Recognition could not understand audio from microphone")
        return "", lang
    except sr.RequestError as e:
        print(f"Could not request results from Google Speech Recognition service; {e}")
        return "", lang
    except Exception as e:
        print(f"An unexpected error occurred during microphone input: {e}")
        return "", lang

def speak_text(text, lang='en'):
    """Generates an MP3 audio file from text and returns its path."""
    try:
        tts = gTTS(text=text, lang=lang)
        # Create a unique filename and ensure it's saved in the correct directory
        filename = os.path.join(AUDIO_DIR, f"{uuid.uuid4()}.mp3")
        tts.save(filename)
        print(f"Generated audio file: {filename}") # Log the generated file path
        return filename
    except Exception as e:
        print(f"Error generating speech for text: '{text[:50]}...': {e}")
        return None
