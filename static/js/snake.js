// static/js/snake.js
console.log("snake.js script started executing."); // First line to log

// Declare all core game variables and DOM element references in the global scope.
// This ensures they are accessible by all functions within this script.
let canvas;
let ctx;
let scoreDisplay;
let startGameBtn;
let resetGameBtn;
let gameContainer; // For overlay

let snake;
let food;
let dx; // X velocity in GRID UNITS (-1, 0, or 1)
let dy; // Y velocity in GRID UNITS (-1, 0, or 1)
let score;
let changingDirection; // Flag to prevent multiple direction changes per frame
let gameSpeed; // Milliseconds per game tick
let gameInterval; // To hold the setInterval ID
let gameStarted = false; // Flag to track game state

const gridSize = 20; // Number of cells per row/column
let cellSize; // Calculated based on canvas size and gridSize

// This function initializes or resets the game state
window.initializeGame = function() {
    console.log("initializeGame() called.");
    try {
        // Assign DOM elements to the globally declared variables.
        // These assignments ensure all global references are updated.
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        scoreDisplay = document.getElementById('score');
        startGameBtn = document.getElementById('startGameBtn');
        resetGameBtn = document.getElementById('resetGameBtn');
        gameContainer = document.getElementById('game-container');

        if (!canvas || !ctx || !scoreDisplay || !startGameBtn || !resetGameBtn || !gameContainer) {
            console.error("Error: One or more essential game elements not found during initialization!");
            // This is a critical error, so we return to prevent further issues.
            return;
        }

        // --- Set canvas internal resolution based on its displayed size ---
        let displayWidth = canvas.clientWidth;
        let displayHeight = canvas.clientHeight;

        // Fallback for initial zero clientWidth/clientHeight (robustness)
        if (displayWidth === 0 || displayHeight === 0) {
            console.warn("Canvas clientWidth/clientHeight is 0. Using default 400px.");
            displayWidth = 400;
            displayHeight = 400;
        }

        const size = Math.min(displayWidth, displayHeight, 400); // Max 400px, responsive
        canvas.width = Math.floor(size / gridSize) * gridSize;
        canvas.height = Math.floor(size / gridSize) * gridSize;
        cellSize = canvas.width / gridSize; // Recalculate cellSize based on new canvas width

        console.log(`Canvas initialized to ${canvas.width}x${canvas.height}, cellSize: ${cellSize}`);

        // Reset game state variables
        snake = [{ x: 10, y: 10 }]; // Initial snake position in GRID UNITS
        dx = 1; // Snake moves right initially (1 grid unit per tick)
        dy = 0;
        score = 0;
        scoreDisplay.textContent = score;
        changingDirection = false;
        gameSpeed = 150; // Milliseconds per game tick
        gameStarted = false; // Game is not running after initialization
        
        // Clear any existing game over overlay if present
        const existingOverlay = gameContainer.querySelector('.game-overlay');
        if (existingOverlay) {
            gameContainer.removeChild(existingOverlay);
        }

        generateFood();
        drawGame(); // Draw initial state immediately after setup
        startGameBtn.textContent = 'Start Game'; // Reset button text
        clearInterval(gameInterval); // Ensure no old interval is running
        console.log("Game initialized. Snake should be visible now.");
    } catch (e) {
        console.error("Error during initializeGame:", e);
    }
};


// Run code once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded for snake.js. Initializing game elements and listeners.");

    // IMPORTANT: Call initializeGame here to populate the global variables
    // and set up the initial game state.
    initializeGame();

    // Attach event listeners ONLY ONCE after the DOM is ready and elements are assigned.
    if (startGameBtn) {
        startGameBtn.addEventListener('click', togglePause);
        console.log("Start Game button listener attached.");
    } else {
        console.error("startGameBtn not found during DOMContentLoaded, cannot attach listener.");
    }

    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', resetGame);
        console.log("Reset Game button listener attached.");
    } else {
        console.error("resetGameBtn not found during DOMContentLoaded, cannot attach listener.");
    }
    
    document.addEventListener('keydown', changeDirection);
    console.log("Keyboard listener attached.");

    // Responsive canvas sizing
    window.addEventListener('resize', () => {
        console.log("Window resized. Adjusting canvas.");
        if (!gameContainer || !canvas) {
            console.error("Cannot resize: gameContainer or canvas not found (possibly due to early DOMContentLoaded or errors).");
            return;
        }
        const containerWidth = gameContainer.clientWidth;
        // Ensure canvas width is a multiple of gridSize for clean pixel art
        const newCanvasSize = Math.min(400, Math.floor(containerWidth / gridSize) * gridSize);
        canvas.width = newCanvasSize;
        canvas.height = newCanvasSize;
        cellSize = canvas.width / gridSize; // Recalculate cellSize
        
        // If the game is running, pause and reset on resize for consistency.
        if (gameStarted) {
            pauseGame();
            showOverlay('Window resized. Game reset.', 'OK');
        } else {
            drawGame(); // Just redraw if not running
        }
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}, new cellSize: ${cellSize}`);
    });

    // Add touch support for mobile devices (swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    if (canvas) { // Ensure canvas exists before attaching touch listeners
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
            e.preventDefault(); // Prevent scrolling
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling during swipe
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            handleSwipe();
        });
    } else {
        console.error("Canvas not found, skipping touch listeners.");
    }

    function handleSwipe() {
        const dxSwipe = touchEndX - touchStartX;
        const dySwipe = touchEndY - touchStartY;
        const minSwipeDistance = 30;

        if (Math.abs(dxSwipe) > Math.abs(dySwipe) && Math.abs(dxSwipe) > minSwipeDistance) {
            // Horizontal swipe
            if (dxSwipe > 0) {
                changeDirection({ key: 'ArrowRight' });
            } else {
                changeDirection({ key: 'ArrowLeft' });
            }
        } else if (Math.abs(dySwipe) > Math.abs(dxSwipe) && Math.abs(dySwipe) > minSwipeDistance) {
            // Vertical swipe
            if (dySwipe > 0) {
                changeDirection({ key: 'ArrowDown' });
            } else {
                changeDirection({ key: 'ArrowUp' });
            }
        }
    }

}); // End DOMContentLoaded

// --- Game Control Functions --- (These functions now correctly access global variables)
function startGame() {
    if (gameStarted) return;
    console.log("startGame() called. Starting game loop...");
    gameStarted = true;
    startGameBtn.textContent = 'Pause Game';
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function pauseGame() {
    if (!gameStarted) return;
    console.log("pauseGame() called. Pausing game loop...");
    clearInterval(gameInterval);
    gameStarted = false;
    startGameBtn.textContent = 'Resume Game';
}

function togglePause() {
    console.log("togglePause() called.");
    if (gameStarted) {
        pauseGame();
    } else {
        startGame();
    }
}

function resetGame() {
    console.log("resetGame() called.");
    pauseGame(); // Ensure game loop is stopped
    initializeGame(); // Re-initialize all game parameters
}

// --- Game Loop ---
function gameLoop() {
    try {
        if (checkGameOver()) {
            pauseGame();
            showOverlay('Game Over! Your score: ' + score + '  😊🎮', 'Play Again');
            return;
        }
        changingDirection = false; // Allow direction change for next frame
        clearCanvas();
        drawFood();
        moveSnake();
        drawSnake();
    } catch (e) {
        console.error("Error during gameLoop:", e);
        pauseGame(); // Stop game on error
    }
}

// --- Drawing Functions ---
function clearCanvas() {
    if (!ctx) { console.error("clearCanvas: ctx is null!"); return; }
    // Use computed style or a fallback color for the canvas background
    ctx.fillStyle = getComputedStyle(canvas).backgroundColor || '#A9D6A9'; // Light green fallback
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnakePart(snakePart) {
    if (!ctx) { console.error("drawSnakePart: ctx is null!"); return; }
    ctx.fillStyle = '#2e8b57'; // Sea green for snake
    ctx.strokeStyle = '#1a5232'; // Darker green border
    ctx.fillRect(snakePart.x * cellSize, snakePart.y * cellSize, cellSize, cellSize);
    ctx.strokeRect(snakePart.x * cellSize, snakePart.y * cellSize, cellSize, cellSize);
}

function drawSnake() {
    if (!ctx) { console.error("drawSnake: ctx is null!"); return; }
    snake.forEach(drawSnakePart);
}

function drawFood() {
    if (!ctx) { console.error("drawFood: ctx is null!"); return; }
    ctx.fillStyle = '#ff0000'; // Red for food
    ctx.strokeStyle = '#8b0000'; // Dark red border
    ctx.beginPath();
    ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2 * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawGame() {
    console.log("drawGame() called.");
    try {
        clearCanvas();
        drawFood();
        drawSnake();
        console.log("Full game drawn.");
    } catch (e) {
        console.error("Error during drawGame:", e);
    }
}

// --- Game Logic ---
function generateFood() {
    let newFoodX, newFoodY;
    let foodOnSnake = true;
    while (foodOnSnake) {
        newFoodX = Math.floor(Math.random() * gridSize);
        newFoodY = Math.floor(Math.random() * gridSize);
        foodOnSnake = snake.some(part => part.x === newFoodX && part.y === newFoodY);
    }
    food = { x: newFoodX, y: newFoodY };
    console.log(`Food generated at: (${food.x}, ${food.y})`);
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head); // Add new head

    const didEatFood = head.x === food.x && head.y === food.y;
    if (didEatFood) {
        score += 10;
        scoreDisplay.textContent = score;
        generateFood();
        gameSpeed = Math.max(50, gameSpeed - 5); // Increase speed slightly
        clearInterval(gameInterval); // Clear old interval
        gameInterval = setInterval(gameLoop, gameSpeed); // Start new interval with updated speed
        console.log(`Ate food! Score: ${score}, New speed: ${gameSpeed}`);
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
}

function checkGameOver() {
    // Check if snake hits itself (start from 4th part to avoid immediate collision with neck)
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            console.log("Game Over: Snake hit itself.");
            return true;
        }
    }

    // Check if snake hits wall
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= gridSize;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= gridSize;

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall) {
        console.log("Game Over: Snake hit wall.");
        return true;
    }

    return false;
}

function changeDirection(event) {
    if (changingDirection) return; // Prevent multiple direction changes per frame
    changingDirection = true;

    const keyPressed = event.key;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingLeft = dx === -1;
    const goingRight = dx === 1;

    if (keyPressed === 'ArrowLeft' && !goingRight) {
        dx = -1;
        dy = 0;
        console.log("Direction: Left");
    } else if (keyPressed === 'ArrowUp' && !goingDown) {
        dx = 0;
        dy = -1;
        console.log("Direction: Up");
    } else if (keyPressed === 'ArrowRight' && !goingLeft) {
        dx = 1;
        dy = 0;
        console.log("Direction: Right");
    } else if (keyPressed === 'ArrowDown' && !goingUp) {
        dx = 0;
        dy = 1;
        console.log("Direction: Down");
    }
    // If game hasn't started, start it on first valid direction input
    if (!gameStarted && (dx !== 0 || dy !== 0)) {
        startGame();
    }
}

function showOverlay(message, buttonText) {
    if (!gameContainer) {
        console.error("gameContainer is null, cannot show overlay.");
        return; // Prevent errors if gameContainer is not found
    }
    // Check if an overlay already exists to avoid stacking them
    let overlay = gameContainer.querySelector('.game-overlay');
    if (overlay) {
        gameContainer.removeChild(overlay); // Remove existing one before creating a new one
    }

    overlay = document.createElement('div');
    overlay.classList.add('game-overlay');
    overlay.innerHTML = `
        <p>${message}</p>
        <button id="overlay-btn">${buttonText}</button>
    `;
    gameContainer.appendChild(overlay);
    console.log("Game Over overlay shown.");

    // Attach event listener to the newly created button
    document.getElementById('overlay-btn').addEventListener('click', () => {
        if (gameContainer && overlay) { // Check if elements still exist before removing
            gameContainer.removeChild(overlay);
        }
        initializeGame(); // Re-initialize the game state
    });
}