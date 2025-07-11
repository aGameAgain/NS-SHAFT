// Import all necessary modules
import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { PlatformManager } from './Platform.js';
import { Physics } from './Physics.js';
import { Renderer } from './Renderer.js';
import { InputHandler } from './InputHandler.js';
import { UIManager } from './UIManager.js';

// Main Game Class
export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.gameState = new GameState();
        this.player = new Player(this.canvas.width, this.canvas.height);
        this.platformManager = new PlatformManager(this.canvas.width, this.canvas.height);
        this.physics = new Physics();
        this.renderer = new Renderer(this.canvas);
        this.inputHandler = new InputHandler();
        this.uiManager = new UIManager();

        this.SCREEN_SCROLL_SPEED = 0.5;
        this.spawnDepth = 0;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileControls();
        this.reset();
        this.renderer.render(this.player, this.platformManager, this.gameState.depth);
    }

    setupEventListeners() {
        this.uiManager.setupGameControls(
            () => this.startGame(),
            () => this.restartGame()
        );

        window.addEventListener('keydown', (e) => {
            if (e.key === ' ' && this.gameState.gameRunning) {
                this.player.jump();
            }
        });

        window.addEventListener('resize', () => {
            this.renderer.resize();
            // Update canvas dimensions for platform manager
            this.platformManager.updateCanvasDimensions(this.canvas.width, this.canvas.height);

            if (!this.gameState.gameRunning) {
                this.reset();
                this.renderer.render(this.player, this.platformManager, this.gameState.depth);
            }
        });
    }

    setupMobileControls() {
        const leftButton = document.getElementById('leftButton');
        const rightButton = document.getElementById('rightButton');
        this.inputHandler.setupMobileControls(leftButton, rightButton);
    }

    startGame() {
        if (this.gameState.gameRunning) return;

        this.gameState.start();
        this.uiManager.hideGameOver();
        this.reset();
        this.gameLoop();
    }

    restartGame() {
        // Stop current game if running
        this.gameState.stop();
        this.startGame();
    }

    reset() {
        this.gameState.reset();
        this.player.reset(this.canvas.width, this.canvas.height);
        this.platformManager.clear();
        this.platformManager.createInitialPlatforms(this.player.y);
        this.spawnDepth = 0;
        this.uiManager.updateGameStats(this.gameState.depth, this.gameState.lives);
    }

    gameLoop() {
        if (!this.gameState.gameRunning) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.player.update(this.inputHandler.getKeys());
        this.player.applyGravity();

        this.spawnDepth = this.platformManager.update(this.gameState.depth, this.spawnDepth);

        this.handleCollisions();
        this.handleCeilingSpikes();

        this.gameState.updateDepth(this.SCREEN_SCROLL_SPEED);
        this.uiManager.updateGameStats(this.gameState.depth, this.gameState.lives);

        this.checkGameEnd();
    }

    render() {
        this.renderer.render(this.player, this.platformManager, this.gameState.depth);
    }

    handleCollisions() {
        const collision = this.physics.checkCollisions(this.player, this.platformManager.platforms);

        if (collision?.type === 'spike') {
            const gameOver = this.gameState.loseLife(1);
            this.player.takeDamage();
            if (gameOver) {
                this.endGame();
            }
        }
    }

    handleCeilingSpikes() {
        if (this.physics.checkCeilingSpikeCollision(this.player)) {
            const gameOver = this.gameState.loseLife(1);
            this.player.takeDamage();
            if (gameOver) {
                this.endGame();
            }
        }
    }

    checkGameEnd() {
        if (this.physics.checkGameBounds(this.player, this.gameState.depth, this.canvas.height)) {
            this.endGame();
        }
    }

    endGame() {
        this.gameState.stop();
        this.uiManager.showGameOver(this.gameState.depth);
    }

}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});