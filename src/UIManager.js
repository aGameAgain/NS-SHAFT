// UIManager Class
export class UIManager {
    constructor() {
        this.elements = {
            depth: document.getElementById('depth'),
            lives: document.getElementById('lives'),
            finalDepth: document.getElementById('finalDepth'),
            gameOver: document.getElementById('gameOver'),
            startButton: document.getElementById('startButton'),
            restartButton: document.getElementById('restartButton'),
            tryAgainButton: document.getElementById('tryAgainButton')
        };
    }

    updateGameStats(depth, lives) {
        this.elements.depth.textContent = Math.floor(depth);
        this.elements.lives.textContent = lives;
    }

    showGameOver(finalDepth) {
        this.elements.finalDepth.textContent = Math.floor(finalDepth);
        this.elements.gameOver.style.display = 'block';
        this.elements.restartButton.style.display = 'block';
        this.elements.startButton.style.display = 'none';
    }

    hideGameOver() {
        this.elements.gameOver.style.display = 'none';
        this.elements.startButton.style.display = 'none';
        this.elements.restartButton.style.display = 'block';
    }

    showStartButton() {
        this.elements.startButton.style.display = 'block';
        this.elements.restartButton.style.display = 'none';
    }

    setupGameControls(startCallback, restartCallback) {
        this.elements.startButton.addEventListener('click', startCallback);
        this.elements.restartButton.addEventListener('click', restartCallback);
        this.elements.tryAgainButton.addEventListener('click', restartCallback);
    }
}