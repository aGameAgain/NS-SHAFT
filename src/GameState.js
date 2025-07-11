// GameState Class
export class GameState {
    constructor() {
        this.gameRunning = false;
        this.reset();
    }

    reset() {
        this.depth = 0;
        this.lives = 100;
        this.difficulty = 1;
    }

    updateDepth(scrollSpeed) {
        this.depth += scrollSpeed;
        this.difficulty = 1 + this.depth / 500;
    }

    loseLife(amount) {
        this.lives -= amount;
        return this.lives <= 0;
    }

    isGameOver() {
        return this.lives <= 0;
    }

    start() {
        this.gameRunning = true;
    }

    stop() {
        this.gameRunning = false;
    }
}