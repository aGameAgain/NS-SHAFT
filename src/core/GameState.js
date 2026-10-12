import { MAX_LIVES } from './config.js';

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.depth = 0;
        this.lives = MAX_LIVES;
        this.difficulty = 1;
        this.gameOver = false;
    }

    updateDepth(scrollSpeed) {
        this.depth += scrollSpeed;
        this.difficulty = 1 + this.depth / 500;
    }

    loseLife(amount) {
        this.lives = Math.max(0, this.lives - amount);
        if (this.lives <= 0) {
            this.gameOver = true;
        }
        return this.gameOver;
    }

    isGameOver() {
        return this.gameOver;
    }

    end() {
        this.gameOver = true;
    }
}
