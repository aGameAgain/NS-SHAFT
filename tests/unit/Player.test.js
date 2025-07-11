import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/Player.js';
import { PLATFORM_TYPES } from '../../src/Platform.js';

describe('Player', () => {
  let player;

  beforeEach(() => {
    player = new Player(800, 600);
  });

  it('should initialize with correct properties', () => {
    expect(player.width).toBe(30);
    expect(player.height).toBe(40);
    expect(player.x).toBe(800/2 - 30/2);
    expect(player.y).toBe(100);
    expect(player.velocityX).toBe(0);
    expect(player.velocityY).toBe(0);
    expect(player.isOnPlatform).toBe(false);
    expect(player.color).toBe('#00BFFF');
  });

  it('should handle left movement input', () => {
    const keys = { ArrowLeft: true };
    player.handleInput(keys);
    
    expect(player.velocityX).toBe(-5);
  });

  it('should handle right movement input', () => {
    const keys = { ArrowRight: true };
    player.handleInput(keys);
    
    expect(player.velocityX).toBe(5);
  });

  it('should handle no input', () => {
    const keys = {};
    player.handleInput(keys);
    
    expect(player.velocityX).toBe(0);
  });

  it('should constrain to screen bounds', () => {
    player.x = -10;
    player.constrainToScreen();
    expect(player.x).toBe(0);
    
    player.x = 810;
    player.constrainToScreen();
    expect(player.x).toBe(800 - 30);
  });

  it('should apply gravity when not on platform', () => {
    const initialY = player.y;
    const initialVelocityY = player.velocityY;
    
    player.applyGravity();
    
    expect(player.velocityY).toBe(initialVelocityY + 0.25);
    expect(player.y).toBe(initialY + player.velocityY);
  });

  it('should not apply gravity when on platform', () => {
    player.isOnPlatform = true;
    const initialVelocityY = player.velocityY;
    
    player.applyGravity();
    
    expect(player.velocityY).toBe(initialVelocityY);
  });

  it('should jump when on platform', () => {
    player.isOnPlatform = true;
    player.currentPlatform = { x: 100, y: 200, width: 80 };
    
    const jumped = player.jump();
    
    expect(jumped).toBe(true);
    expect(player.isOnPlatform).toBe(false);
    expect(player.currentPlatform).toBe(null);
    expect(player.velocityY).toBe(-8);
  });

  it('should not jump when not on platform', () => {
    player.isOnPlatform = false;
    
    const jumped = player.jump();
    
    expect(jumped).toBe(false);
    expect(player.velocityY).toBe(0);
  });

  it('should check platform edge correctly', () => {
    player.isOnPlatform = true;
    player.currentPlatform = { x: 100, y: 200, width: 80 };
    
    // Player on platform
    player.x = 120;
    player.checkPlatformEdge();
    expect(player.isOnPlatform).toBe(true);
    
    // Player off platform edge
    player.x = 200;
    player.checkPlatformEdge();
    expect(player.isOnPlatform).toBe(false);
    expect(player.currentPlatform).toBe(null);
  });

  it('should follow moving platform', () => {
    player.isOnPlatform = true;
    player.currentPlatform = { 
      x: 100, 
      y: 200, 
      width: 80, 
      type: PLATFORM_TYPES.MOVING,
      direction: 1,
      speed: 2
    };
    
    const initialX = player.x;
    player.followMovingPlatform();
    
    expect(player.x).toBe(initialX + 2);
  });

  it('should reset correctly', () => {
    player.x = 200;
    player.y = 300;
    player.velocityX = 5;
    player.velocityY = 10;
    player.isOnPlatform = true;
    player.color = '#FF0000';
    
    player.reset(800, 600);
    
    expect(player.x).toBe(800/2 - 30/2);
    expect(player.y).toBe(100);
    expect(player.velocityX).toBe(0);
    expect(player.velocityY).toBe(0);
    expect(player.isOnPlatform).toBe(false);
    expect(player.color).toBe('#00BFFF');
  });
});