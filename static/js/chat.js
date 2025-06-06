let recognizing = false;
let recognition;
let voiceEnabled = true;
let currentAudio = null;

function appendMessage(message, sender) {
  const chatBox = document.getElementById("chat-box");
  const messageContainer = document.createElement("div");
  messageContainer.className = `message-container ${sender}-message-container`;

  const messageDiv = document.createElement("div");
  messageDiv.className = `${sender}-message`;
  messageDiv.innerHTML = message;

  messageContainer.appendChild(messageDiv);
  chatBox.appendChild(messageContainer);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showLoadingIndicator() {
  const chatBox = document.getElementById("chat-box");
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loading-indicator";
  loadingDiv.className = "loading-indicator bot-message-container";
  loadingDiv.innerHTML = '<div class="bot-message"><span>.</span><span>.</span><span>.</span></div>';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function hideLoadingIndicator() {
  const loadingDiv = document.getElementById("loading-indicator");
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const voiceBtn = document.getElementById('voice-toggle-btn');
  if (voiceEnabled) {
    voiceBtn.textContent = '🔊 Voice ON';
    voiceBtn.classList.add('active');
  } else {
    voiceBtn.textContent = '🔇 Voice OFF';
    voiceBtn.classList.remove('active');
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }
}

function getSelectedLanguage() {
  const langSelect = document.getElementById('language-select');
  return langSelect.value;
}

function sendMessage() {
  const userInput = document.getElementById("user-input");
  const message = userInput.value.trim();
  const selectedLang = getSelectedLanguage(); // <--- This sends the selected language

  if (!message) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  appendMessage(message, "user");
  userInput.value = "";
  
  showLoadingIndicator();

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg: message, lang: selectedLang }) // <--- Here it's sent
  })
  .then(response => response.json())
  .then(data => {
    hideLoadingIndicator();
    if (data.reply) {
      appendMessage(data.reply, "bot");

      if (voiceEnabled && data.reply.trim() !== '') {
        const speakUrl = "/speak?text=" + encodeURIComponent(data.reply) + "&lang=" + encodeURIComponent(selectedLang);
        currentAudio = new Audio(speakUrl);
        currentAudio.play().catch(e => console.error("Error playing audio:", e));
      } else {
        currentAudio = null;
      }
    } else {
      appendMessage("Sorry, I didn't understand that.", "bot");
    }
  })
  .catch((error) => {
    hideLoadingIndicator();
    console.error("Error sending message:", error);
    appendMessage("There was a problem connecting to the server. Please check Ollama and Flask server.", "bot");
  });
}

function startListening() {
  if (!('webkitSpeechRecognition' in window)) {
    const chatBox = document.getElementById("chat-box");
    const errorMessageDiv = document.createElement("div");
    errorMessageDiv.className = "bot-message-container";
    errorMessageDiv.innerHTML = '<div class="bot-message">Speech recognition not supported in your browser. Please use Chrome for voice input.</div>';
    chatBox.appendChild(errorMessageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return;
  }

  const selectedLang = getSelectedLanguage();

  if (!recognition) {
    recognition = new webkitSpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognizing = true;
      document.getElementById("voice-status").textContent = "🎙️ Listening...";
    };

    recognition.onend = () => {
      recognizing = false;
      document.getElementById("voice-status").textContent = "";
    };

    recognition.onerror = (event) => {
      recognizing = false;
      document.getElementById("voice-status").textContent = "❌ Error: " + event.error;
      console.error("Speech recognition error:", event.error);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("user-input").value = transcript;
      sendMessage();
    };
  }
  
  recognition.lang = selectedLang; // <--- This sets the STT language

  if (!recognizing) {
    recognition.start();
  } else {
    recognition.stop();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const voiceBtn = document.getElementById('voice-toggle-btn');
  if (voiceEnabled) {
    voiceBtn.classList.add('active');
  } else {
    voiceBtn.classList.remove('active');
  }

  document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  const profileMenuToggle = document.getElementById('profile-menu-toggle');
  const profileDropdownMenu = document.getElementById('profile-dropdown-menu');

  profileMenuToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      profileDropdownMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
      if (!profileDropdownMenu.contains(event.target) && !profileMenuToggle.contains(event.target)) {
          profileDropdownMenu.classList.add('hidden');
      }
  });
});
