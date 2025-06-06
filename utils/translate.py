# utils/translate.py

from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer
from langdetect import detect, DetectorFactory, LangDetectException

# For reproducible language detection
DetectorFactory.seed = 0

# Cache model and tokenizer globally to avoid reloading every call
_m2m100_model = None
_m2m100_tokenizer = None

def _load_m2m100_model_tokenizer():
    global _m2m100_model, _m2m100_tokenizer
    if _m2m100_model is None or _m2m100_tokenizer is None:
        print("Loading M2M100 model and tokenizer...")
        _m2m100_model = M2M100ForConditionalGeneration.from_pretrained("facebook/m2m100_418M")
        _m2m100_tokenizer = M2M100Tokenizer.from_pretrained("facebook/m2m100_418M")
    return _m2m100_model, _m2m100_tokenizer

def translate_text(text, source_lang='auto', target_lang='en'):
    """
    Translate text using M2M100 model.

    Args:
        text (str): Input text to translate.
        source_lang (str): Source language code (e.g. 'en', 'hi'), or 'auto' for auto detection.
        target_lang (str): Target language code (e.g. 'en', 'hi').

    Returns:
        str: Translated text or original text if translation fails or not needed.
    """
    if not text or not text.strip():
        print(f"DEBUG (translate_text): Empty or whitespace-only input, returning original.")
        return text

    actual_source_lang = source_lang

    # Detect source language if 'auto'
    if source_lang == 'auto':
        try:
            detected_lang = detect(text)
            actual_source_lang = detected_lang
            print(f"DEBUG (translate_text): Auto-detected source language '{actual_source_lang}' for text: '{text[:50]}...'")
        except LangDetectException:
            print(f"WARNING (translate_text): Language detection failed, defaulting to 'en'.")
            actual_source_lang = 'en'
        except Exception as e:
            print(f"ERROR (translate_text): Exception in language detection: {e}, defaulting to 'en'.")
            actual_source_lang = 'en'

    # If source and target are same, skip translation
    if actual_source_lang == target_lang:
        print(f"DEBUG (translate_text): Source and target language both '{actual_source_lang}', no translation needed.")
        return text

    # Load model and tokenizer
    model, tokenizer = _load_m2m100_model_tokenizer()

    try:
        tokenizer.src_lang = actual_source_lang
        encoded = tokenizer(text, return_tensors="pt")
        generated_tokens = model.generate(**encoded, forced_bos_token_id=tokenizer.get_lang_id(target_lang))
        translated_text = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        print(f"DEBUG (translate_text): Successfully translated to: '{translated_text[:60]}...'")
        return translated_text
    except Exception as e:
        print(f"ERROR (translate_text): Translation failed: {e}. Returning original text.")
        return text
