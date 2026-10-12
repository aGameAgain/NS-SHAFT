import { describe, it, expect } from 'vitest';
import { GameSession } from '../../src/core/GameSession.js';
import { Platform, PLATFORM_TYPES } from '../../src/core/Platform.js';
import { RULESETS, RULESET_IDS, getRules, scrollSpeedAt } from '../../src/core/rules.js';
import { PLATFORM, PLAYER } from '../../src/core/config.js';
import { createRng } from '../../src/core/rng.js';

const VIEW_HEIGHT = 552;

/** 关卡生成与玩家无关：只推进平台生成器，得到可比较的关卡指纹 */
function levelFingerprint(rules) {
    const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 42, rules });
    const seen = new Map();
    for (let d = 0; d <= 5000; d += 0.5) {
        session.platformManager.update(d);
        for (const p of session.platformManager.platforms) {
            seen.set(p.y, `${p.y.toFixed(3)}:${p.x.toFixed(3)}:${p.type}:${p.direction}:${p.speed.toFixed(4)}`);
        }
    }
    let hash = 0x811c9dc5;
    const str = [...seen.values()].join('|');
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return { count: seen.size, hash: hash.toString(16) };
}

/** 在 session 里放一块指定类型的平台，让玩家从正上方落上去 */
function dropOnto(session, type) {
    const { player } = session;
    const platform = new Platform(player.x - 10, player.y + player.height + 1, type);
    session.platformManager.platforms.unshift(platform);
    const events = [];
    for (let i = 0; i < 20; i++) events.push(...session.step({}));
    return { platform, events };
}

describe('rule presets', () => {
    it('falls back to classic for unknown ids', () => {
        expect(getRules('nope')).toBe(RULESETS.classic);
        expect(getRules(undefined)).toBe(RULESETS.classic);
        expect(RULESET_IDS).toEqual(['classic', 'nsshaft', 'hard']);
    });

    it('keeps classic levels identical to the pre-rules implementation', () => {
        // 指纹取自引入规则预设之前的实现，变化说明旧 seed 生成的关卡被改变了
        expect(levelFingerprint('classic')).toEqual({ count: 31, hash: '41d4a6de' });
        expect(levelFingerprint('nsshaft').hash).not.toBe('41d4a6de');
    });

    it('classic: spikes pass through and hurt every tick of contact', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1, rules: 'classic' });
        const { events } = dropOnto(session, PLATFORM_TYPES.SPIKE);
        const hits = events.filter(e => e.type === 'damage' && e.source === 'spike');
        expect(hits.length).toBeGreaterThanOrEqual(3);
        expect(hits.every(e => e.amount === 1)).toBe(true);
    });

    it('nsshaft: 12 HP, standable spikes hurt once on landing', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1, rules: 'nsshaft' });
        expect(session.state.lives).toBe(12);
        const { platform, events } = dropOnto(session, PLATFORM_TYPES.SPIKE);
        const hits = events.filter(e => e.type === 'damage');
        expect(hits).toEqual([{ type: 'damage', source: 'spike', amount: 5 }]);
        expect(session.player.currentPlatform).toBe(platform);
        expect(session.state.lives).toBe(7);
    });

    it('nsshaft: landing on a safe platform regenerates 1 HP up to the max', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1, rules: 'nsshaft' });
        session.state.lives = 10;
        const { events } = dropOnto(session, PLATFORM_TYPES.NORMAL);
        expect(events).toContainEqual({ type: 'heal', amount: 1 });
        expect(events.filter(e => e.type === 'land')).toHaveLength(1);
        expect(session.state.lives).toBe(11);

        session.state.lives = 12;
        const again = dropOnto(session, PLATFORM_TYPES.NORMAL).events;
        expect(again.some(e => e.type === 'heal')).toBe(false);
        expect(session.state.lives).toBe(12);
    });

    it('classic: no regeneration', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        session.state.lives = 50;
        dropOnto(session, PLATFORM_TYPES.NORMAL);
        expect(session.state.lives).toBe(50);
    });

    it('conveyor platforms push a standing player', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1, rules: 'nsshaft' });
        const { platform } = dropOnto(session, PLATFORM_TYPES.CONVEYOR);
        platform.width = 400;
        platform.x = 0;
        const x0 = session.player.x;
        for (let i = 0; i < 5; i++) session.step({});
        expect(session.player.x - x0).toBeCloseTo(5 * platform.surfaceSpeed);
        expect(Math.abs(platform.surfaceSpeed)).toBe(PLATFORM.CONVEYOR_SPEED);
        expect(platform.x).toBe(0);
    });

    it('hard: scroll speed ramps up with depth and is capped', () => {
        const rules = getRules('hard');
        expect(scrollSpeedAt(rules, 0)).toBe(0.5);
        expect(scrollSpeedAt(rules, 500)).toBeCloseTo(0.75);
        expect(scrollSpeedAt(rules, 5000)).toBe(1);
        expect(scrollSpeedAt(getRules('classic'), 5000)).toBe(0.5);

        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1, rules: 'hard' });
        session.state.depth = 600;
        session.step({});
        expect(session.snapshot().scrollSpeed).toBeCloseTo(0.8);
    });

    it('only spawns types listed in a preset', () => {
        const count = (rules, type) => {
            const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 9, rules });
            const pm = session.platformManager;
            let n = 0;
            for (let i = 0; i < 2000; i++) if (pm.determinePlatformType(800) === type) n++;
            return n;
        };
        expect(count('classic', PLATFORM_TYPES.CONVEYOR)).toBe(0);
        expect(count('nsshaft', PLATFORM_TYPES.MOVING)).toBe(0);
        expect(count('nsshaft', PLATFORM_TYPES.CONVEYOR)).toBeGreaterThan(300);
    });

    it('switches rules on reset and exposes them in the snapshot', () => {
        const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 1 });
        session.reset(1, 'nsshaft');
        expect(session.snapshot()).toMatchObject({ rules: 'nsshaft', lives: 12, maxLives: 12 });
        session.reset(2);
        expect(session.rules.id).toBe('nsshaft');
    });

    it('every preset survives long randomized play without invalid state', () => {
        for (const id of RULESET_IDS) {
            const rng = createRng(5);
            const session = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 77, rules: id });
            for (let i = 0; i < 10000 && !session.isOver; i++) {
                session.step({ left: rng() < 0.3, right: rng() > 0.7, jump: rng() < 0.05 });
                expect(session.state.lives).toBeGreaterThanOrEqual(0);
                expect(session.state.lives).toBeLessThanOrEqual(session.rules.maxLives);
                expect(Number.isFinite(session.player.x)).toBe(true);
            }
        }
        expect(PLAYER.COYOTE_TICKS).toBeGreaterThan(0);
    });
});
