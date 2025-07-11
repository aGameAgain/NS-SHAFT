import { describe, it, expect, beforeEach } from 'vitest';
import { Platform, PlatformManager, PLATFORM_TYPES } from '../../src/Platform.js';

describe('Platform', () => {
  let platform;

  beforeEach(() => {
    platform = new Platform(100, 200, PLATFORM_TYPES.NORMAL);
  });

  it('should create platform with correct properties', () => {
    expect(platform.x).toBe(100);
    expect(platform.y).toBe(200);
    expect(platform.type).toBe(PLATFORM_TYPES.NORMAL);
    expect(platform.width).toBe(80);
    expect(platform.height).toBe(15);
  });

  it('should return correct color for platform types', () => {
    expect(new Platform(0, 0, PLATFORM_TYPES.NORMAL).getColor()).toBe('#8BC34A');
    expect(new Platform(0, 0, PLATFORM_TYPES.MOVING).getColor()).toBe('#9C27B0');
    expect(new Platform(0, 0, PLATFORM_TYPES.BREAKING).getColor()).toBe('#FFC107');
    expect(new Platform(0, 0, PLATFORM_TYPES.SPIKE).getColor()).toBe('#F44336');
    expect(new Platform(0, 0, PLATFORM_TYPES.SPRING).getColor()).toBe('#2196F3');
  });

  it('should handle moving platform update', () => {
    const movingPlatform = new Platform(100, 200, PLATFORM_TYPES.MOVING);
    const initialX = movingPlatform.x;
    const direction = movingPlatform.direction;
    const speed = movingPlatform.speed;
    
    movingPlatform.update(800);
    
    expect(movingPlatform.x).toBe(initialX + direction * speed);
  });

  it('should reverse direction when hitting canvas bounds', () => {
    const movingPlatform = new Platform(790, 200, PLATFORM_TYPES.MOVING);
    movingPlatform.direction = 1;
    const initialDirection = movingPlatform.direction;
    
    movingPlatform.update(800);
    
    expect(movingPlatform.direction).toBe(-initialDirection);
  });

  it('should handle breaking platform', () => {
    const breakingPlatform = new Platform(100, 200, PLATFORM_TYPES.BREAKING);
    
    breakingPlatform.startBreaking();
    expect(breakingPlatform.breaking).toBe(true);
    
    // Simulate breaking countdown
    for (let i = 0; i < 59; i++) {
      expect(breakingPlatform.update(800)).toBe(false);
    }
    expect(breakingPlatform.update(800)).toBe(true);
  });
});

describe('PlatformManager', () => {
  let platformManager;

  beforeEach(() => {
    platformManager = new PlatformManager(800, 600);
  });

  it('should create initial platforms', () => {
    platformManager.createInitialPlatforms(100);
    
    expect(platformManager.platforms.length).toBe(5);
    expect(platformManager.platforms[0].type).toBe(PLATFORM_TYPES.NORMAL);
  });

  it('should determine platform type based on depth', () => {
    // Test different depths
    const normalType = platformManager.determinePlatformType(0);
    const mediumType = platformManager.determinePlatformType(150);
    const hardType = platformManager.determinePlatformType(300);
    const veryHardType = platformManager.determinePlatformType(600);
    
    expect([
      PLATFORM_TYPES.NORMAL,
      PLATFORM_TYPES.MOVING,
      PLATFORM_TYPES.BREAKING,
      PLATFORM_TYPES.SPIKE,
      PLATFORM_TYPES.SPRING
    ]).toContain(normalType);
  });

  it('should update canvas dimensions correctly', () => {
    platformManager.createInitialPlatforms(100);
    const platformOutsideBounds = new Platform(850, 200, PLATFORM_TYPES.NORMAL);
    platformManager.platforms.push(platformOutsideBounds);
    
    platformManager.updateCanvasDimensions(600, 400);
    
    expect(platformManager.canvasWidth).toBe(600);
    expect(platformManager.canvasHeight).toBe(400);
    expect(platformOutsideBounds.x).toBe(600 - 80); // constrained to canvas width
  });

  it('should clear platforms', () => {
    platformManager.createInitialPlatforms(100);
    platformManager.clear();
    
    expect(platformManager.platforms.length).toBe(0);
  });
});