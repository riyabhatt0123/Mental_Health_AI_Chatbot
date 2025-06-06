// static/js/game2048.js

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const bestScoreDisplay = document.getElementById('best-score');
    const newGameBtn = document.getElementById('new-game-btn');
    const timerDisplay = document.getElementById('timer-display');

    const gridSize = 4;
    let board = [];
    let score = 0;
    let bestScore = localStorage.getItem('best2048Score') ? parseInt(localStorage.getItem('best2048Score')) : 0;
    let history = [];

    // --- Timer Variables ---
    const gameDuration = 60;
    let timeLeft = gameDuration;
    let timerInterval = null;

    // --- Game Initialization ---
    function initializeGame() {
        board = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
        score = 0;
        history = [];
        scoreDisplay.textContent = score;
        bestScoreDisplay.textContent = bestScore;

        const existingOverlay = gameBoard.querySelector('.game-overlay');
        if (existingOverlay) {
            gameBoard.removeChild(existingOverlay);
        }

        renderBoard();
        addRandomTile();
        addRandomTile();
        renderTiles(); // Initial render of tiles
        saveBoardState();

        resetTimer();
        startTimer();
    }

    // --- Timer Functions ---
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                checkGameEndOnTimer();
            }
        }, 1000);
    }

    function resetTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        timeLeft = gameDuration;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function checkGameEndOnTimer() {
        if (checkWin()) {
            showOverlay('You win! 🎉', true);
        } else {
            showOverlay("Time's up! You did great! Keep practicing! 💪", false, true);
        }
    }

    // --- Rendering the Board (Grid Cells) ---
    function renderBoard() {
        gameBoard.innerHTML = '';
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                gameBoard.appendChild(cell);
            }
        }
    }

    // --- Rendering Tiles (Dynamic) ---
    function renderTiles() {
        // Remove existing tiles before re-rendering (important for animation)
        const existingTiles = gameBoard.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        // Get the current computed style for gap and padding from CSS
        const computedStyle = getComputedStyle(gameBoard);
        const gap = parseFloat(computedStyle.getPropertyValue('gap')) || 10;
        const boardPaddingLeft = parseFloat(computedStyle.getPropertyValue('padding-left')) || 10;
        const boardPaddingTop = parseFloat(computedStyle.getPropertyValue('padding-top')) || 10;

        // gameBoard.clientWidth gives the inner width of the element (content area).
        // Since `#game-board` has `box-sizing: border-box;`, this `clientWidth`
        // already excludes the padding. So, we only need to subtract the gaps.
        const usableContentWidth = gameBoard.clientWidth;

        // Calculate the size of each tile:
        // (Total usable width - total space taken by gaps) / number of tiles
        const tileCalculatedSize = (usableContentWidth - (gridSize - 1) * gap) / gridSize;

        // Create and position tiles based on the board array
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const tileValue = board[r][c];
                if (tileValue !== 0) {
                    const tile = document.createElement('div');
                    tile.classList.add('tile', `tile-${tileValue}`);
                    tile.textContent = tileValue;
                    
                    // Position tiles absolutely relative to the game-board.
                    // The 'left' and 'top' values need to account for the board's padding
                    // and then the tile's position within the grid based on its size and gap.
                    tile.style.left = `${boardPaddingLeft + c * (tileCalculatedSize + gap)}px`;
                    tile.style.top = `${boardPaddingTop + r * (tileCalculatedSize + gap)}px`;
                    tile.style.width = `${tileCalculatedSize}px`;
                    tile.style.height = `${tileCalculatedSize}px`;
                    
                    // Add animation class for new tiles
                    if (tile.dataset.isNew) {
                        tile.classList.add('tile-new');
                        delete tile.dataset.isNew;
                    }
                    if (tile.dataset.isMerged) { // You'd need logic to set this dataset property during a merge
                        tile.classList.add('tile-merged');
                        delete tile.dataset.isMerged;
                    }

                    gameBoard.appendChild(tile);
                }
            }
        }
    }


    // --- Tile Generation ---
    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (board[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newValue = Math.random() < 0.9 ? 2 : 4;
            board[r][c] = newValue;
        }
    }

    // --- Game Logic: Movement ---
    function filterZeros(arr) {
        return arr.filter(val => val !== 0);
    }

    function slide(arr) {
        let filtered = filterZeros(arr);
        let missing = gridSize - filtered.length;
        let zeros = Array(missing).fill(0);
        return zeros.concat(filtered);
    }

    function combine(arr) {
        let newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            if (newArr[i] !== 0 && newArr[i] === newArr[i - 1]) {
                newArr[i] *= 2;
                score += newArr[i];
                newArr[i - 1] = 0;
                scoreDisplay.textContent = score;
            }
        }
        return newArr;
    }

    function applyMove(direction) {
        let hasChanged = false;
        let prevBoard = JSON.parse(JSON.stringify(board));

        for (let i = 0; i < gridSize; i++) {
            let line = [];
            if (direction === 'left' || direction === 'right') {
                line = board[i];
            } else {
                for (let r = 0; r < gridSize; r++) {
                    line.push(board[r][i]);
                }
            }

            if (direction === 'left' || direction === 'up') {
                line = slide(filterZeros(line));
                line = combine(line);
                line = slide(filterZeros(line));
            } else {
                line = slide(filterZeros(line).reverse()).reverse();
                line = combine(line.reverse()).reverse();
                line = slide(filterZeros(line).reverse()).reverse();
            }

            if (direction === 'left' || direction === 'right') {
                board[i] = line;
            } else {
                for (let r = 0; r < gridSize; r++) {
                    board[r][i] = line[r];
                }
            }
        }

        hasChanged = JSON.stringify(prevBoard) !== JSON.stringify(board);
        return hasChanged;
    }

    // --- Game State Management ---
    function saveBoardState() {
        history.push({ board: JSON.parse(JSON.stringify(board)), score: score });
        if (history.length > 10) {
            history.shift();
        }
    }

    function undoLastMove() {
        if (history.length > 1) {
            history.pop();
            const prevState = history[history.length - 1];
            board = JSON.parse(JSON.stringify(prevState.board));
            score = prevState.score;
            scoreDisplay.textContent = score;
            renderTiles();
        }
    }

    function checkGameOver() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (board[r][c] === 0) return false;
            }
        }

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const val = board[r][c];
                if (c < gridSize - 1 && val === board[r][c + 1]) return false;
                if (r < gridSize - 1 && val === board[r + 1][c]) return false;
            }
        }
        return true;
    }

    function checkWin() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (board[r][c] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    function showOverlay(message, isWin, isTimeUp = false) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        const overlay = document.createElement('div');
        overlay.classList.add('game-overlay');
        overlay.innerHTML = `
            <p>${message}</p>
            <button id="try-again-btn">Play Again</button>
        `;
        gameBoard.appendChild(overlay);

        document.getElementById('try-again-btn').addEventListener('click', () => {
            gameBoard.removeChild(overlay);
            initializeGame();
        });
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', (e) => {
        if (checkWin() || checkGameOver() || timeLeft <= 0) return;

        let moved = false;

        saveBoardState();

        switch (e.key) {
            case 'ArrowUp':
                moved = applyMove('up');
                break;
            case 'ArrowDown':
                moved = applyMove('down');
                break;
            case 'ArrowLeft':
                moved = applyMove('left');
                break;
            case 'ArrowRight':
                moved = applyMove('right');
                break;
        }

        if (moved) {
            addRandomTile();
            renderTiles();
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('best2048Score', bestScore);
                bestScoreDisplay.textContent = bestScore;
            }
            if (checkWin()) {
                showOverlay('You win! 🎉', true);
            } else if (checkGameOver()) {
                showOverlay('Game Over! 😔', false);
            }
        } else {
            if (history.length > 0) {
                history.pop();
            }
        }
    });

    // --- Touch/Swipe Variables and Listeners ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    gameBoard.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        e.preventDefault();
    }, { passive: false });

    gameBoard.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    gameBoard.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    });

    // --- Mouse/Drag Variables and Listeners ---
    let isDragging = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseEndX = 0;
    let mouseEndY = 0;

    gameBoard.addEventListener('mousedown', (e) => {
        isDragging = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
    });

    gameBoard.addEventListener('mousemove', (e) => {
        if (isDragging) {
            // Optional: You could add visual feedback for dragging here
        }
    });

    gameBoard.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            mouseEndX = e.clientX;
            mouseEndY = e.clientY;
            handleSwipe(mouseStartX, mouseStartY, mouseEndX, mouseEndY);
        }
    });

    gameBoard.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // --- Modified handleSwipe function to accept coordinates ---
    function handleSwipe(startX, startY, endX, endY) {
        if (checkWin() || checkGameOver() || timeLeft <= 0) return;

        const dx = endX - startX;
        const dy = endY - startY;
        const minSwipeDistance = 30;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
            // Horizontal swipe
            if (dx > 0) {
                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}));
            } else {
                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}));
            }
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
            // Vertical swipe
            if (dy > 0) {
                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
            } else {
                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}));
            }
        }
    }


    newGameBtn.addEventListener('click', initializeGame);

    // Initial game setup
    initializeGame();
});
