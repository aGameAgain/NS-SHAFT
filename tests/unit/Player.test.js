import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/core/Player.js';
import { PLAYER, WORLD_WIDTH } from '../../src/core/config.js';

describe('Player', () => {
    let player;

    beforeEach(() => {
        player = new Player(WORLD_WIDTH);
    });

    it('initializes centered at the start position', () => {
        expect(player.width).toBe(30);
        expect(player.height).toBe(40);
        expect(player.x).toBe(WORLD_WIDTH / 2 - 15);
        expect(player.y).toBe(PLAYER.START_Y);
        expect(player.velocityX).toBe(0);
        expect(player.velocityY).toBe(0);
        expect(player.isOnPlatform).toBe(false);
        expect(player.isHurt).toBe(false);
    });

    it('moves left / right from input', () => {
        player.handleInput({ left: true });
        expect(player.velocityX).toBe(-PLAYER.MOVE_SPEED);
        player.handleInput({ right: true });
        expect(player.velocityX).toBe(PLAYER.MOVE_SPEED);
        player.handleInput({});
        expect(player.velocityX).toBe(0);
        player.handleInput({ left: true, right: true });
        expect(player.velocityX).toBe(0);
    });

    it('stays inside the world horizontally', () => {
        player.x = -10;
        player.constrainToScreen();
        expect(player.x).toBe(0);

        player.x = WORLD_WIDTH + 10;
        player.constrainToScreen();
        expect(player.x).toBe(WORLD_WIDTH - player.width);
    });

    it('applies gravity only when airborne and records previous y', () => {
        const startY = player.y;
        player.applyGravity();
        expect(player.velocityY).toBe(PLAYER.GRAVITY);
        expect(player.y).toBe(startY + PLAYER.GRAVITY);
        expect(player.prevY).toBe(startY);

        player.isOnPlatform = true;
        player.velocityY = 0;
        player.applyGravity();
        expect(player.velocityY).toBe(0);
    });

    it('jumps only when standing on a platform', () => {
        expect(player.jump()).toBe(false);
        expect(player.velocityY).toBe(0);

        player.landOn({ x: 180, y: 200, width: 80 });
        expect(player.y).toBe(200 - player.height);
        expect(player.jump()).toBe(true);
        expect(player.isOnPlatform).toBe(false);
        expect(player.currentPlatform).toBe(null);
        expect(player.velocityY).toBe(-PLAYER.JUMP_POWER);
    });

    it('leaves the platform when walking past its edge', () => {
        player.landOn({ x: 100, y: 200, width: 80 });
        player.x = 120;
        player.checkPlatformEdge();
        expect(player.isOnPlatform).toBe(true);

        player.x = 200;
        player.checkPlatformEdge();
        expect(player.isOnPlatform).toBe(false);
        expect(player.currentPlatform).toBe(null);
    });

    it('leaves the platform when it was removed (broken)', () => {
        const platform = { x: 180, y: 200, width: 80, removed: false };
        player.landOn(platform);
        platform.removed = true;
        player.checkPlatformEdge();
        expect(player.isOnPlatform).toBe(false);
    });

    it('can still jump for COYOTE_TICKS after walking off an edge', () => {
        const platform = { x: 100, y: 200, width: 80 };
        player.landOn(platform);
        player.x = 200;
        player.update({});
        expect(player.isOnPlatform).toBe(false);
        expect(player.canJump).toBe(true);

        for (let i = 1; i < PLAYER.COYOTE_TICKS; i++) player.update({});
        expect(player.canJump).toBe(true);
        player.update({});
        expect(player.canJump).toBe(false);
        expect(player.jump()).toBe(false);
    });

    it('coyote jump consumes the window', () => {
        player.landOn({ x: 100, y: 200, width: 80 });
        player.x = 200;
        player.update({});
        expect(player.jump()).toBe(true);
        expect(player.velocityY).toBe(-PLAYER.JUMP_POWER);
        expect(player.jump()).toBe(false);
    });

    it('does not grant coyote time when knocked off (ceiling, spring)', () => {
        player.landOn({ x: 100, y: 200, width: 80 });
        player.leavePlatform();
        expect(player.canJump).toBe(false);
    });

    it('follows the horizontal movement of its platform', () => {
        player.landOn({ x: 180, y: 200, width: 80, dx: 2 });
        const startX = player.x;
        player.followMovingPlatform();
        expect(player.x).toBe(startX + 2);
    });

    it('flashes for HURT_TICKS after taking damage (no timers)', () => {
        player.takeDamage();
        expect(player.isHurt).toBe(true);
        for (let i = 0; i < PLAYER.HURT_TICKS; i++) player.update({});
        expect(player.isHurt).toBe(false);
    });

    it('resets all runtime state', () => {
        Object.assign(player, { x: 200, y: 300, velocityX: 5, velocityY: 10, isOnPlatform: true, hurtTicks: 5 });
        player.reset();
        expect(player.x).toBe(WORLD_WIDTH / 2 - 15);
        expect(player.y).toBe(PLAYER.START_Y);
        expect(player.velocityX).toBe(0);
        expect(player.velocityY).toBe(0);
        expect(player.isOnPlatform).toBe(false);
        expect(player.isHurt).toBe(false);
    });
});
