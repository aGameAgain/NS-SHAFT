import { describe, it, expect } from 'vitest';
import { GameSession } from '../../src/core/GameSession.js';
import { PLATFORM_TYPES, Platform } from '../../src/core/Platform.js';
import { createRng } from '../../src/core/rng.js';
import { CEILING, DAMAGE, MAX_LIVES, PLATFORM, PLAYER, SCREEN_SCROLL_SPEED, WORLD_WIDTH } from '../../src/core/config.js';

const VIEW_HEIGHT = 552;

function run(session, ticks, input = {}) {
    const events = [];
    for (let i = 0; i < ticks && !session.isOver; i++) {
        events.push(...session.step(typeof input === 'function' ? input(i) : input));
    }
    return events;
}

describe('GameSession', () => {
    it('starts with the player resting above a safe platform', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        run(session, 30);
        expect(session.player.isOnPlatform).toBe(true);
        expect(session.player.currentPlatform.type).toBe(PLATFORM_TYPES.NORMAL);
        expect(session.state.lives).toBe(MAX_LIVES);
    });

    it('scrolls the camera at a constant speed per tick', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        run(session, 10);
        expect(session.depth).toBe(10 * SCREEN_SCROLL_SPEED);
        expect(session.tick).toBe(10);
    });

    it('is deterministic for the same seed and input sequence', () => {
        const input = i => ({ left: i % 90 < 30, right: i % 90 > 60, jump: i % 45 === 0 });
        const a = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 42 });
        const b = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 42 });
        run(a, 2000, input);
        run(b, 2000, input);
        expect(a.snapshot()).toEqual(b.snapshot());
        expect(a.platforms.map(p => [p.x, p.y, p.type])).toEqual(b.platforms.map(p => [p.x, p.y, p.type]));
    });

    it('produces different levels for different seeds', () => {
        const a = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        const b = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 2 });
        expect(a.platforms.map(p => p.x)).not.toEqual(b.platforms.map(p => p.x));
    });

    it('lets a standing player jump on any tick (no grounded flicker)', () => {
        for (let offset = 0; offset < 4; offset++) {
            const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
            run(session, 30 + offset);
            const events = session.step({ jump: true });
            expect(events).toContainEqual({ type: 'jump' });
            expect(session.player.velocityY).toBeLessThan(0);
        }
    });

    it('does not spawn overlapping platforms right after the start', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 3 });
        run(session, 5);
        const ys = session.platforms.map(p => p.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) {
            expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(PLATFORM.MIN_GAP);
        }
    });

    it('carries an idle player into the ceiling spikes, damages once and drops them', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        const events = [];
        let ticks = 0;
        while (!events.some(e => e.type === 'damage') && ticks < 2000) {
            events.push(...session.step({}));
            ticks++;
        }
        const damage = events.find(e => e.type === 'damage');
        expect(damage).toEqual({ type: 'damage', source: 'ceiling', amount: DAMAGE.CEILING });
        expect(session.state.lives).toBe(MAX_LIVES - DAMAGE.CEILING);
        expect(session.player.isOnPlatform).toBe(false);

        // 接下来几帧不能再次扣血，并且玩家离开天花板区域
        run(session, 20);
        expect(session.state.lives).toBe(MAX_LIVES - DAMAGE.CEILING);
        expect(session.player.y - session.depth).toBeGreaterThan(CEILING.SPIKE_HEIGHT);
    });

    it('damages the player on spike platforms', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        const spike = new Platform(session.player.x - 10, session.player.y + PLAYER.HEIGHT + 1, PLATFORM_TYPES.SPIKE);
        session.platformManager.platforms.unshift(spike);
        const events = run(session, 10);
        expect(events.some(e => e.type === 'damage' && e.source === 'spike')).toBe(true);
        expect(session.state.lives).toBeLessThan(MAX_LIVES);
    });

    it('ends the game when the player falls below the screen', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        session.player.y = session.depth + VIEW_HEIGHT + 100;
        session.player.leavePlatform();
        const events = session.step({});
        expect(events.map(e => e.type)).toEqual(expect.arrayContaining(['fell', 'gameover']));
        expect(session.isOver).toBe(true);

        const tick = session.tick;
        expect(session.step({})).toEqual([]);
        expect(session.tick).toBe(tick);
    });

    it('ends the game when lives reach zero', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        session.state.lives = DAMAGE.CEILING;
        session.player.y = session.depth + 5;
        session.player.leavePlatform();
        const events = session.step({});
        expect(events.some(e => e.type === 'gameover')).toBe(true);
        expect(session.state.lives).toBe(0);
    });

    it('resets to a fresh run', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        run(session, 500, { right: true });
        session.reset(7);
        expect(session.tick).toBe(0);
        expect(session.depth).toBe(0);
        expect(session.seed).toBe(7);
        expect(session.state.lives).toBe(MAX_LIVES);
        expect(session.platforms).toHaveLength(PLATFORM.INITIAL_COUNT);
    });

    it('keeps world invariants during long randomized play', () => {
        for (const seed of [11, 22, 33, 44, 55]) {
            const rng = createRng(seed * 7);
            const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed });
            let lastDepth = -1;
            for (let i = 0; i < 20000 && !session.isOver; i++) {
                session.step({ left: rng() < 0.3, right: rng() > 0.7, jump: rng() < 0.05 });
                const { player, depth, state } = session;
                expect(Number.isFinite(player.x) && Number.isFinite(player.y)).toBe(true);
                expect(player.x).toBeGreaterThanOrEqual(0);
                expect(player.x + player.width).toBeLessThanOrEqual(WORLD_WIDTH);
                expect(depth).toBeGreaterThan(lastDepth);
                expect(state.lives).toBeGreaterThanOrEqual(0);
                expect(session.platforms.length).toBeLessThan(20);
                lastDepth = depth;
            }
        }
    });
});
