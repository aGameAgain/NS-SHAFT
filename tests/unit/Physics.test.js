import { describe, it, expect, beforeEach } from 'vitest';
import { Physics } from '../../src/Physics.js';
import { Player } from '../../src/Player.js';
import { Platform, PLATFORM_TYPES } from '../../src/Platform.js';

describe('Physics', () => {
  let physics;
  let player;

  beforeEach(() => {
    physics = new Physics();
    player = new Player(800, 600);
  });

  it('should initialize with correct constants', () => {
    expect(physics.gravity).toBe(0.25);
    expect(physics.jumpPower).toBe(8);
  });

  it('should detect collision correctly', () => {
    player.x = 100;
    player.y = 150;
    player.width = 30;
    player.height = 40;
    
    const platform = new Platform(110, 190, PLATFORM_TYPES.NORMAL);
    platform.width = 80;
    platform.height = 15;
    
    const isColliding = physics.isColliding(player, platform);
    expect(isColliding).toBe(true);
  });

  it('should not detect collision when not overlapping', () => {
    player.x = 100;
    player.y = 150;
    
    const platform = new Platform(200, 190, PLATFORM_TYPES.NORMAL);
    
    const isColliding = physics.isColliding(player, platform);
    expect(isColliding).toBe(false);
  });

  it('should handle normal platform collision', () => {
    player.x = 100;
    player.y = 150;
    player.velocityY = 5;
    
    const platform = new Platform(110, 190, PLATFORM_TYPES.NORMAL);
    
    const result = physics.handlePlatformCollision(player, platform, false);
    
    expect(result.type).toBe('platform');
    expect(player.isOnPlatform).toBe(true);
    expect(player.currentPlatform).toBe(platform);
    expect(player.y).toBe(platform.y - player.height);
    expect(player.velocityY).toBe(0);
  });

  it('should handle spike platform collision', () => {
    player.x = 100;
    player.y = 150;
    player.velocityY = 5;
    
    const spikePlatform = new Platform(110, 190, PLATFORM_TYPES.SPIKE);
    
    const result = physics.handlePlatformCollision(player, spikePlatform, false);
    
    expect(result.type).toBe('spike');
    expect(player.velocityY).toBeGreaterThanOrEqual(2);
  });

  it('should handle spring platform collision', () => {
    player.x = 100;
    player.y = 150;
    player.velocityY = 5;
    
    const springPlatform = new Platform(110, 190, PLATFORM_TYPES.SPRING);
    
    const result = physics.handlePlatformCollision(player, springPlatform, false);
    
    expect(result.type).toBe('platform');
    expect(player.onSpring).toBe(true);
    expect(player.velocityY).toBe(-physics.jumpPower * 1.5);
    expect(player.isOnPlatform).toBe(false);
  });

  it('should handle breaking platform collision', () => {
    player.x = 100;
    player.y = 150;
    player.velocityY = 5;
    
    const breakingPlatform = new Platform(110, 190, PLATFORM_TYPES.BREAKING);
    
    physics.handlePlatformCollision(player, breakingPlatform, false);
    
    expect(breakingPlatform.breaking).toBe(true);
  });

  it('should check ceiling spike collision', () => {
    player.y = 10;
    
    const collision = physics.checkCeilingSpikeCollision(player);
    
    expect(collision).toBe(true);
    expect(player.velocityY).toBeGreaterThanOrEqual(2);
  });

  it('should check game bounds', () => {
    player.y = 1200;
    
    const outOfBounds = physics.checkGameBounds(player, 500, 600);
    
    expect(outOfBounds).toBe(true);
  });

  it('should check collisions with multiple platforms', () => {
    player.x = 100;
    player.y = 150;
    player.velocityY = 5;
    
    const platforms = [
      new Platform(200, 190, PLATFORM_TYPES.NORMAL),
      new Platform(110, 190, PLATFORM_TYPES.NORMAL),
      new Platform(300, 190, PLATFORM_TYPES.NORMAL)
    ];
    
    const collision = physics.checkCollisions(player, platforms);
    
    expect(collision).toBeTruthy();
    expect(collision.type).toBe('platform');
    expect(collision.platform).toBe(platforms[1]);
  });
});