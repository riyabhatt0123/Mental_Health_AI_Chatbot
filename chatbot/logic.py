# chatbot/logic.py
import requests
from chatbot.nlp_engine import detect_condition
from chatbot.techniques import get_techniques_by_condition

# Global chat history for context retention
chat_history = []

def chatbot_response(user_input):
    user_input = user_input.strip().lower()

    # Friendly greeting
    if user_input in ["hi", "hello", "hey"]:
        return "Hello! How are you feeling today? I'm here to support you."

    # Detect condition from input
    condition = detect_condition(user_input)

    if condition:
        techniques = get_techniques_by_condition(condition)
        return call_ollama_for_reply(user_input, condition, techniques)

    return call_ollama_for_reply(user_input)

def call_ollama_for_reply(user_input, condition=None, techniques=None):
    global chat_history

    try:
        # Keep chat history to a manageable length for context
        chat_history = chat_history[-4:] if len(chat_history) > 4 else chat_history
        
        # This will be appended later, after the system message
        # We append the user's message here to manage chat_history for context correctly
        # This user message will be added to the messages list for Ollama below
        # but also kept in chat_history for future turns.
        current_user_message = {"role": "user", "content": user_input}


        system_prompt = (
            "You are a warm, compassionate mental health chatbot named **Rini**. "
            "Always refer to yourself as Rini when asked or when it feels natural to do so. "
            "Your primary goal is to provide compassionate support and information related to mental well-being. "
            "Always respond with empathy and reflect the user's feelings. "
            "Focus on active listening and providing supportive, non-judgmental replies. "
            "Keep responses extremely concise, typically 1-2 short sentences. Prioritize clarity over complexity. "
            "Avoid repetition, don't give generic advice. Never sound robotic. "
            "Use simple, caring language like a trusted human guide. "
            "Offer supportive words and, if appropriate, suggest brief techniques. "
            # MINOR REINFORCEMENT: Emphasize 'grammatically correct' more explicitly at the start of this instruction.
            "MOST IMPORTANT: When generating responses, ensure they are **grammatically correct**, use very basic, simple, and direct English sentences. Use short words and avoid complex grammar. This is crucial for accurate translation into other languages."
        )

        if condition and techniques:
            system_prompt += f"\n\nUser might be experiencing {condition}. These techniques may help: {techniques}"

        # Construct the messages list for Ollama
        messages = [
            {"role": "system", "content": system_prompt.strip()}
        ]
        
        # Add historical messages for context
        messages.extend(chat_history)
        
        # Add the current user message
        messages.append(current_user_message)


        ollama_model_name = "mistral" # Ensure this matches your 'ollama list' output, no trailing spaces

        print(f"DEBUG (logic.py): Sending request to Ollama with model: '{ollama_model_name}'")

        response = requests.post(
            "http://localhost:11435/api/chat",
            json={
                "model": ollama_model_name, # Use the variable for consistency
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "top_k": 40,
                    "num_predict": 200 # Reduced num_predict to enforce shorter responses
                }
            },
            timeout=120
        )
        response.raise_for_status()

        reply = response.json().get("message", {}).get("content", "").strip()

        if not reply:
            raise ValueError("No content in reply from Ollama model.")

        # Append the user's current message and bot's reply to the global chat history
        # We add current_user_message here to ensure it's part of chat_history only after a successful response
        chat_history.append(current_user_message)
        chat_history.append({"role": "assistant", "content": reply})
        
        return reply

    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama request error in logic.py: {e}")
        if "404 Client Error" in str(e) or "model not found" in str(e).lower():
            return "I'm sorry, it seems the AI model is not available or cannot be found. Please ensure Ollama is running and the correct model is pulled."
        return "I'm sorry, I'm having trouble connecting to the AI model right now. Please try again in a moment."
    except ValueError as e:
        print(f"❌ Ollama response processing error in logic.py: {e}")
        return "I'm sorry, I couldn't generate a clear response from the AI model. Can you please rephrase?"
    except Exception as e:
        print(f"❌ An unexpected error occurred in logic.py: {e}")
        return "An unexpected error occurred with the AI model. Please try again."
