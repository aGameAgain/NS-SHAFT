import { MAX_LIVES } from './config.js';

export class GameState {
    constructor(maxLives = MAX_LIVES) {
        this.maxLives = maxLives;
        this.reset();
    }

    reset(maxLives = this.maxLives) {
        this.maxLives = maxLives;
        this.depth = 0;
        this.lives = maxLives;
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

    heal(amount) {
        const before = this.lives;
        this.lives = Math.min(this.maxLives, this.lives + amount);
        return this.lives - before;
    }

    isGameOver() {
        return this.gameOver;
    }

    end() {
        this.gameOver = true;
    }
}
