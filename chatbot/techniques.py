# chatbot/techniques.py

def get_techniques_by_condition(condition):
    condition = condition.lower()

    techniques_data = {
        "depression": [
            "1. Practice mindfulness and meditation daily.",
            "2. Engage in light exercise like walking or yoga.",
            "3. Maintain a healthy sleep schedule.",
            "4. Try journaling to express your thoughts.",
            "5. Connect with supportive friends or family.",
            "6. Avoid alcohol and limit screen time.",
            "7. Listen to calming music or nature sounds.",
            "8. Establish a daily routine.",
            "9. Set achievable goals.",
            "10. Seek professional counseling if needed."
        ],
        "anxiety": [
            "1. Try deep breathing techniques (4-7-8 method).",
            "2. Avoid caffeine and sugar.",
            "3. Use grounding techniques (5-4-3-2-1 method).",
            "4. Practice progressive muscle relaxation.",
            "5. Do short bursts of aerobic exercise.",
            "6. Visualize a safe and calming place.",
            "7. Engage in regular physical activity.",
            "8. Maintain a consistent sleep schedule.",
            "9. Limit caffeine and alcohol intake.",
            "10. Consider mindfulness meditation."
        ],
        "stress": [
            "1. Take short breaks and stretch.",
            "2. Avoid multitasking, prioritize tasks.",
            "3. Drink water and eat small healthy snacks.",
            "4. Write down what's worrying you.",
            "5. Take a short walk in fresh air.",
            "6. Identify stress triggers.",
            "7. Practice relaxation techniques.",
            "8. Maintain a healthy diet.",
            "9. Engage in hobbies and leisure activities."
        ],
        "insomnia": [
            "1. Create a relaxing bedtime routine.",
            "2. Ensure your sleep environment is dark, quiet, and cool.",
            "3. Avoid large meals, caffeine, and alcohol before bed.",
            "4. Limit naps during the day.",
            "5. Go to bed and wake up at the same time each day, even on weekends."
        ],
        "anger": [
            "1. Count to 10 before reacting.",
            "2. Practice breathing slowly.",
            "3. Step away from the situation.",
            "4. Use humor or distraction to shift your mind.",
            "5. Write down what you're feeling to understand triggers.",
            "6. Express your anger assertively, not aggressively."
        ],
        "loneliness": [
            "1. Join a support group or online community.",
            "2. Volunteer for a cause you care about.",
            "3. Schedule regular virtual calls with friends/family.",
            "4. Take a class or course online.",
            "5. Adopt a pet if possible.",
            "6. Reach out to old friends or acquaintances."
        ]
    }

    # Format the techniques as a single string
    techniques_list = techniques_data.get(condition, ["I'm sorry, I don't have specific techniques for that condition yet. Would you like to talk about something else?"])
    return "\n".join(techniques_list)