// static/js/mindquest.js
document.addEventListener('DOMContentLoaded', () => {
  // Update IDs here to match the HTML
  const taskBox = document.getElementById('mq-task-box');
  const scene = document.getElementById('mq-scene');
  const progressBar = document.getElementById('mq-progress-bar');
  const totalActivities = 6; // Set this based on the total number of activities in your Python's activity_pool
  let currentProgress = 0;

  // Function to update the progress bar visually
  function updateProgressBar() {
      const percentage = (currentProgress / totalActivities) * 100;
      progressBar.style.width = `${percentage}%`;
  }

  // Function to load the next activity from the backend
  function loadNextTask() {
    fetch('/mindquest/next')
      .then(res => res.json())
      .then(data => {
        if (data.done) {
          // Display completion message
          taskBox.innerHTML = `
            <h3>${data.message}</h3>
            <p>🏅 You’ve earned a Mindful Explorer badge!</p>
            <button class="mq-button" onclick="location.reload()">Start Over</button> `;
          currentProgress = totalActivities; // Ensure progress bar shows 100% when done
          updateProgressBar();
          return;
        }

        currentProgress++; // Increment progress for the newly loaded task
        updateProgressBar(); // Update progress bar on new task load

        // Update background scene image
        scene.style.backgroundImage = `url('/static/images/${data.scene}.jpg')`;

        // Construct HTML for the task based on its type
        let html = `<h3>${data.question}</h3>`;

        if (data.type === 'input') {
          html += `<input type="text" id="response" placeholder="Type here..."/><br>`;
        } else if (data.type === 'choice') {
          html += data.options.map(opt => `<button class="mq-button" onclick="submit('${opt}')">${opt}</button>`).join('');
        } else if (data.type === 'click') {
          html += `<p>Click the button 3 times fast!</p><button id="clicker" class="mq-button">Click me</button>`;
        } else if (data.type === 'color') {
          html += `<input type="color" id="response" /><br>`;
        } else if (data.type === 'breath') {
          html += `<p class="mq-breath-prompt">Hold SPACE for 3 seconds to breathe in...</p>`;
        }

        if (data.type !== 'choice') { // Choice buttons submit directly on click
          html += `<br><button class="mq-button" onclick="submit()">Submit</button>`;
        }

        taskBox.innerHTML = html; // Render the task

        // Add specific event listeners for interactive tasks
        if (data.type === 'click') {
          let count = 0;
          const clickerButton = document.getElementById('clicker');
          clickerButton.addEventListener('click', () => {
            count++;
            clickerButton.textContent = `Clicked ${count} times!`; // Provide immediate feedback
            if (count === 3) submit();
          });
        } else if (data.type === 'breath') {
          let pressed = false;
          let timer;
          const breathPrompt = taskBox.querySelector('.mq-breath-prompt'); // Get the breath prompt element
          document.body.addEventListener('keydown', e => {
            if (e.code === 'Space' && !pressed) {
              e.preventDefault(); // Prevent default spacebar action (like scrolling)
              pressed = true;
              breathPrompt.textContent = "Breathing in... (Hold)"; // Visual feedback
              timer = setTimeout(() => {
                submit(); // Submit after 3 seconds
              }, 3000);
            }
          });
          document.body.addEventListener('keyup', e => {
            if (e.code === 'Space') {
              pressed = false;
              clearTimeout(timer); // Stop timer if spacebar released too early
              breathPrompt.textContent = "Hold SPACE for 3 seconds to breathe in..."; // Reset prompt
            }
          });
        }
      });
  }

  // Global submit function (callable from HTML buttons)
  window.submit = (val = null) => {
    let response = val || document.getElementById('response')?.value || ''; // Get response from input or button value
    fetch('/mindquest/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ response })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
          loadNextTask(); // Load next task on successful submission
      } else {
          alert('Oops! Something went wrong. Please try again.'); // Basic error feedback
      }
    })
    .catch(error => console.error('Error submitting activity:', error));
  };

  // Initial load when the page loads
  loadNextTask();
  updateProgressBar(); // Initialize progress bar visually on page load
});