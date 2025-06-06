# chatbot/nlp_engine.py

def detect_condition(user_input):
    input_text = user_input.lower()

    condition_keywords = {
        "anxiety": ["anxious", "nervous", "worried", "panic", "uneasy", "overthinking"],
        "depression": ["sad", "empty", "hopeless", "depressed", "unmotivated", "worthless", "no interest"],
        "stress": ["stressed", "burnt out", "pressured", "overwhelmed", "tense"],
        "insomnia": ["can't sleep", "no sleep", "insomnia", "sleeping issues"],
        "anger": ["angry", "furious", "rage", "irritated", "annoyed", "mad"],
        "loneliness": ["lonely", "isolated", "no one", "left out", "abandoned"]
    }

    matches = {}
    for condition, keywords in condition_keywords.items():
        matches[condition] = sum(1 for keyword in keywords if keyword in input_text)

    # Only return if there are 2 or more matching keywords
    likely_condition = max(matches, key=matches.get)
    if matches[likely_condition] >= 2:
        return likely_condition

    return None



