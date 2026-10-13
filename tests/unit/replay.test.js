import { describe, it, expect } from 'vitest';
import { ReplayRecorder, ReplayPlayer, decodeReplay, dailySeed } from '../../src/core/replay.js';
import { GameSession } from '../../src/core/GameSession.js';
import { createRng } from '../../src/core/rng.js';

const VIEW_HEIGHT = 552;

describe('replay', () => {
    it('round-trips inputs through the run-length encoding', () => {
        const recorder = new ReplayRecorder('classic', 123);
        const inputs = [
            ...Array(40).fill({ left: true }),
            { jump: true },
            ...Array(3).fill({}),
            ...Array(100).fill({ right: true, jump: false })
        ];
        inputs.forEach(i => recorder.record(i));

        const code = recorder.encode();
        expect(code).toBe('ns1.classic.123.114_41_03_22s');

        const replay = decodeReplay(code);
        expect(replay).toMatchObject({ rules: 'classic', seed: 123, ticks: inputs.length });
        const player = new ReplayPlayer(replay);
        for (const input of inputs) {
            expect(player.next()).toEqual({ left: !!input.left, right: !!input.right, jump: !!input.jump });
        }
        expect(player.done).toBe(true);
        expect(player.next()).toEqual({ left: false, right: false, jump: false });
    });

    it('reproduces a full run exactly (determinism end to end)', () => {
        for (const rules of ['classic', 'nsshaft', 'hard']) {
            const rng = createRng(99);
            const original = new GameSession({ viewHeight: VIEW_HEIGHT, seed: 2024, rules });
            const recorder = new ReplayRecorder(rules, original.seed);
            while (!original.isOver && original.tick < 20000) {
                const input = { left: rng() < 0.35, right: rng() > 0.65, jump: rng() < 0.04 };
                recorder.record(input);
                original.step(input);
            }

            const replay = decodeReplay(recorder.encode());
            const copy = new GameSession({ viewHeight: VIEW_HEIGHT, seed: replay.seed, rules: replay.rules });
            const player = new ReplayPlayer(replay);
            while (!player.done) copy.step(player.next());

            expect(copy.snapshot()).toEqual(original.snapshot());
        }
    });

    it('rejects malformed codes', () => {
        expect(() => decodeReplay('hello')).toThrow();
        expect(() => decodeReplay('ns0.classic.1.01')).toThrow();
        expect(() => decodeReplay('ns1.classic.-5.01')).toThrow();
        expect(() => decodeReplay('ns1.classic.1.9z')).toThrow();
        expect(() => decodeReplay('ns1.classic.1.0')).toThrow();
        expect(decodeReplay('ns1.classic.1.').ticks).toBe(0);
    });

    it('derives a stable seed per calendar day', () => {
        const a = dailySeed(2026, 10, 12);
        expect(a).toEqual(dailySeed(2026, 10, 12));
        expect(a.key).toBe('2026-10-12');
        expect(dailySeed(2026, 10, 13).seed).not.toBe(a.seed);
        expect(a.seed).toBeGreaterThanOrEqual(0);
        expect(a.seed).toBeLessThan(2 ** 32);
    });
});
