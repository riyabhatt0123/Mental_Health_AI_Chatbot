// static/js/puzzle.js

const messageBox = document.getElementById("message-box");
const puzzleContainer = document.getElementById("puzzle-container");
const timeDisplay = document.getElementById("time");
const levelDisplay = document.getElementById("level");

let timer;
let timeLeft = 60;
let level = 1;
let pieces = [];
let correctOrder = [];
let currentOrder = [];

const positiveMessages = {
    "Iron_Man": [
        "You are braver than you believe.",
        "Innovation is your superpower!"
    ],
    "Thor": [
        "You are stronger than you think!",
        "Wield your worthiness."
    ],
    "Tom_Jerry": [
        "Laugh through the chaos!",
        "Friendship is the best game."
    ],
    "Goku": [
        "Push beyond your limits!",
        "Believe in your power!"
    ],
    "MR_Beans": [
        "Smile through silliness!",
        "Joy is in the little things."
    ],
    "Pluto": [
        "Loyalty and fun always win.",
        "Wag your worries away!"
    ],
    "Naruto": [
        "Never give up!",
        "Your ninja way is unique!"
    ],
    "Looney_Tunes": [
        "Stay looney and keep going!",
        "You’re toon-tastically amazing!"
    ]
};

function startGame() {
    puzzleContainer.innerHTML = "";
    messageBox.textContent = randomMessage();
    timeLeft = 60;
    timeDisplay.textContent = timeLeft;
    levelDisplay.textContent = level;
    clearInterval(timer);
    timer = setInterval(updateTimer, 1000);
    generatePuzzle();
}

function updateTimer() {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
        clearInterval(timer);
        endGame(false);
    }
}

function randomMessage() {
    const msgs = positiveMessages[character];
    return msgs[Math.floor(Math.random() * msgs.length)];
}

function generatePuzzle() {
    const size = 3 + level; // 3x3 on level 1, etc.
    puzzleContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    pieces = [];
    correctOrder = [];
    currentOrder = [];

    for (let i = 0; i < size * size; i++) {
        correctOrder.push(i);
        currentOrder.push(i);
    }

    shuffle(currentOrder);

    currentOrder.forEach((pos, index) => {
        const piece = document.createElement("div");
        piece.classList.add("puzzle-piece");
        piece.draggable = true;
        piece.style.backgroundImage = `url('/static/images/${character}.jpg')`;

        const x = pos % size;
        const y = Math.floor(pos / size);
        const width = 100 / size;

        piece.style.backgroundSize = `${size * 100}% ${size * 100}%`;
        piece.style.backgroundPosition = `${x * width}% ${y * width}%`;
        piece.dataset.index = index;
        piece.dataset.correct = pos;

        puzzleContainer.appendChild(piece);
        pieces.push(piece);

        piece.addEventListener("dragstart", dragStart);
        piece.addEventListener("dragover", dragOver);
        piece.addEventListener("drop", dropped);
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

let dragSource = null;

function dragStart(e) {
    dragSource = e.target;
}

function dragOver(e) {
    e.preventDefault();
}

function dropped(e) {
    const sourceIndex = dragSource.dataset.index;
    const targetIndex = e.target.dataset.index;

    // Swap elements visually
    puzzleContainer.insertBefore(dragSource, e.target);
    puzzleContainer.insertBefore(e.target, puzzleContainer.children[sourceIndex]);
    puzzleContainer.style.width = "300px";
    puzzleContainer.style.height = "300px";
    puzzleContainer.style.gridTemplateColumns = `repeat(${size}, ${pieceSize}px)`;


    // Swap dataset
    [dragSource.dataset.index, e.target.dataset.index] = [e.target.dataset.index, dragSource.dataset.index];

    checkWin();
}

function checkWin() {
    const current = Array.from(puzzleContainer.children).map(piece => parseInt(piece.dataset.correct));
    const isCorrect = current.every((val, idx) => val === idx);
    if (isCorrect) {
        clearInterval(timer);
        endGame(true);
    }
}

function endGame(won) {
    messageBox.textContent = won
        ? `🎉 ${randomMessage()} You completed Level ${level}!`
        : `⏰ Time’s up! ${randomMessage()}`;

    if (won) {
        level++;
        setTimeout(startGame, 2000);
    } else {
        level = 1;
        setTimeout(startGame, 3000);
    }
}

// Start the game
startGame();
