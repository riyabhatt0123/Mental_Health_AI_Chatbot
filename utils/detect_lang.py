# utils/detect_lang.py
from langdetect import detect, DetectorFactory, LangDetectException

# Ensure reproducibility for langdetect
DetectorFactory.seed = 0

def detect_language(text):
    """
    Detects the language of the given text.
    Returns a 2-letter ISO language code (e.g., 'en', 'hi', 'fr') or None if detection fails.
    """
    if not text or not text.strip():
        print(f"DEBUG (detect_language): Empty text received for detection.")
        return None
    try:
        detected_lang = detect(text)
        print(f"DEBUG (detect_language): Detected '{detected_lang}' for text: '{text[:50]}...'")
        return detected_lang
    except LangDetectException as e:
        print(f"ERROR (detect_language): Language detection failed: {e} for text: '{text[:50]}...'")
        return None
    except Exception as e:
        print(f"ERROR (detect_language): An unexpected error occurred during language detection: {e}")
        return None

