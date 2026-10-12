import { describe, it, expect, beforeEach } from 'vitest';
import { Physics } from '../../src/core/Physics.js';
import { Player } from '../../src/core/Player.js';
import { Platform, PLATFORM_TYPES } from '../../src/core/Platform.js';
import { PLAYER, SPRING_BOOST, WORLD_WIDTH } from '../../src/core/config.js';

/** 让玩家从 platformY 上方 gap 像素处以 vy 速度下落一个 tick */
function fallOnto(player, physics, platform, { gap = 2, vy = 5 } = {}) {
    player.x = platform.x + 10;
    player.y = platform.y - player.height - gap;
    player.velocityY = vy;
    player.applyGravity();
    return physics.checkCollisions(player, [platform]);
}

describe('Physics', () => {
    let physics;
    let player;

    beforeEach(() => {
        physics = new Physics();
        player = new Player(WORLD_WIDTH);
    });

    it('exposes tuning constants', () => {
        expect(physics.gravity).toBe(PLAYER.GRAVITY);
        expect(physics.jumpPower).toBe(PLAYER.JUMP_POWER);
    });

    it('lands on a normal platform when the feet cross its top', () => {
        const platform = new Platform(100, 300, PLATFORM_TYPES.NORMAL);
        const result = fallOnto(player, physics, platform);

        expect(result.type).toBe('platform');
        expect(player.isOnPlatform).toBe(true);
        expect(player.currentPlatform).toBe(platform);
        expect(player.y).toBe(platform.y - player.height);
        expect(player.velocityY).toBe(0);
    });

    it('does not land when horizontally apart', () => {
        const platform = new Platform(300, 300);
        player.x = 100;
        player.y = 300 - player.height - 2;
        player.velocityY = 5;
        player.applyGravity();
        expect(physics.checkCollisions(player, [platform])).toBe(null);
    });

    it('does not tunnel through platforms at high fall speed', () => {
        const platform = new Platform(100, 300);
        const result = fallOnto(player, physics, platform, { gap: 1, vy: 60 });
        expect(result?.type).toBe('platform');
        expect(player.y).toBe(300 - player.height);
    });

    it('does not snap up onto a platform the player is already below', () => {
        const platform = new Platform(100, 300);
        player.x = 110;
        player.y = 300 - player.height + 5;
        player.velocityY = 1;
        player.applyGravity();
        expect(physics.checkCollisions(player, [platform])).toBe(null);
    });

    it('keeps a standing player grounded every tick (no flicker)', () => {
        const platform = new Platform(100, 300);
        fallOnto(player, physics, platform);
        for (let i = 0; i < 10; i++) {
            player.applyGravity();
            physics.checkCollisions(player, [platform]);
            expect(player.isOnPlatform).toBe(true);
        }
    });

    it('ignores collisions while moving upward', () => {
        const platform = new Platform(100, 300);
        expect(fallOnto(player, physics, platform, { vy: -5 })).toBe(null);
    });

    it('picks the highest platform when several are crossed', () => {
        const low = new Platform(100, 320);
        const high = new Platform(100, 300);
        player.x = 110;
        player.y = 300 - player.height - 1;
        player.velocityY = 30;
        player.applyGravity();
        expect(physics.checkCollisions(player, [low, high]).platform).toBe(high);
    });

    it('passes through spike platforms with a minimum downward speed', () => {
        const spike = new Platform(100, 300, PLATFORM_TYPES.SPIKE);
        const result = fallOnto(player, physics, spike, { gap: 0.5, vy: 0.5 });
        expect(result.type).toBe('spike');
        expect(player.isOnPlatform).toBe(false);
        expect(player.velocityY).toBeGreaterThanOrEqual(2);
    });

    it('reports spike contact on every tick while passing through the spike band', () => {
        const spike = new Platform(100, 300, PLATFORM_TYPES.SPIKE);
        player.x = 110;
        player.y = 300 - player.height - 1;
        player.velocityY = 2;
        let contacts = 0;
        for (let i = 0; i < 20; i++) {
            player.applyGravity();
            if (physics.checkCollisions(player, [spike])?.type === 'spike') contacts++;
        }
        expect(contacts).toBeGreaterThanOrEqual(3);
        expect(player.isOnPlatform).toBe(false);
    });

    it('registers spike contact even when falling faster than the spike band', () => {
        const spike = new Platform(100, 300, PLATFORM_TYPES.SPIKE);
        const result = fallOnto(player, physics, spike, { gap: 1, vy: 60 });
        expect(result?.type).toBe('spike');
    });

    it('lands on a normal platform under a spike band instead of reporting the spike', () => {
        const spike = new Platform(100, 300, PLATFORM_TYPES.SPIKE);
        const floor = new Platform(100, 310);
        player.x = 110;
        player.y = 310 - player.height - 1;
        player.prevY = player.y;
        player.velocityY = 2;
        player.applyGravity();
        expect(physics.checkCollisions(player, [spike, floor]).platform).toBe(floor);
    });

    it('lets the player stand on spikes when spikes are standable', () => {
        const standable = new Physics({ spikeStandable: true });
        const spike = new Platform(100, 300, PLATFORM_TYPES.SPIKE);
        const result = fallOnto(player, standable, spike);
        expect(result.type).toBe('spike');
        expect(player.isOnPlatform).toBe(true);
    });

    it('launches the player from spring platforms', () => {
        const spring = new Platform(100, 300, PLATFORM_TYPES.SPRING);
        const result = fallOnto(player, physics, spring);
        expect(result.type).toBe('spring');
        expect(player.velocityY).toBe(-PLAYER.JUMP_POWER * SPRING_BOOST);
        expect(player.isOnPlatform).toBe(false);
    });

    it('starts breaking a breaking platform on landing', () => {
        const breaking = new Platform(100, 300, PLATFORM_TYPES.BREAKING);
        fallOnto(player, physics, breaking);
        expect(breaking.breaking).toBe(true);
    });

    it('skips platforms above the minimum landing height', () => {
        const platform = new Platform(100, 300);
        player.x = 110;
        player.y = 300 - player.height - 2;
        player.velocityY = 5;
        player.applyGravity();
        expect(physics.checkCollisions(player, [platform], 301)).toBe(null);
    });

    it('detects ceiling spikes relative to the camera, not the world origin', () => {
        player.y = 1000;
        expect(physics.checkCeilingSpikeCollision(player, 0)).toBe(false);

        player.landOn({ x: 0, y: 1050, width: 400 });
        expect(physics.checkCeilingSpikeCollision(player, 990)).toBe(false);
        expect(player.isOnPlatform).toBe(true);
        expect(physics.checkCeilingSpikeCollision(player, 996)).toBe(true);
        expect(player.isOnPlatform).toBe(false);
        expect(player.velocityY).toBeGreaterThanOrEqual(2);
    });

    it('reports falling below the screen', () => {
        player.y = 1200;
        expect(physics.checkGameBounds(player, 500, 600)).toBe(true);
        expect(physics.checkGameBounds(player, 700, 600)).toBe(false);
    });
});
