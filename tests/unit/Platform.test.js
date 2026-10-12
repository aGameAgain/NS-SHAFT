import { describe, it, expect, beforeEach } from 'vitest';
import { Platform, PlatformManager, PLATFORM_TYPES } from '../../src/core/Platform.js';
import { PLATFORM, WORLD_WIDTH } from '../../src/core/config.js';
import { createRng } from '../../src/core/rng.js';

const constant = value => () => value;

describe('Platform', () => {
    it('creates platform with correct properties', () => {
        const platform = new Platform(100, 200, PLATFORM_TYPES.NORMAL);
        expect(platform).toMatchObject({ x: 100, y: 200, type: PLATFORM_TYPES.NORMAL, width: 80, height: 15 });
    });

    it('returns correct color for platform types', () => {
        expect(new Platform(0, 0, PLATFORM_TYPES.NORMAL).getColor()).toBe('#8BC34A');
        expect(new Platform(0, 0, PLATFORM_TYPES.MOVING).getColor()).toBe('#9C27B0');
        expect(new Platform(0, 0, PLATFORM_TYPES.BREAKING).getColor()).toBe('#FFC107');
        expect(new Platform(0, 0, PLATFORM_TYPES.SPIKE).getColor()).toBe('#F44336');
        expect(new Platform(0, 0, PLATFORM_TYPES.SPRING).getColor()).toBe('#2196F3');
    });

    it('moves moving platforms and records dx', () => {
        const platform = new Platform(100, 200, PLATFORM_TYPES.MOVING);
        const { direction, speed } = platform;
        platform.update(WORLD_WIDTH);
        expect(platform.x).toBe(100 + direction * speed);
        expect(platform.dx).toBeCloseTo(direction * speed, 10);
    });

    it('does not move static platforms', () => {
        const platform = new Platform(100, 200, PLATFORM_TYPES.NORMAL);
        platform.update(WORLD_WIDTH);
        expect(platform.x).toBe(100);
        expect(platform.dx).toBe(0);
    });

    it('reverses direction and stays inside world bounds', () => {
        const platform = new Platform(WORLD_WIDTH - 81, 200, PLATFORM_TYPES.MOVING);
        platform.direction = 1;
        platform.speed = 3;
        platform.update(WORLD_WIDTH);
        expect(platform.direction).toBe(-1);
        expect(platform.x + platform.width).toBeLessThanOrEqual(WORLD_WIDTH);
    });

    it('breaks after BREAK_TICKS once stepped on', () => {
        const platform = new Platform(100, 200, PLATFORM_TYPES.BREAKING);
        expect(platform.update(WORLD_WIDTH)).toBe(false);

        platform.startBreaking();
        for (let i = 0; i < PLATFORM.BREAK_TICKS - 1; i++) {
            expect(platform.update(WORLD_WIDTH)).toBe(false);
        }
        expect(platform.update(WORLD_WIDTH)).toBe(true);
    });

    it('ignores startBreaking for non-breaking platforms', () => {
        const platform = new Platform(100, 200, PLATFORM_TYPES.NORMAL);
        platform.startBreaking();
        expect(platform.breaking).toBe(false);
    });
});

describe('PlatformManager', () => {
    let manager;

    beforeEach(() => {
        manager = new PlatformManager(WORLD_WIDTH, 600, createRng(1));
    });

    it('creates initial platforms with a safe normal platform under the player', () => {
        manager.createInitialPlatforms(100);
        expect(manager.platforms).toHaveLength(PLATFORM.INITIAL_COUNT);
        expect(manager.platforms[0]).toMatchObject({ type: PLATFORM_TYPES.NORMAL, y: 150 });
        expect(manager.platforms[0].x).toBe(WORLD_WIDTH / 2 - PLATFORM.WIDTH / 2);
    });

    it('only spawns normal platforms near the surface', () => {
        for (let i = 0; i < 200; i++) {
            expect(manager.determinePlatformType(50)).toBe(PLATFORM_TYPES.NORMAL);
        }
    });

    it('maps random values onto difficulty tiers', () => {
        const at = (depth, value) => new PlatformManager(WORLD_WIDTH, 600, constant(value)).determinePlatformType(depth);
        expect(at(600, 0.1)).toBe(PLATFORM_TYPES.SPIKE);
        expect(at(600, 0.3)).toBe(PLATFORM_TYPES.BREAKING);
        expect(at(600, 0.5)).toBe(PLATFORM_TYPES.MOVING);
        expect(at(600, 0.6)).toBe(PLATFORM_TYPES.SPRING);
        expect(at(600, 0.9)).toBe(PLATFORM_TYPES.NORMAL);
        expect(at(150, 0.1)).toBe(PLATFORM_TYPES.BREAKING);
        expect(at(300, 0.07)).toBe(PLATFORM_TYPES.SPIKE);
    });

    it('keeps platform gaps within configured range while spawning', () => {
        manager.createInitialPlatforms(100);
        for (let depth = 0; depth < 5000; depth += 0.5) {
            manager.update(depth);
        }
        const ys = manager.platforms.map(p => p.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) {
            const gap = ys[i] - ys[i - 1];
            expect(gap).toBeGreaterThanOrEqual(PLATFORM.MIN_GAP);
            expect(gap).toBeLessThanOrEqual(PLATFORM.GAP * (1 + PLATFORM.GAP_JITTER));
        }
    });

    it('always keeps platforms ahead of the camera and recycles passed ones', () => {
        manager.createInitialPlatforms(100);
        const depth = 3000;
        for (let d = 0; d <= depth; d += 0.5) manager.update(d);

        const maxY = Math.max(...manager.platforms.map(p => p.y));
        expect(maxY).toBeGreaterThan(depth + 600);
        expect(manager.platforms.every(p => p.y > depth - PLATFORM.DESPAWN_MARGIN)).toBe(true);
    });

    it('removes broken platforms and flags them', () => {
        const platform = manager.createPlatform(300);
        platform.type = PLATFORM_TYPES.BREAKING;
        platform.breaking = true;
        platform.breakTime = 1;
        manager.update(0);
        expect(manager.platforms).not.toContain(platform);
        expect(platform.removed).toBe(true);
    });

    it('clears platforms', () => {
        manager.createInitialPlatforms(100);
        manager.clear();
        expect(manager.platforms).toHaveLength(0);
    });
});
