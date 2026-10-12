import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../src/core/GameState.js';
import { MAX_LIVES } from '../../src/core/config.js';

describe('GameState', () => {
    let gameState;

    beforeEach(() => {
        gameState = new GameState();
    });

    it('initializes with default values', () => {
        expect(gameState.depth).toBe(0);
        expect(gameState.lives).toBe(MAX_LIVES);
        expect(gameState.difficulty).toBe(1);
        expect(gameState.isGameOver()).toBe(false);
    });

    it('updates depth and difficulty', () => {
        gameState.updateDepth(1);
        expect(gameState.depth).toBe(1);
        expect(gameState.difficulty).toBe(1 + 1 / 500);
    });

    it('loses life without going below zero', () => {
        expect(gameState.loseLife(10)).toBe(false);
        expect(gameState.lives).toBe(90);

        expect(gameState.loseLife(500)).toBe(true);
        expect(gameState.lives).toBe(0);
        expect(gameState.isGameOver()).toBe(true);
    });

    it('can end the game explicitly (fell out of screen)', () => {
        gameState.end();
        expect(gameState.isGameOver()).toBe(true);
        expect(gameState.lives).toBe(MAX_LIVES);
    });

    it('resets all fields', () => {
        gameState.updateDepth(100);
        gameState.loseLife(100);
        gameState.reset();

        expect(gameState.depth).toBe(0);
        expect(gameState.lives).toBe(MAX_LIVES);
        expect(gameState.difficulty).toBe(1);
        expect(gameState.isGameOver()).toBe(false);
    });
});
