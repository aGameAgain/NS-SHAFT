import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../src/GameState.js';

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  it('should initialize with correct default values', () => {
    expect(gameState.gameRunning).toBe(false);
    expect(gameState.depth).toBe(0);
    expect(gameState.lives).toBe(100);
    expect(gameState.difficulty).toBe(1);
  });

  it('should start game correctly', () => {
    gameState.start();
    expect(gameState.gameRunning).toBe(true);
  });

  it('should stop game correctly', () => {
    gameState.start();
    gameState.stop();
    expect(gameState.gameRunning).toBe(false);
  });

  it('should update depth and difficulty', () => {
    gameState.updateDepth(1);
    expect(gameState.depth).toBe(1);
    expect(gameState.difficulty).toBe(1 + 1/500);
  });

  it('should lose life correctly', () => {
    const gameOver = gameState.loseLife(10);
    expect(gameState.lives).toBe(90);
    expect(gameOver).toBe(false);
  });

  it('should detect game over when lives reach zero', () => {
    const gameOver = gameState.loseLife(100);
    expect(gameState.lives).toBe(0);
    expect(gameOver).toBe(true);
    expect(gameState.isGameOver()).toBe(true);
  });

  it('should reset game state correctly', () => {
    gameState.start();
    gameState.updateDepth(100);
    gameState.loseLife(50);
    
    gameState.reset();
    
    expect(gameState.depth).toBe(0);
    expect(gameState.lives).toBe(100);
    expect(gameState.difficulty).toBe(1);
    // gameRunning should not be reset by reset()
    expect(gameState.gameRunning).toBe(true);
  });
});