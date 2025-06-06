document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const gameContainer = document.getElementById('game-container');
    const scoreDisplay = document.getElementById('score');
    const levelDisplay = document.getElementById('level');
    const resetGameBtn = document.getElementById('reset-game-btn');
    const loadingMessage = document.getElementById('loading-message');
    const timerDisplay = document.getElementById('timer-display');

    let scene, camera, renderer;
    let mazeMesh, ballMesh;
    let score = 0;
    let level = 1;
    let gameActive = true;

    let world;
    let mazeBody, ballBody;

    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let cameraAngleX = 0;
    let cameraAngleY = Math.PI / 4;
    const cameraDistance = 20;

    const ballRadius = 0.5;
    const mazePlaneSize = 10;
    const wallHeight = 1;
    const floorThickness = 0.2;
    let mazeTiltX = 0;
    let mazeTiltZ = 0;

    const mazeLayouts = [
        [
            "##########",
            "#S        #",
            "# #### ###",
            "# #   # #",
            "# # H  # #",
            "# # #### #",
            "# #      #",
            "# #### ###",
            "#G        #",
            "##########"
        ]
    ];

    let currentMazeLayout = [];
    let goalPosition = {x: 0, z: 0};
    let startPosition = {x: 0, z: 0};
    let holes = [];

    let timer;
    let timeLeft = 30;

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.set(0, cameraDistance * Math.sin(cameraAngleY), cameraDistance * Math.cos(cameraAngleY));
        camera.lookAt(0, 0, 0);
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);
    }

    function initCannon() {
        world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 10;
    }

    function createMaze(layout) {
        scene.children = scene.children.filter(child => {
            return !(child.name === 'mazeElement' || child.name === 'ball');
        });

        world.bodies = world.bodies.filter(body => {
            return !(body.name === 'maze' || body.name === 'ball');
        });

        mazeMesh = new THREE.Group();
        mazeMesh.name = 'mazeElement';
        scene.add(mazeMesh);

        mazeBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC
        });
        mazeBody.name = 'maze';
        mazeBody.position.set(0, 0, 0);
        world.addBody(mazeBody);

        holes = [];
        const cellSize = mazePlaneSize / layout.length;
        const halfCell = cellSize / 2;
        const halfMazeSize = mazePlaneSize / 2;

        for (let r = 0; r < layout.length; r++) {
            for (let c = 0; c < layout[r].length; c++) {
                const char = layout[r][c];
                const x = c * cellSize - halfMazeSize + halfCell;
                const z = r * cellSize - halfMazeSize + halfCell;

                const floor = new THREE.Mesh(
                    new THREE.BoxGeometry(cellSize, floorThickness, cellSize),
                    new THREE.MeshStandardMaterial({ color: 0xdeb887 })
                );
                floor.position.set(x, -floorThickness / 2, z);
                mazeMesh.add(floor);
                mazeBody.addShape(new CANNON.Box(new CANNON.Vec3(cellSize / 2, floorThickness / 2, cellSize / 2)),
                    new CANNON.Vec3(x, -floorThickness / 2, z));

                if (char === '#') {
                    const wall = new THREE.Mesh(
                        new THREE.BoxGeometry(cellSize, wallHeight, cellSize),
                        new THREE.MeshStandardMaterial({ color: 0x6B8E23 })
                    );
                    wall.position.set(x, wallHeight / 2, z);
                    mazeMesh.add(wall);
                    mazeBody.addShape(new CANNON.Box(new CANNON.Vec3(cellSize / 2, wallHeight / 2, cellSize / 2)),
                        new CANNON.Vec3(x, wallHeight / 2, z));
                } else if (char === 'S') {
                    startPosition = { x, z };
                } else if (char === 'G') {
                    goalPosition = { x, z };
                    const goal = new THREE.Mesh(
                        new THREE.CylinderGeometry(cellSize * 0.4, cellSize * 0.4, 0.1, 32),
                        new THREE.MeshBasicMaterial({ color: 0x00FF00 })
                    );
                    goal.position.set(x, 0.05, z);
                    mazeMesh.add(goal);
                } else if (char === 'H') {
                    holes.push({ x, z });
                    const hole = new THREE.Mesh(
                        new THREE.CylinderGeometry(cellSize * 0.4, cellSize * 0.4, 0.01, 32),
                        new THREE.MeshBasicMaterial({ color: 0x000000 })
                    );
                    hole.position.set(x, 0.01, z);
                    mazeMesh.add(hole);
                }
            }
        }

        const ballShape = new CANNON.Sphere(ballRadius);
        ballBody = new CANNON.Body({ mass: 1, shape: ballShape });
        ballBody.name = 'ball';
        world.addBody(ballBody);

        ballMesh = new THREE.Mesh(
            new THREE.SphereGeometry(ballRadius, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xDC143C })
        );
        ballMesh.name = 'ball';
        scene.add(ballMesh);
    }

    function resetLevel() {
        gameActive = true;
        scoreDisplay.textContent = score;
        levelDisplay.textContent = level;
        currentMazeLayout = mazeLayouts[level - 1] || mazeLayouts[0];
        createMaze(currentMazeLayout);
        ballBody.position.set(startPosition.x, 1.2, startPosition.z);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        mazeTiltX = 0;
        mazeTiltZ = 0;

        stopTimer();
        timeLeft = 30;
        timerDisplay.textContent = `Time Left: ${timeLeft}s`;
        startTimer();

        const overlay = gameContainer.querySelector('.game-overlay');
        if (overlay) gameContainer.removeChild(overlay);

        loadingMessage.style.display = 'none';
    }

    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `Time Left: ${timeLeft}s`;
            if (timeLeft <= 0) {
                stopTimer();
                gameActive = false;
                const messages = [
                    "Almost there! Keep going! 🌟",
                    "You gave it a great try! 👍",
                    "Every attempt makes you better! 😊",
                    "You're doing awesome! Try again!",
                    "Time's up, but you're improving! 💖"
                ];
                const msg = messages[Math.floor(Math.random() * messages.length)];
                showOverlay(msg, false);
            }
        }, 1000);
    }

    function stopTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        if (!gameActive) return;

        world.step(1 / 60);
        ballMesh.position.copy(ballBody.position);
        ballMesh.quaternion.copy(ballBody.quaternion);

        const qx = new CANNON.Quaternion();
        const qz = new CANNON.Quaternion();
        qx.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), mazeTiltZ);
        qz.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -mazeTiltX);
        mazeBody.quaternion.set(0, 0, 0, 1);
        mazeBody.quaternion.mult(qx, mazeBody.quaternion);
        mazeBody.quaternion.mult(qz, mazeBody.quaternion);
        mazeMesh.position.copy(mazeBody.position);
        mazeMesh.quaternion.copy(mazeBody.quaternion);

        camera.position.x = cameraDistance * Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
        camera.position.y = cameraDistance * Math.sin(cameraAngleY);
        camera.position.z = cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
        camera.lookAt(0, 0, 0);

        checkGameStatus();
        renderer.render(scene, camera);
    }

    function checkGameStatus() {
        if (!gameActive) return;
        const ballPos = ballBody.position;

        if (ballPos.y < -5) {
            gameActive = false;
            stopTimer();
            showOverlay("Oops! The ball fell. You're doing great, try again! 😄", false);
            return;
        }

        for (const hole of holes) {
            const dist = Math.sqrt((ballPos.x - hole.x) ** 2 + (ballPos.z - hole.z) ** 2);
            if (dist < 0.3 && ballPos.y < -ballRadius) {
                gameActive = true;
                stopTimer();
                showOverlay("Oops! You fell in a hole. Great try! 💪", false);
                return;
            }
        }

        const goalDist = Math.sqrt((ballPos.x - goalPosition.x) ** 2 + (ballPos.z - goalPosition.z) ** 2);
        if (goalDist < 0.3 && ballPos.y > -ballRadius) {
            stopTimer();
            score += 100;
            scoreDisplay.textContent = score;
            gameActive = false;
            showOverlay(`Level ${level} Complete! 🎉`, true);
        }
    }

    function showOverlay(message, isWin) {
        const overlay = document.createElement('div');
        overlay.classList.add('game-overlay');
        overlay.innerHTML = `
            <p>${message}</p>
            <button id="overlay-btn">${isWin ? 'Next Level' : 'Try Again'}</button>
        `;
        gameContainer.appendChild(overlay);

        document.getElementById('overlay-btn').addEventListener('click', () => {
            gameContainer.removeChild(overlay);
            stopTimer();
            if (isWin) {
                level++;
                if (level > mazeLayouts.length) {
                    showOverlay('🎉 You completed all levels! Well done! 🎖️', false);
                    level = 1;
                }
            }
            resetLevel();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (!gameActive) return;
        const tiltIncrement = 0.02;
        const maxTilt = Math.PI / 4;

        if (event.key === 'ArrowLeft') mazeTiltX = Math.min(maxTilt, mazeTiltX + tiltIncrement);
        else if (event.key === 'ArrowRight') mazeTiltX = Math.max(-maxTilt, mazeTiltX - tiltIncrement);
        else if (event.key === 'ArrowUp') mazeTiltZ = Math.min(maxTilt, mazeTiltZ + tiltIncrement);
        else if (event.key === 'ArrowDown') mazeTiltZ = Math.max(-maxTilt, mazeTiltZ - tiltIncrement);
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') mazeTiltZ = 0;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') mazeTiltX = 0;
    });

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;

        cameraAngleX += deltaX * 0.005;
        cameraAngleY -= deltaY * 0.005;
        cameraAngleY = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraAngleY));
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    window.addEventListener('resize', () => {
        const parentWidth = canvas.parentElement.clientWidth;
        const newWidth = Math.min(600, parentWidth);
        const newHeight = newWidth * (400 / 600);
        canvas.width = newWidth;
        canvas.height = newHeight;
        camera.aspect = canvas.width / canvas.height;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.width, canvas.height);
    });

    const initialParentWidth = canvas.parentElement.clientWidth;
    canvas.width = Math.min(600, initialParentWidth);
    canvas.height = canvas.width * (400 / 600);

    function startGame() {
        loadingMessage.style.display = 'block';
        initThree();
        initCannon();
        resetLevel();
        animate();
    }

    startGame();

    resetGameBtn.addEventListener('click', () => {
        level = 1;
        resetLevel();
    });
});
